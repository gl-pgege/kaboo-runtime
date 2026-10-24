# Replay & state

kaboo-runtime treats the AG-UI event log as the single source of truth.
Messages, tools, state and sub-agent cards are all reconstructed from it — there
is no separate, hand-maintained state blob.

## The event log

Each run's events are appended to the thread's log in order, while the run
streams. When the run finishes, the store replaces its events with AG-UI's
`compactEvents` of them: text and tool-argument deltas are joined, and state
changes are folded into one snapshot. A compacted run replays to the same
transcript, the same state and the same sub-agent cards as the stream did, in a
fraction of the events. `readEvents(threadId)` returns the log as stored.

A run's `RUN_STARTED` is stamped with the input that matters for replay: the
messages the run added and any resume answers. A run that failed before the
agent said anything still shows what was asked. Tools, state and
`forwardedProps` stay out: they are large, already logged elsewhere, or carry
credentials.

## Deriving state

State is not stored on its own. `deriveState` takes the last `STATE_SNAPSHOT` in
an event log and applies every `STATE_DELTA` after it:

```ts
import { deriveState } from "@pgege/kaboo-runtime";
import type { BaseEvent } from "@ag-ui/client";

declare const events: BaseEvent[];
const state = deriveState(events); // Record<string, unknown> | null
```

The built-in stores use `deriveState` for `readState`, and so should custom
stores, so behavior is identical everywhere.

## Who owns each state key

A thread's state has three kinds of top-level key:

| Kind | Default keys | The browser… | Before a run, the agent gets… |
|---|---|---|---|
| hidden | `kaboo_sessions` | never sees it | the stored value |
| server | `kaboo_workspace` | sees it, read-only | the stored value |
| browser | everything else | owns it | the value the browser sent, or the stored one when it sent none |

So a client cannot forge a pending approval, rewrite an agent's transcript or
overwrite the workspace the agents maintain, and the agents' sessions, which
can be large, never travel to the browser at all. Live events are filtered the
same way: a `STATE_DELTA` that only touches a hidden key isn't sent, and a
replay sends the state without it.

```ts
import { createKabooRunner, InMemoryThreadStore } from "@pgege/kaboo-runtime";

const runner = createKabooRunner(new InMemoryThreadStore(), {
  stateKeys: { hidden: ["kaboo_sessions"], server: ["kaboo_workspace", "billing"] },
});
```

A host vouches for a server key itself by returning it from `enrich`
([Server-side props](server-side-props.md)).

## State replay is a guarantee, not a convention

kaboo-workflows writes what a turn accumulates back as a `STATE_DELTA`. Before
every run, `KabooAgentRunner` derives the thread's state and sets it on the
agent as `input.state`, by the ownership above. Every app on the runtime
therefore gets the round-trip without writing any code for it:

- **`kaboo_sessions.history`** — every agent's transcript, so multi-agent memory
  is seeded from the server rather than the browser.
- **`kaboo_sessions.paused`** — the paused checkpoint of a run waiting on the
  person. This is what makes a question or an approval durable: it is restored
  onto whichever process serves the next turn, so a workflows restart, a second
  replica, or a rebuilt session no longer strands it.
- **`kaboo_sessions.approvals`** — each open approval request (`interruptId`,
  `tool`, `subject`, `scopes`, `input`), which the runner matches the person's
  decisions against ([Access control](access-control.md#remembered-approvals)).

Because a paused run depends on this, persisting state events is a requirement
of a store rather than a nicety — see [thread stores](thread-stores.md) and
[custom store](custom-store.md).

## Replay on reconnect

`connect(threadId)` replays the thread's stored log, then tees any in-flight run:

- If nothing is running, it emits the stored events and completes.
- If a run is in flight, it emits the stored prior turns and then forwards live
  events from the running run.

This is what lets a browser reload — or a second tab — rebuild the full
transcript and then continue watching live work.

The stored part is made safe for an AG-UI client first. The client accepts
nothing after a run's `RUN_ERROR`, so a run that failed or was aborted (the
client aborts a run to send a new message) replays as finished — after closing
any message or tool call it left open — and the turns after it stay visible. A terminal event outside any run is dropped, and messages the log lost
are replayed inside the last run rather than after it.

## A run that answered its own calls

When an agent calls an MCP App's tool, the run ends waiting on the call, and
CopilotKit's MCP Apps middleware answers it in that same response. The runner
then runs the agent again with the answer, as the browser does after answering a
tool itself, and the turn arrives as one run: one `RUN_STARTED`, the app, the
agent's answer, one `RUN_FINISHED`. A run still waiting on the browser ends as
it is.

MCP Apps' own requests — the app reading its resource or calling its server's
tools, sent as runs carrying `forwardedProps.__proxiedMCPRequest` — pass straight
through to the agent: they are not stored, enriched or checked for approvals.

## Warming the index after a cold start

The synchronous thread-query methods (`listThreads`, `getThreadEvents`, …) read
an in-memory index. After a process restart, call `hydrate()` once to populate it
from the store (individual `run`/`connect` calls also hydrate their own thread
lazily):

```ts
import { KabooAgentRunner, InMemoryThreadStore } from "@pgege/kaboo-runtime";

async function main() {
  const runner = new KabooAgentRunner(new InMemoryThreadStore());
  await runner.hydrate();
  return runner.listThreads();
}
```
