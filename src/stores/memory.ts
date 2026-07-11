import type { BaseEvent, Message } from "@ag-ui/client";
import type { StoredThread, ThreadStore } from "../store";
import { deriveState } from "../state";

interface MemoryRecord {
  agentId: string;
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
 * import { createKabooRunner, InMemoryThreadStore } from "kaboo-runtime";
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
      record = { agentId, events: [], messages: [], createdAt: now, updatedAt: now };
      this.threads.set(threadId, record);
    }
    return record;
  }

  async appendEvents(threadId: string, agentId: string, events: BaseEvent[]): Promise<void> {
    const record = this.record(threadId, agentId);
    record.agentId = agentId;
    record.events.push(...events);
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

  async listThreads(): Promise<StoredThread[]> {
    return [...this.threads.entries()]
      .map(([id, r]) => ({ id, agentId: r.agentId, createdAt: r.createdAt, updatedAt: r.updatedAt }))
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
