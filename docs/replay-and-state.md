# Replay & state

kaboo-runtime treats the AG-UI event log as the single source of truth. Messages,
tools, state, and activity are all reconstructed from it — there is no separate,
hand-maintained state blob.

## The event log

Each run's events are appended to the thread's log **verbatim and in order**.
Nothing is compacted, so `ACTIVITY_SNAPSHOT` and `CUSTOM` events (the ones a rich
UI like [kaboo-react](https://github.com/gl-pgege/kaboo-react) needs) survive the
round-trip. `readEvents(threadId)` returns exactly what was emitted.

## Deriving state

State is not stored on its own. `deriveState` scans an event log backwards for
the last `STATE_SNAPSHOT` and returns its snapshot object (or `null`):

```ts
import { deriveState } from "@pgege/kaboo-runtime";
import type { BaseEvent } from "@ag-ui/client";

declare const events: BaseEvent[];
const state = deriveState(events); // Record<string, unknown> | null
```

The built-in stores use `deriveState` for `readState`, and so should custom
stores, so behavior is identical everywhere.

## `kaboo_history` injection

kaboo-workflows folds each turn's `kaboo_history` into its trailing
`STATE_SNAPSHOT`. Before every run, `KabooAgentRunner` reads the thread's
persisted state and merges it into `input.state` (persisted values first, then
any incoming state), so multi-agent history is seeded from the server rather than
the browser. The client no longer has to carry conversation history.

## Replay on reconnect

`connect(threadId)` replays the thread's stored log, then tees any in-flight run:

- If nothing is running, it emits the stored events and completes.
- If a run is in flight (its events aren't persisted until completion), it emits
  the stored prior turns and then forwards live events from the running run.

This is what lets a browser reload — or a second tab — rebuild the full
transcript and then continue watching live work.

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

## No compaction

Unlike the stock in-memory runner, kaboo-runtime never trims or summarizes the
log. Durability + verbatim storage is the whole point: the cost is storage, the
benefit is a perfectly reconstructable conversation.
