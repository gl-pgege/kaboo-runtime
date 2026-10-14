# Upgrading

What changes between releases that you might have to act on, with the code
before and after. If none of a release's items apply to you, upgrading is a
version bump.

The kaboo libraries can be upgraded in any order; features that span the stack
light up once every piece is upgraded — see
[Upgrading the stack](https://gl-pgege.github.io/kaboo-docs/start-here/#upgrading-the-stack).

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
