# Upgrading

What changes between releases that you might have to act on, with the code
before and after. If none of a release's items apply to you, upgrading is a
version bump.

The kaboo libraries can be upgraded in any order; features that span the stack
light up once every piece is upgraded — see
[Upgrading the stack](https://gl-pgege.github.io/kaboo-docs/start-here/#upgrading-the-stack).

## 0.8

0.8 follows kaboo-workflows 0.29 onto AG-UI's own events and state. Upgrade the
three libraries together: kaboo-workflows 0.29, kaboo-runtime 0.8 and
kaboo-react 0.12.

### `enrich` returns what it adds

**Who:** hosts that pass `enrich`.

`enrich` used to return the run's `forwardedProps`. It now returns an object
naming what it adds, so it can also set server-owned state:

```diff
  enrich: async ({ threadId, input }) => {
    const client = (input.forwardedProps as Record<string, unknown> | undefined) ?? {};
-   return { ...client, workflow_config: await configForThread(threadId) };
+   return { forwardedProps: { ...client, workflow_config: await configForThread(threadId) } };
  },
```

Without `forwardedProps` in the result, the client's are kept. `state` sets
server-owned keys for the run ([Server-side props](server-side-props.md#state-the-server-vouches-for)).

### Each state key has an owner

**Who:** hosts that read or write `kaboo_history` or `kaboo_session`.

kaboo-workflows 0.29 keeps a conversation's memory in `kaboo_sessions` and the
workspace its agents maintain in `kaboo_workspace`. The runner treats them as
server keys: `kaboo_sessions` never reaches the browser, and `kaboo_workspace`
reaches it read-only. A browser's copy of either is ignored, as it was for the
old keys. Change the split with `stateKeys`:

```ts
import { createKabooRunner, InMemoryThreadStore } from "@pgege/kaboo-runtime";

const runner = createKabooRunner(new InMemoryThreadStore(), {
  stateKeys: { hidden: ["kaboo_sessions"], server: ["kaboo_workspace", "billing"] },
});
```

`deriveState` now applies the `STATE_DELTA`s after the last `STATE_SNAPSHOT`,
which is how kaboo-workflows 0.29 writes state back. See
[Replay & state](replay-and-state.md#who-owns-each-state-key).

### Finished runs are compacted

**Who:** custom `ThreadStore`s.

The runner asks the store to compact each finished run with AG-UI's
`compactEvents`, which replays to the same transcript and cards. `ThreadStore`
gains `compactRun`; implement it with the two helpers the package exports:

```ts
import { compactRunEvents, finishedRunBounds, type ThreadStore } from "@pgege/kaboo-runtime";
import type { BaseEvent } from "@ag-ui/client";

declare const rows: Map<string, { events: BaseEvent[] }>;

export const compactRun: ThreadStore["compactRun"] = async (threadId, runId) => {
  const row = rows.get(threadId);
  const bounds = row && finishedRunBounds(row.events, runId);
  if (!row || !bounds) return;
  const [start, end] = bounds;
  const run = row.events.slice(start, end + 1);
  row.events.splice(start, run.length, ...compactRunEvents(run));
};
```

`pruneSupersededActivitySnapshots` is removed: kaboo-workflows no longer sends
activity snapshots. The built-in stores need no change, and no database
migration is needed.

### New

- **`KabooHttpAgent`** — an `HttpAgent` for a kaboo-workflows service that reports
  its AG-UI `AgentCapabilities` to CopilotKit.
- **MCP Apps** — an app's own requests pass straight through, unrecorded, and a
  run whose MCP App tool CopilotKit's middleware answered goes on with the agent
  in the same run ([Replay & state](replay-and-state.md#a-run-that-answered-its-own-calls)).
- **`RUN_STARTED.input`** carries the messages the run added and any resume
  answers, so a replay of a run that failed early still shows what was asked.
- The package's CommonJS build now has its own type declarations.

## 0.7.1

**Who:** hosts whose `approvals.onDecision` or `enrich` can throw, and hosts
with a grant store.

A run that fails before the agent starts now opens with `RUN_STARTED`, so the
browser sees a well-formed failed run instead of a sealed interrupt:

```diff
+ { "type": "RUN_STARTED", "threadId": "ann:t1", "runId": "r2" }
  { "type": "RUN_ERROR", "code": "INCOMPLETE_STREAM", "message": "approval service down" }
```

When that run is a resume, neither event is stored, so the thread still ends on
the interrupts it answered and they can be answered again. Grants are saved
only after `onDecision` returns, so a refused decision leaves none behind.

No code changes are needed. Two things are worth checking in `onDecision`:

- Throw a message the person can act on: it is what the browser shows.
- Accept a decision the service has already taken. Answering again resends
  every decision of that resume, including the ones taken before another was
  refused.

## 0.7

**Who:** everyone. 0.7 runs on CopilotKit 1.78 or later, the AG-UI 1.0
generation.

```diff
- "@copilotkit/runtime": ">=1.62.0 <1.71.2"
- "@ag-ui/client": ">=0.0.57 <1"
+ "@copilotkit/runtime": ">=1.78.0 <2"
+ "@ag-ui/client": ">=1.0.2 <2"
```

Upgrade `@copilotkit/runtime` and `@ag-ui/client` with it, and the browser's
CopilotKit packages with kaboo-react 0.11. The runner's API is unchanged. The
server needs Node 20 or later, as CopilotKit 1.78 does. On CopilotKit 1.62 to
1.71.1, stay on kaboo-runtime 0.6.

## 0.6.1

**Who:** anyone on CopilotKit 1.71.2 or later.

The peer range now stops where this release is tested:

```diff
- "@copilotkit/runtime": ">=1.62.0"
+ "@copilotkit/runtime": ">=1.62.0 <1.71.2"
```

`@ag-ui/client` is capped the same way, at `<1`.

CopilotKit 1.71.2 and later bring in AG-UI 1.0 pieces, which the next minor
release supports. Until then, stay on CopilotKit 1.71.1 or earlier.

## 0.6

### `enrich` replaces hand-written runner wrappers

**Who:** hosts that wrap the runner in their own `AgentRunner` to stamp
`forwardedProps` (a run token, the tenant, a composed workflow) — kaboo,
kaboo-bmo and EndofSzn all did.

Pass `enrich` instead and delete the wrapper. Its return value replaces the
client's `forwardedProps`, exactly as the wrapper's assignment did.

```diff
- class EnrichedRunner extends AgentRunner {
-   run(request: AgentRunnerRunRequest): Observable<BaseEvent> {
-     return new Observable((subscriber) => {
-       void this.enrich(request.threadId, request.input).then(({ forwardedProps, state }) => {
-         request.input.forwardedProps = forwardedProps;
-         request.input.state = state;
-         request.agent.setState(state);
-         this.inner.run(request).subscribe(subscriber);
-       });
-     });
-   }
-   // ...and every other AgentRunner method, delegated
- }
- const runner = new EnrichedRunner(createKabooRunner(store, { accessPolicy }), enrichRun);
+ const runner = createKabooRunner(store, {
+   accessPolicy,
+   enrich: async ({ threadId, ownerId, input }) => ({
+     ...(input.forwardedProps as Record<string, unknown>),
+     projectId: projectOf(threadId),
+     runToken: await tokenFor(ownerId),
+   }),
+ });
```

Re-merging persisted state in the wrapper is no longer needed: the runner does
it, and keeps the server-owned keys (below) from the store.

### Stored state wins for `kaboo_session` and `kaboo_history`

**Who:** anything that sends `kaboo_session` or `kaboo_history` from the
browser. kaboo-react never did.

A browser-sent copy of either key is now ignored; the stored copy is used, or
none. Before, the browser's copy won, so a client could forge a pending approval
with input the agent never proposed. Other state keys still let the caller's
value win.

### Replay no longer stops at an aborted run

**Who:** hosts that patched `connect()` to rewrite historical `RUN_ERROR`s
(kaboo-bmo and EndofSzn did); clients that relied on seeing a `RUN_ERROR` when
replaying a thread.

The AG-UI client accepts nothing after a `RUN_ERROR`, so a stored error cut a
replayed conversation off at the first aborted turn. The runner now replays a
stored error as `RUN_FINISHED` (after closing what it left open), drops terminal
events outside any run, and puts recovered messages inside the last run. Delete
the patch. Live events of an in-flight run are passed through unchanged.

### Remembered approvals (new, opt-in)

**Who:** apps that want "Allow for this chat" and "Always allow" on tool
approvals from kaboo-workflows 0.27.

```ts
import { createKabooRunner, InMemoryGrantStore, InMemoryThreadStore } from "@pgege/kaboo-runtime";

const runner = createKabooRunner(new InMemoryThreadStore(), {
  accessPolicy: { ownerOf: (threadId) => threadId.split(":")[0] ?? null },
  approvals: { grants: new InMemoryGrantStore() },
});
```

Use `PostgresGrantStore` (its own `kaboo_tool_grants` table) or your own
`GrantStore` in production, and `onDecision` for audit or enforcement. A
client-sent `forwardedProps.kaboo_grants` is always replaced, with or without a
grant store. See [Access control](access-control.md#remembered-approvals).

### Tools that enforce their own approvals (new, opt-in)

**Who:** apps whose tools ask for approval themselves (kaboo-workflows 0.27
`interrupt.tool_approvals`).

A decision on such a request has `request`, the tool's own id. The runner
never saves it as a grant: forward it in `onDecision` to the service whose
tool asked, which remembers and enforces it. Nothing changes for gated tools.
See
[Access control](access-control.md#tools-that-enforce-their-own-approvals).
