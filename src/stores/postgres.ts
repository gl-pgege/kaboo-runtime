import type { Pool } from "pg";
import type { BaseEvent, Message } from "@ag-ui/client";
import type { ListThreadsFilter, StoredThread, ThreadStore } from "../store";
import { deriveState } from "../state";

/**
 * Serialize a value for a Postgres `jsonb` column. `jsonb` rejects strings
 * containing `\u0000` or lone UTF-16 surrogates, which agent tool output (raw
 * command output, binary-ish file content) can legitimately contain — one such
 * string would otherwise poison every insert of the surrounding event.
 */
function toJsonbSafe(value: unknown): string {
  return JSON.stringify(value, (_key, v) => {
    if (typeof v !== "string") return v;
    // Cast because `toWellFormed` needs lib es2024, above this package's target.
    const s = v as string & { toWellFormed?: () => string };
    const wellFormed = typeof s.toWellFormed === "function" ? s.toWellFormed() : v;
    return wellFormed.includes("\u0000") ? wellFormed.replaceAll("\u0000", "") : wellFormed;
  });
}

/**
 * Options for {@link PostgresThreadStore}. Provide exactly one connection
 * source: either a `dsn` connection string (the store creates and owns its own
 * `pg.Pool`) or an existing `pool` to reuse. Passing neither throws.
 */
export interface PostgresThreadStoreOptions {
  /** Postgres connection string. Ignored when an existing `pool` is passed. */
  dsn?: string;
  /** Reuse an existing `pg.Pool` instead of creating one from `dsn`. */
  pool?: Pool;
}

/**
 * Durable {@link ThreadStore} backed by Postgres. Uses its own conversation
 * tables (`kaboo_threads`, `kaboo_thread_events`, `kaboo_thread_messages`),
 * independent of any application schema. `pg` is an optional peer dependency —
 * install it in the host app to use this store.
 *
 * @example
 * ```ts
 * import { createKabooRunner, PostgresThreadStore } from "@pgege/kaboo-runtime";
 *
 * const store = new PostgresThreadStore({ dsn: process.env.DATABASE_URL });
 * const runner = createKabooRunner(store);
 * ```
 */
export class PostgresThreadStore implements ThreadStore {
  private pool: Pool | null;
  private readonly dsn?: string;
  private ready: Promise<void> | null = null;

  constructor(options: PostgresThreadStoreOptions) {
    this.pool = options.pool ?? null;
    this.dsn = options.dsn;
    if (!this.pool && !this.dsn) {
      throw new Error("PostgresThreadStore requires either `dsn` or `pool`");
    }
  }

  private async getPool(): Promise<Pool> {
    if (this.pool) return this.pool;
    const pg = (await import("pg")) as unknown as { default?: { Pool: new (c: unknown) => Pool }; Pool?: new (c: unknown) => Pool };
    const PoolCtor = pg.Pool ?? pg.default?.Pool;
    if (!PoolCtor) throw new Error("Failed to load `pg`. Install it: npm i pg");
    this.pool = new PoolCtor({ connectionString: this.dsn });
    return this.pool;
  }

  private async ensureReady(): Promise<Pool> {
    const pool = await this.getPool();
    if (!this.ready) {
      this.ready = (async () => {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS kaboo_threads (
            id text PRIMARY KEY,
            agent_id text NOT NULL,
            created_at bigint NOT NULL,
            updated_at bigint NOT NULL
          );
          ALTER TABLE kaboo_threads ADD COLUMN IF NOT EXISTS owner_id text;
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
        `);
      })();
    }
    await this.ready;
    return pool;
  }

  async appendEvents(
    threadId: string,
    agentId: string,
    events: BaseEvent[],
    ownerId?: string | null,
  ): Promise<void> {
    if (events.length === 0) return;
    const pool = await this.ensureReady();
    const now = Date.now();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // COALESCE keeps a previously recorded owner when this run passes none.
      await client.query(
        `INSERT INTO kaboo_threads (id, agent_id, created_at, updated_at, owner_id)
         VALUES ($1, $2, $3, $3, $4)
         ON CONFLICT (id) DO UPDATE SET
           agent_id = EXCLUDED.agent_id,
           updated_at = EXCLUDED.updated_at,
           owner_id = COALESCE(EXCLUDED.owner_id, kaboo_threads.owner_id)`,
        [threadId, agentId, now, ownerId ?? null],
      );
      for (const event of events) {
        await client.query(
          `INSERT INTO kaboo_thread_events (thread_id, event) VALUES ($1, $2)`,
          [threadId, toJsonbSafe(event)],
        );
      }
      if (events.some((e) => e.type === "ACTIVITY_SNAPSHOT")) {
        // Each ACTIVITY_SNAPSHOT fully replaces the previous one for its
        // message, so only the latest per message matters for replay. Pruning
        // on append keeps the log bounded — long runs otherwise accumulate
        // thousands of superseded snapshots at hundreds of KB each.
        await client.query(
          `DELETE FROM kaboo_thread_events e
           USING (
             SELECT event->>'messageId' AS message_id, max(seq) AS keep_seq
             FROM kaboo_thread_events
             WHERE thread_id = $1 AND event->>'type' = 'ACTIVITY_SNAPSHOT'
             GROUP BY event->>'messageId'
           ) latest
           WHERE e.thread_id = $1
             AND e.event->>'type' = 'ACTIVITY_SNAPSHOT'
             AND e.event->>'messageId' IS NOT DISTINCT FROM latest.message_id
             AND e.seq < latest.keep_seq`,
          [threadId],
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async readEvents(threadId: string): Promise<BaseEvent[]> {
    const pool = await this.ensureReady();
    const { rows } = await pool.query<{ event: BaseEvent }>(
      `SELECT event FROM kaboo_thread_events WHERE thread_id = $1 ORDER BY seq ASC`,
      [threadId],
    );
    return rows.map((r) => r.event);
  }

  async readState(threadId: string): Promise<Record<string, unknown> | null> {
    const pool = await this.ensureReady();
    // Fetch only the last STATE_SNAPSHOT instead of deriving from the full
    // log — logs of long agent runs can be hundreds of megabytes.
    const { rows } = await pool.query<{ event: BaseEvent }>(
      `SELECT event FROM kaboo_thread_events
       WHERE thread_id = $1 AND event->>'type' = $2
       ORDER BY seq DESC LIMIT 1`,
      [threadId, "STATE_SNAPSHOT"],
    );
    const event = rows[0]?.event;
    if (!event) return null;
    return deriveState([event]);
  }

  async saveMessages(threadId: string, messages: Message[]): Promise<void> {
    const pool = await this.ensureReady();
    await pool.query(
      `INSERT INTO kaboo_thread_messages (thread_id, messages, updated_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (thread_id) DO UPDATE SET messages = EXCLUDED.messages, updated_at = EXCLUDED.updated_at`,
      [threadId, toJsonbSafe(messages), Date.now()],
    );
  }

  async readMessages(threadId: string): Promise<Message[]> {
    const pool = await this.ensureReady();
    const { rows } = await pool.query<{ messages: Message[] }>(
      `SELECT messages FROM kaboo_thread_messages WHERE thread_id = $1`,
      [threadId],
    );
    return rows[0]?.messages ?? [];
  }

  async listThreads(filter?: ListThreadsFilter): Promise<StoredThread[]> {
    const pool = await this.ensureReady();
    const scoped = filter?.ownerId !== undefined;
    const { rows } = await pool.query<{
      id: string;
      agent_id: string;
      owner_id: string | null;
      created_at: string;
      updated_at: string;
    }>(
      scoped
        ? `SELECT id, agent_id, owner_id, created_at, updated_at FROM kaboo_threads
           WHERE owner_id = $1 ORDER BY updated_at DESC`
        : `SELECT id, agent_id, owner_id, created_at, updated_at FROM kaboo_threads
           ORDER BY updated_at DESC`,
      scoped ? [filter.ownerId] : [],
    );
    return rows.map((r) => ({
      id: r.id,
      agentId: r.agent_id,
      ownerId: r.owner_id,
      createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at),
    }));
  }

  async clear(threadId?: string): Promise<void> {
    const pool = await this.ensureReady();
    if (threadId === undefined) {
      await pool.query(`TRUNCATE kaboo_thread_events, kaboo_thread_messages, kaboo_threads`);
    } else {
      await pool.query(`DELETE FROM kaboo_thread_events WHERE thread_id = $1`, [threadId]);
      await pool.query(`DELETE FROM kaboo_thread_messages WHERE thread_id = $1`, [threadId]);
      await pool.query(`DELETE FROM kaboo_threads WHERE id = $1`, [threadId]);
    }
  }
}
