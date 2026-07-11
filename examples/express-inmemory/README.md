# express-inmemory

The smallest end-to-end wiring of `kaboo-runtime`: a plain Express app hosting a
CopilotKit runtime whose `AgentRunner` is `createKabooRunner(new InMemoryThreadStore())`.

## What it shows

- Dropping `createKabooRunner(store)` into `new CopilotRuntime({ agents, runner })`.
- Mounting the runtime on Express with `createCopilotExpressHandler`.
- The zero-config, no-database path (state lives for the life of the process).

## Prerequisites

- Node.js >= 18.
- Add your agents to the `agents` map (this minimal example uses an empty map so
  it runs standalone). See the demo backend for a real `HttpAgent` wiring.

## Run

```bash
yarn install
yarn start
```

The runtime is served at `http://localhost:4000/api/copilotkit`. A browser
client (e.g. via [kaboo-react](https://github.com/gl-pgege/kaboo-react)) can now
connect; reloads replay the persisted event log for the process lifetime.

## Durable persistence

Swap `InMemoryThreadStore` for `PostgresThreadStore` to persist across restarts —
see [`../express-postgres`](../express-postgres).
