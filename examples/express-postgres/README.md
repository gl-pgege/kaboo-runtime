# express-postgres

Same as [`../express-inmemory`](../express-inmemory) but with durable Postgres
persistence via `PostgresThreadStore`.

## What it shows

- `createKabooRunner(new PostgresThreadStore({ dsn }))` for cross-restart replay.
- The store auto-creates its own tables (`kaboo_threads`, `kaboo_thread_events`,
  `kaboo_thread_messages`) on first use — no migration step required.

## Prerequisites

- Node.js >= 18.
- A reachable Postgres instance and a `DATABASE_URL` connection string, e.g.
  `postgresql://user:pass@localhost:5432/db`.
- `pg` installed (it is an optional peer of `kaboo-runtime`; this example depends
  on it directly).

## Run

```bash
yarn install
DATABASE_URL=postgresql://user:pass@localhost:5432/db yarn start
```

The runtime is served at `http://localhost:4000/api/copilotkit`. Restart the
process and reconnect: prior turns replay from Postgres.
