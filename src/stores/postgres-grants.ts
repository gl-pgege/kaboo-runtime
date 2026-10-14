import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import type { GrantQuery, GrantStore, NewToolGrant, ToolGrant } from "../approvals";

/**
 * Options for {@link PostgresGrantStore}. Provide exactly one connection
 * source: a `dsn` connection string (the store creates and owns its own
 * `pg.Pool`) or an existing `pool` to reuse — typically the one your
 * `PostgresThreadStore` uses. Passing neither throws.
 */
export interface PostgresGrantStoreOptions {
  /** Postgres connection string. Ignored when an existing `pool` is passed. */
  dsn?: string;
  /** Reuse an existing `pg.Pool` instead of creating one from `dsn`. */
  pool?: Pool;
}

interface GrantRow {
  id: string;
  owner_id: string;
  agent_id: string;
  thread_id: string | null;
  tool: string;
  subject: string;
  label: string;
  created_at: string;
}

function toGrant(row: GrantRow): ToolGrant {
  return {
    id: row.id,
    ownerId: row.owner_id,
    agentId: row.agent_id,
    threadId: row.thread_id,
    tool: row.tool,
    subject: row.subject,
    label: row.label,
    createdAt: Number(row.created_at),
  };
}

const COLUMNS = "id, owner_id, agent_id, thread_id, tool, subject, label, created_at";

/**
 * Durable {@link GrantStore} backed by Postgres, in its own `kaboo_tool_grants`
 * table (created on first use, independent of any application schema). `pg`
 * is an optional peer dependency — install it in the host app to use this
 * store.
 *
 * @example
 * ```ts
 * import { Pool } from "pg";
 * import { createKabooRunner, PostgresGrantStore, PostgresThreadStore } from "@pgege/kaboo-runtime";
 *
 * const pool = new Pool({ connectionString: process.env.DATABASE_URL });
 * const runner = createKabooRunner(new PostgresThreadStore({ pool }), {
 *   accessPolicy: { ownerOf: (threadId) => threadId.split(":")[0] ?? null },
 *   approvals: { grants: new PostgresGrantStore({ pool }) },
 * });
 * ```
 */
export class PostgresGrantStore implements GrantStore {
  private pool: Pool | null;
  private readonly dsn?: string;
  private ready: Promise<void> | null = null;

  constructor(options: PostgresGrantStoreOptions) {
    this.pool = options.pool ?? null;
    this.dsn = options.dsn;
    if (!this.pool && !this.dsn) {
      throw new Error("PostgresGrantStore requires either `dsn` or `pool`");
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
          CREATE TABLE IF NOT EXISTS kaboo_tool_grants (
            id text PRIMARY KEY,
            owner_id text NOT NULL,
            agent_id text NOT NULL,
            thread_id text,
            tool text NOT NULL,
            subject text NOT NULL,
            label text NOT NULL,
            created_at bigint NOT NULL
          );
          CREATE UNIQUE INDEX IF NOT EXISTS kaboo_tool_grants_unique_idx
            ON kaboo_tool_grants (owner_id, agent_id, (COALESCE(thread_id, '')), tool, subject);
          CREATE INDEX IF NOT EXISTS kaboo_tool_grants_owner_idx
            ON kaboo_tool_grants (owner_id, agent_id);
        `);
      })();
    }
    await this.ready;
    return pool;
  }

  async list(query: GrantQuery): Promise<ToolGrant[]> {
    const pool = await this.ensureReady();
    const { rows } = await pool.query<GrantRow>(
      `SELECT ${COLUMNS} FROM kaboo_tool_grants
       WHERE owner_id = $1 AND agent_id = $2 AND (thread_id IS NULL OR thread_id = $3)`,
      [query.ownerId, query.agentId, query.threadId],
    );
    return rows.map(toGrant);
  }

  async save(grant: NewToolGrant): Promise<ToolGrant> {
    const pool = await this.ensureReady();
    const { rows } = await pool.query<GrantRow>(
      `INSERT INTO kaboo_tool_grants (id, owner_id, agent_id, thread_id, tool, subject, label, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (owner_id, agent_id, (COALESCE(thread_id, '')), tool, subject)
       DO UPDATE SET label = EXCLUDED.label, created_at = EXCLUDED.created_at
       RETURNING ${COLUMNS}`,
      [
        randomUUID(),
        grant.ownerId,
        grant.agentId,
        grant.threadId,
        grant.tool,
        grant.subject,
        grant.label,
        Date.now(),
      ],
    );
    return toGrant(rows[0]);
  }

  async revoke(ownerId: string, id: string): Promise<void> {
    const pool = await this.ensureReady();
    await pool.query(`DELETE FROM kaboo_tool_grants WHERE id = $1 AND owner_id = $2`, [id, ownerId]);
  }

  async listForOwner(ownerId: string): Promise<ToolGrant[]> {
    const pool = await this.ensureReady();
    const { rows } = await pool.query<GrantRow>(
      `SELECT ${COLUMNS} FROM kaboo_tool_grants WHERE owner_id = $1 ORDER BY created_at DESC`,
      [ownerId],
    );
    return rows.map(toGrant);
  }
}
