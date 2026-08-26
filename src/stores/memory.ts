import type { BaseEvent, Message } from "@ag-ui/client";
import type { ListThreadsFilter, StoredThread, ThreadStore } from "../store";
import { pruneSupersededActivitySnapshots } from "../store";
import { deriveState } from "../state";

interface MemoryRecord {
  agentId: string;
  ownerId: string | null;
  events: BaseEvent[];
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

/**
 * In-memory {@link ThreadStore}. Data lives for the life of the process — ideal
 * for local development, tests, and the demo. Use `PostgresThreadStore` (or a
 * custom store) for durable persistence.
 *
 * @example
 * ```ts
 * import { createKabooRunner, InMemoryThreadStore } from "@pgege/kaboo-runtime";
 *
 * const runner = createKabooRunner(new InMemoryThreadStore());
 * ```
 */
export class InMemoryThreadStore implements ThreadStore {
  private readonly threads = new Map<string, MemoryRecord>();

  private record(threadId: string, agentId: string): MemoryRecord {
    let record = this.threads.get(threadId);
    if (!record) {
      const now = Date.now();
      record = { agentId, ownerId: null, events: [], messages: [], createdAt: now, updatedAt: now };
      this.threads.set(threadId, record);
    }
    return record;
  }

  async appendEvents(
    threadId: string,
    agentId: string,
    events: BaseEvent[],
    ownerId?: string | null,
  ): Promise<void> {
    const record = this.record(threadId, agentId);
    record.agentId = agentId;
    if (ownerId != null) record.ownerId = ownerId;
    record.events.push(...events);
    if (events.some((e) => e.type === "ACTIVITY_SNAPSHOT")) {
      record.events = pruneSupersededActivitySnapshots(record.events);
    }
    record.updatedAt = Date.now();
  }

  async readEvents(threadId: string): Promise<BaseEvent[]> {
    return [...(this.threads.get(threadId)?.events ?? [])];
  }

  async readState(threadId: string): Promise<Record<string, unknown> | null> {
    const record = this.threads.get(threadId);
    return record ? deriveState(record.events) : null;
  }

  async saveMessages(threadId: string, messages: Message[]): Promise<void> {
    const record = this.threads.get(threadId);
    if (record) {
      record.messages = [...messages];
      record.updatedAt = Date.now();
    }
  }

  async readMessages(threadId: string): Promise<Message[]> {
    return [...(this.threads.get(threadId)?.messages ?? [])];
  }

  async listThreads(filter?: ListThreadsFilter): Promise<StoredThread[]> {
    return [...this.threads.entries()]
      .filter(([, r]) => filter?.ownerId === undefined || r.ownerId === filter.ownerId)
      .map(([id, r]) => ({
        id,
        agentId: r.agentId,
        ownerId: r.ownerId,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async clear(threadId?: string): Promise<void> {
    if (threadId === undefined) {
      this.threads.clear();
    } else {
      this.threads.delete(threadId);
    }
  }
}
