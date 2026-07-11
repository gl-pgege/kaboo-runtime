# kaboo-runtime

> A persistence plugin for the CopilotKit runtime: a custom `AgentRunner` +
> pluggable `ThreadStore` that persists the full AG-UI event log and replays it
> on reload. Framework-agnostic, no HTTP layer.

kaboo-runtime makes the **server** the custodian of conversation history. It
records every AG-UI event verbatim to a pluggable store and replays it on
reconnect, so a browser reload rebuilds the full transcript — messages, tools,
state, and activity — not just the last answer.

## Install

```bash
yarn add kaboo-runtime
```

Peer dependencies: `@ag-ui/client`, `@copilotkit/runtime`, `rxjs`; `pg` is an
optional peer for `PostgresThreadStore`.

## Quick start

<!-- source: examples/express-inmemory/src/server.ts#quickstart -->
```ts
import express from "express";
import { CopilotRuntime } from "@copilotkit/runtime/v2";
import { createCopilotExpressHandler } from "@copilotkit/runtime/v2/express";
import { createKabooRunner, InMemoryThreadStore } from "kaboo-runtime";

const runtime = new CopilotRuntime({
  agents: {},
  runner: createKabooRunner(new InMemoryThreadStore()),
});

const app = express();
app.use(createCopilotExpressHandler({ runtime, basePath: "/api/copilotkit" }));

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`CopilotKit runtime on http://localhost:${port}/api/copilotkit`);
  console.log("kaboo-runtime persistence: InMemoryThreadStore");
});
```

## Next

- [Getting started](getting-started.md) — wire the runner and verify replay.
- [Thread stores](thread-stores.md) — in-memory vs Postgres, schema, `dsn` vs `pool`.
- [Custom store](custom-store.md) — implement `ThreadStore` yourself.
- [Replay & state](replay-and-state.md) — the event log, `deriveState`, history injection.
- [API reference](api/) — auto-generated from the source.
