# Getting started

!!! note "Compatibility"
    kaboo-runtime targets **Node.js 18+** and CopilotKit runtime **v2**. It plugs
    in as the runtime's `AgentRunner` and adds no HTTP layer of its own.

## Prerequisites

- Node.js >= 18.
- A CopilotKit runtime you host yourself (any framework). kaboo-runtime plugs in
  as the runtime's `AgentRunner`; it adds no HTTP layer of its own.
- Peer deps installed: `@ag-ui/client`, `@copilotkit/runtime`, `rxjs`. Add `pg`
  only if you use `PostgresThreadStore`.

## Install

```bash
yarn add kaboo-runtime
# or
npm install kaboo-runtime
# or
pnpm add kaboo-runtime
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

## Wire a real agent (to kaboo-workflows)

`agents: {}` persists and replays, but there is nothing to run. Register a real
agent under the `agents` map. The canonical source is an AG-UI endpoint served
by [kaboo-workflows](https://gl-pgege.github.io/kaboo-workflows/)
(`kaboo-serve config.yaml`), reached with an `HttpAgent`:

```ts
import { CopilotRuntime } from "@copilotkit/runtime/v2";
import { HttpAgent } from "@ag-ui/client";
import { createKabooRunner, InMemoryThreadStore } from "kaboo-runtime";

const runtime = new CopilotRuntime({
  agents: {
    // matches the `entry` agent id in your kaboo-workflows config
    research_pipeline: new HttpAgent({ url: "http://localhost:8080/invocations" }),
  },
  runner: createKabooRunner(new InMemoryThreadStore()),
});
```

The runner records that agent's AG-UI stream verbatim and replays it on
reconnect — no change to the agent itself.

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

- [Concepts](concepts.md) — the architecture in one page.
- [Thread stores](thread-stores.md)
- [Custom store](custom-store.md)
- [Replay & state](replay-and-state.md)
- [Troubleshooting](troubleshooting.md)
