# Thread stores

A `ThreadStore` is where a thread's full AG-UI event log lives. kaboo-runtime
ships two implementations and lets you write your own
([Custom store](custom-store.md)).

## The ThreadStore contract

Every store implements seven methods:

| Method | Purpose |
| --- | --- |
| `appendEvents(threadId, agentId, events)` | Append a completed run's events, in order. |
| `readEvents(threadId)` | Read the full event log, verbatim and in order. |
| `readState(threadId)` | Latest state from the last `STATE_SNAPSHOT`, or `null`. |
| `saveMessages(threadId, messages)` | Persist the derived message snapshot. |
| `readMessages(threadId)` | Read the derived message snapshot. |
| `listThreads()` | Every thread, most recently updated first. |
| `clear(threadId?)` | Delete one thread, or all when omitted. |

Events are stored **verbatim** — there is no compaction — so `ACTIVITY_SNAPSHOT`
and `CUSTOM` events survive the round-trip and the full UI can be replayed.

## InMemoryThreadStore

Keeps everything in a `Map` for the life of the process. Ideal for local
development, tests, and the demo. Data is lost on restart.

```ts
import { createKabooRunner, InMemoryThreadStore } from "@kaboo/runtime";

const runner = createKabooRunner(new InMemoryThreadStore());
```

## PostgresThreadStore

Durable persistence in Postgres, using its own tables (independent of your
application schema). `pg` is an optional peer dependency — install it to use this
store.

```ts
import { createKabooRunner, PostgresThreadStore } from "@kaboo/runtime";

const runner = createKabooRunner(
  new PostgresThreadStore({ dsn: process.env.DATABASE_URL }),
);
```

### Postgres schema

The store creates these tables (and index) on first use — no migration step:

```sql
CREATE TABLE IF NOT EXISTS kaboo_threads (
  id text PRIMARY KEY,
  agent_id text NOT NULL,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);
CREATE TABLE IF NOT EXISTS kaboo_thread_events (
  seq bigserial PRIMARY KEY,
  thread_id text NOT NULL,
  event jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS kaboo_thread_events_thread_idx
  ON kaboo_thread_events (thread_id, seq);
CREATE TABLE IF NOT EXISTS kaboo_thread_messages (
  thread_id text PRIMARY KEY,
  messages jsonb NOT NULL,
  updated_at bigint NOT NULL
);
```

### `dsn` vs `pool`

Pass a `dsn` connection string and the store creates and owns its own `pg.Pool`.
To share an existing pool (e.g. your app already has one), pass `pool` instead:

```ts
import { Pool } from "pg";
import { PostgresThreadStore } from "@kaboo/runtime";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const store = new PostgresThreadStore({ pool });
```

Passing neither `dsn` nor `pool` throws.

## Choosing a store

- **Dev / tests / demo:** `InMemoryThreadStore`.
- **Production / durable:** `PostgresThreadStore`.
- **Anything else:** a [custom store](custom-store.md).
