# Troubleshooting

## `Cannot find module '@copilotkit/runtime'` (or `@ag-ui/client` / `rxjs`)

These are **peer dependencies** — install them alongside kaboo-runtime:

```bash
yarn add @copilotkit/runtime @ag-ui/client rxjs
# add pg only if you use PostgresThreadStore
yarn add pg
```

## History doesn't survive a reload

- Confirm you passed the runner to `CopilotRuntime` (`runner:
  createKabooRunner(store)`), not just constructed it.
- `InMemoryThreadStore` survives client reloads only for the life of the server
  process. For durability across server restarts use `PostgresThreadStore`.
- After a process restart, the synchronous query methods (`listThreads`,
  `getThreadEvents`, …) read an in-memory index — call `await runner.hydrate()`
  once on startup to populate it from the store.

## Activity tree / rich UI is empty after replay

kaboo-runtime stores events verbatim, so `ACTIVITY_SNAPSHOT` and `CUSTOM` events
are preserved. If they're missing, the emitting agent isn't sending them — check
the upstream [kaboo-workflows](https://gl-pgege.github.io/kaboo-workflows/) run,
not the store.

## Postgres store errors

- **Tables missing** — the store creates its own tables on first use; ensure the
  role has `CREATE` privileges, or run it once against a writable schema.
- **Connection** — pass either a `dsn` (`new PostgresThreadStore({ dsn })`) or a
  shared `pool`; see [Thread stores](thread-stores.md).
- Persistence failures never crash a run — they surface via `onStoreError`
  (default `console.error`). Wire it to your logger to see what failed.

## The runner replays but the agent never runs

`agents: {}` means there is no agent to run — replay works but new turns can't
start. Register your real agent (see
[Getting started → wire a real agent](getting-started.md#wire-a-real-agent-to-kaboo-workflows)).
