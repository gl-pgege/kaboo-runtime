# Getting started

## Prerequisites

- Node.js >= 18.
- A CopilotKit runtime you host yourself (any framework). kaboo-runtime plugs in
  as the runtime's `AgentRunner`; it adds no HTTP layer of its own.
- Peer deps installed: `@ag-ui/client`, `@copilotkit/runtime`, `rxjs`. Add `pg`
  only if you use `PostgresThreadStore`.

## Install

```bash
yarn add kaboo-runtime
```

## Wire the runner

Create a runner bound to a store and pass it to `CopilotRuntime`:

```ts
import { CopilotRuntime } from "@copilotkit/runtime/v2";
import { createKabooRunner, InMemoryThreadStore } from "kaboo-runtime";

const runtime = new CopilotRuntime({
  agents: {},
  runner: createKabooRunner(new InMemoryThreadStore()),
});
```

Mount `runtime` with your framework's CopilotKit handler as usual (see the
[Express](integrations/express.md) and [NestJS](integrations/nestjs.md) guides).

## Persist to Postgres

Swap the store for a durable one — everything else stays the same. The store
creates its own tables on first use:

```ts
import { createKabooRunner, PostgresThreadStore } from "kaboo-runtime";

const runner = createKabooRunner(
  new PostgresThreadStore({ dsn: process.env.DATABASE_URL }),
);
```

## Verify replay

With a store wired in, run a thread, then reload the client. On reconnect the
runner replays the thread's stored event log verbatim — messages, tool calls,
state, and activity — before teeing any in-flight run. With `InMemoryThreadStore`
this survives client reloads for the life of the server process; with
`PostgresThreadStore` it survives server restarts too.

## Observe store failures

Persistence failures never crash a run — they are reported through `onStoreError`
(defaulting to `console.error`):

```ts
import { createKabooRunner, InMemoryThreadStore } from "kaboo-runtime";

const runner = createKabooRunner(new InMemoryThreadStore(), {
  onStoreError: (error, ctx) => {
    console.error(`store ${ctx.op} failed for thread ${ctx.threadId}`, error);
  },
});
```

## Next steps

- [Thread stores](thread-stores.md)
- [Custom store](custom-store.md)
- [Replay & state](replay-and-state.md)
