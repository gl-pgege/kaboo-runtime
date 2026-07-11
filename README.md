# kaboo-runtime

> A persistence plugin for the [CopilotKit](https://copilotkit.ai) runtime: a
> custom `AgentRunner` + pluggable `ThreadStore` that persists the full AG-UI
> event log and replays it on reload. Framework-agnostic, no HTTP layer.

[![npm version](https://img.shields.io/npm/v/kaboo-runtime.svg)](https://www.npmjs.com/package/kaboo-runtime)
[![license](https://img.shields.io/npm/l/kaboo-runtime.svg)](./LICENSE)
[![docs](https://img.shields.io/badge/docs-mkdocs-blue.svg)](https://gl-pgege.github.io/kaboo-runtime/)
[![CI](https://github.com/gl-pgege/kaboo-runtime/actions/workflows/ci.yml/badge.svg)](https://github.com/gl-pgege/kaboo-runtime/actions/workflows/ci.yml)

kaboo-runtime makes the server the custodian of conversation history. It drops a
custom `AgentRunner` into your CopilotKit runtime that records **every** AG-UI
event verbatim to a pluggable store and replays it on reconnect — so a browser
reload rebuilds the full transcript (messages, tools, state, and activity), not
just the last answer. It ships no HTTP layer, so it works under any framework you
already mount CopilotKit with.

## Features

- **Verbatim event log** — the whole AG-UI run stream is persisted uncompacted,
  so `ACTIVITY_SNAPSHOT` / `CUSTOM` events survive for a full UI replay.
- **Replay on reload** — reconnecting a thread replays stored turns, then tees
  any in-flight run.
- **Server-owned history** — each run's persisted state (including
  kaboo-workflows' `kaboo_history`) is injected into `input.state`, so the
  browser is no longer the source of truth.
- **Pluggable store** — implement the `ThreadStore` interface for any database;
  `InMemoryThreadStore` and `PostgresThreadStore` ship out of the box.
- **Framework-agnostic** — no Express/Nest coupling; drop it into
  `new CopilotRuntime({ agents, runner })`.

## Install

```bash
yarn add @pgege/kaboo-runtime
```

Peer dependencies: `@ag-ui/client`, `@copilotkit/runtime`, and `rxjs`. `pg` is an
optional peer — install it only if you use `PostgresThreadStore`.

## Quick start

Create a runner bound to a store and pass it to `CopilotRuntime`. That's the
whole integration — mount the runtime however your framework normally does (here,
plain Express):

<!-- source: examples/express-inmemory/src/server.ts#quickstart -->
```ts
import express from "express";
import { CopilotRuntime } from "@copilotkit/runtime/v2";
import { createCopilotExpressHandler } from "@copilotkit/runtime/v2/express";
import { createKabooRunner, InMemoryThreadStore } from "@pgege/kaboo-runtime";

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

Swap `InMemoryThreadStore` for `new PostgresThreadStore({ dsn })` to persist
across restarts — the store auto-creates its own tables on first use.

## Core concepts

- **AgentRunner.** `KabooAgentRunner` is a CopilotKit `AgentRunner`. On `run` it
  injects persisted state and streams events; on completion it appends the run's
  events + derived messages to the store. On `connect` it replays the stored log.
- **ThreadStore.** The persistence contract (7 methods). Events are stored
  verbatim — no compaction — so the full UI can be reconstructed.
- **Event log vs derived state.** State is not stored separately; `deriveState`
  scans an event log back to the last `STATE_SNAPSHOT`. History is authoritative
  in the log.
- **No HTTP layer.** The runner never touches the network; your host framework
  owns the endpoint.

## Guides

- [Getting started](./docs/getting-started.md)
- [Thread stores](./docs/thread-stores.md)
- [Custom store](./docs/custom-store.md)
- [Replay & state](./docs/replay-and-state.md)
- [NestJS integration](./docs/integrations/nestjs.md)
- [Express integration](./docs/integrations/express.md)

## API reference

Full, auto-generated API docs live on the
[documentation site](https://gl-pgege.github.io/kaboo-runtime/api/). A flat index
of every public export is in [docs/api-inventory.md](./docs/api-inventory.md).

## Examples

- [`examples/express-inmemory`](./examples/express-inmemory) — the smallest
  end-to-end wiring (this README's quick start).
- [`examples/express-postgres`](./examples/express-postgres) — durable Postgres
  persistence.
- [`examples/custom-store`](./examples/custom-store) — implement `ThreadStore`
  yourself.
- The [kaboo-workflows-demo](https://github.com/gl-pgege/kaboo-docs/tree/main/examples/kaboo-workflows-demo)
  backend is the canonical, production-shaped consumer.

## Compatibility & versioning

- **Node** >= 18.
- **CopilotKit** `@copilotkit/runtime` >= 1.62 (peer dep); `@ag-ui/client` and
  `rxjs` peers; `pg` optional peer.
- Follows [semantic versioning](https://semver.org). See
  [CHANGELOG.md](./CHANGELOG.md).

## The kaboo stack

kaboo-runtime is one of three libraries:

- [kaboo-workflows](https://github.com/gl-pgege/kaboo-workflows) — Python
  multi-agent orchestration.
- **kaboo-runtime** — this library, the persistence/orchestration layer.
- [kaboo-react](https://github.com/gl-pgege/kaboo-react) — the UI layer.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) (humans) and [AGENTS.md](./AGENTS.md)
(AI contributors).

## License

MIT — see [LICENSE](./LICENSE).
