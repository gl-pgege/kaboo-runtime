import type { Pool } from "pg";
import type { BaseEvent, Message } from "@ag-ui/client";
import type { StoredThread, ThreadStore } from "../store";
import { deriveState } from "../state";

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
 * import { createKabooRunner, PostgresThreadStore } from "kaboo-runtime";
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

  async appendEvents(threadId: string, agentId: string, events: BaseEvent[]): Promise<void> {
    if (events.length === 0) return;
    const pool = await this.ensureReady();
    const now = Date.now();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO kaboo_threads (id, agent_id, created_at, updated_at)
         VALUES ($1, $2, $3, $3)
         ON CONFLICT (id) DO UPDATE SET agent_id = EXCLUDED.agent_id, updated_at = EXCLUDED.updated_at`,
        [threadId, agentId, now],
      );
      for (const event of events) {
        await client.query(
          `INSERT INTO kaboo_thread_events (thread_id, event) VALUES ($1, $2)`,
          [threadId, JSON.stringify(event)],
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
    return deriveState(await this.readEvents(threadId));
  }

  async saveMessages(threadId: string, messages: Message[]): Promise<void> {
    const pool = await this.ensureReady();
    await pool.query(
      `INSERT INTO kaboo_thread_messages (thread_id, messages, updated_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (thread_id) DO UPDATE SET messages = EXCLUDED.messages, updated_at = EXCLUDED.updated_at`,
      [threadId, JSON.stringify(messages), Date.now()],
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

  async listThreads(): Promise<StoredThread[]> {
    const pool = await this.ensureReady();
    const { rows } = await pool.query<{ id: string; agent_id: string; created_at: string; updated_at: string }>(
      `SELECT id, agent_id, created_at, updated_at FROM kaboo_threads ORDER BY updated_at DESC`,
    );
    return rows.map((r) => ({
      id: r.id,
      agentId: r.agent_id,
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
