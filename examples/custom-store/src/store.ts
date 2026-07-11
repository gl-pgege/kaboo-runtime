// #region custom-store
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import type { BaseEvent, Message } from "@ag-ui/client";
import { deriveState, type StoredThread, type ThreadStore } from "@pgege/kaboo-runtime";

interface Row {
  agentId: string;
  events: BaseEvent[];
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

/**
 * A minimal ThreadStore that persists every thread to a single JSON file.
 * Demonstrates the extension point — events are stored verbatim and state is
 * derived with `deriveState`. Not tuned for concurrency or scale.
 */
export class JsonFileThreadStore implements ThreadStore {
  private readonly data: Record<string, Row>;

  constructor(private readonly file: string) {
    this.data = existsSync(file)
      ? (JSON.parse(readFileSync(file, "utf8")) as Record<string, Row>)
      : {};
  }

  private flush(): void {
    writeFileSync(this.file, JSON.stringify(this.data));
  }

  private row(threadId: string, agentId: string): Row {
    let row = this.data[threadId];
    if (!row) {
      const now = Date.now();
      row = { agentId, events: [], messages: [], createdAt: now, updatedAt: now };
      this.data[threadId] = row;
    }
    return row;
  }

  async appendEvents(threadId: string, agentId: string, events: BaseEvent[]): Promise<void> {
    const row = this.row(threadId, agentId);
    row.agentId = agentId;
    row.events.push(...events);
    row.updatedAt = Date.now();
    this.flush();
  }

  async readEvents(threadId: string): Promise<BaseEvent[]> {
    return [...(this.data[threadId]?.events ?? [])];
  }

  async readState(threadId: string): Promise<Record<string, unknown> | null> {
    return deriveState(this.data[threadId]?.events ?? []);
  }

  async saveMessages(threadId: string, messages: Message[]): Promise<void> {
    const row = this.data[threadId];
    if (row) {
      row.messages = [...messages];
      row.updatedAt = Date.now();
      this.flush();
    }
  }

  async readMessages(threadId: string): Promise<Message[]> {
    return [...(this.data[threadId]?.messages ?? [])];
  }

  async listThreads(): Promise<StoredThread[]> {
    return Object.entries(this.data)
      .map(([id, r]) => ({ id, agentId: r.agentId, createdAt: r.createdAt, updatedAt: r.updatedAt }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async clear(threadId?: string): Promise<void> {
    if (threadId === undefined) {
      for (const key of Object.keys(this.data)) delete this.data[key];
    } else {
      delete this.data[threadId];
    }
    this.flush();
  }
}
// #endregion custom-store
