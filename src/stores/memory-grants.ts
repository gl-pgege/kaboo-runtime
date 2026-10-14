import { randomUUID } from "node:crypto";
import type { GrantQuery, GrantStore, NewToolGrant, ToolGrant } from "../approvals";

function sameGrant(a: NewToolGrant, b: NewToolGrant): boolean {
  return (
    a.ownerId === b.ownerId &&
    a.agentId === b.agentId &&
    a.threadId === b.threadId &&
    a.tool === b.tool &&
    a.subject === b.subject
  );
}

/**
 * Process-memory {@link GrantStore}: remembered approvals last until the
 * process restarts. Suited to local development and tests; use
 * `PostgresGrantStore` (or your own store) when decisions must survive.
 *
 * @example
 * ```ts
 * import { createKabooRunner, InMemoryGrantStore, InMemoryThreadStore } from "@pgege/kaboo-runtime";
 *
 * const runner = createKabooRunner(new InMemoryThreadStore(), {
 *   accessPolicy: { ownerOf: (threadId) => threadId.split(":")[0] ?? null },
 *   approvals: { grants: new InMemoryGrantStore() },
 * });
 * ```
 */
export class InMemoryGrantStore implements GrantStore {
  private readonly grants = new Map<string, ToolGrant>();

  async list(query: GrantQuery): Promise<ToolGrant[]> {
    return [...this.grants.values()].filter(
      (g) =>
        g.ownerId === query.ownerId &&
        g.agentId === query.agentId &&
        (g.threadId === null || g.threadId === query.threadId),
    );
  }

  async save(grant: NewToolGrant): Promise<ToolGrant> {
    for (const [id, existing] of this.grants) {
      if (sameGrant(existing, grant)) this.grants.delete(id);
    }
    const saved: ToolGrant = { ...grant, id: randomUUID(), createdAt: Date.now() };
    this.grants.set(saved.id, saved);
    return saved;
  }

  async revoke(ownerId: string, id: string): Promise<void> {
    if (this.grants.get(id)?.ownerId === ownerId) this.grants.delete(id);
  }

  async listForOwner(ownerId: string): Promise<ToolGrant[]> {
    return [...this.grants.values()]
      .filter((g) => g.ownerId === ownerId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }
}
