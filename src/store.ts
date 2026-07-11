import type { BaseEvent, Message } from "@ag-ui/client";

/** Lightweight per-thread summary returned by {@link ThreadStore.listThreads}. */
export interface StoredThread {
  /** Unique thread id (the CopilotKit `threadId`). */
  id: string;
  /** Id of the agent that produced the thread's most recent run. */
  agentId: string;
  /** Creation time, epoch milliseconds. */
  createdAt: number;
  /** Last-updated time, epoch milliseconds (bumped on every persisted run). */
  updatedAt: number;
}

/**
 * Pluggable persistence for a thread's full AG-UI event log.
 *
 * This is the extension point: implement it against your own database to
 * control where conversations live. `kaboo-runtime` ships `InMemoryThreadStore`
 * and `PostgresThreadStore` out of the box.
 *
 * The store persists events verbatim (no compaction) so `ACTIVITY_SNAPSHOT` /
 * `CUSTOM` events survive the round-trip and the full UI can be replayed.
 */
export interface ThreadStore {
  /** Append a completed run's events (in order) to the thread's log. */
  appendEvents(threadId: string, agentId: string, events: BaseEvent[]): Promise<void>;
  /** Read the thread's full event log, verbatim and in order. */
  readEvents(threadId: string): Promise<BaseEvent[]>;
  /** Read the latest agent state (from the last STATE_SNAPSHOT), or `null`. */
  readState(threadId: string): Promise<Record<string, unknown> | null>;
  /** Persist the derived message snapshot for a thread. */
  saveMessages(threadId: string, messages: Message[]): Promise<void>;
  /** Read the derived message snapshot for a thread. */
  readMessages(threadId: string): Promise<Message[]>;
  /** List every persisted thread, most recently updated first. */
  listThreads(): Promise<StoredThread[]>;
  /** Delete one thread's data, or all threads when `threadId` is omitted. */
  clear(threadId?: string): Promise<void>;
}
