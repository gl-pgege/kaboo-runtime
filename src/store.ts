import type { BaseEvent, Message } from "@ag-ui/client";

/** Lightweight per-thread summary returned by {@link ThreadStore.listThreads}. */
export interface StoredThread {
  /** Unique thread id (the CopilotKit `threadId`). */
  id: string;
  /** Id of the agent that produced the thread's most recent run. */
  agentId: string;
  /** Owning subject (user id) recorded for the thread, or `null` when unknown. */
  ownerId: string | null;
  /** Creation time, epoch milliseconds. */
  createdAt: number;
  /** Last-updated time, epoch milliseconds (bumped on every persisted run). */
  updatedAt: number;
}

/** Optional filter for {@link ThreadStore.listThreads}. */
export interface ListThreadsFilter {
  /** Only threads owned by this subject. Threads with no recorded owner are excluded. */
  ownerId?: string;
}

/**
 * Pluggable persistence for a thread's full AG-UI event log.
 *
 * This is the extension point: implement it against your own database to
 * control where conversations live. `kaboo-runtime` ships `InMemoryThreadStore`
 * and `PostgresThreadStore` out of the box.
 *
 * The store persists events verbatim so `ACTIVITY_SNAPSHOT` / `CUSTOM` events
 * survive the round-trip and the full UI can be replayed — with one exception:
 * superseded `ACTIVITY_SNAPSHOT` events. Each snapshot fully replaces the
 * previous one for its message, so only the latest per message affects a
 * replay, while a long run can emit thousands of them at hundreds of KB each
 * (a single conversation reaching hundreds of MB in practice). Stores prune
 * superseded snapshots on append via
 * {@link pruneSupersededActivitySnapshots}; custom stores should do the same.
 */
export interface ThreadStore {
  /**
   * Append a completed run's events (in order) to the thread's log.
   *
   * `ownerId` records the owning subject on the thread (the runner passes it
   * from {@link KabooRunnerOptions.accessPolicy | accessPolicy.ownerOf}). A
   * nullish value must preserve any owner already recorded.
   */
  appendEvents(
    threadId: string,
    agentId: string,
    events: BaseEvent[],
    ownerId?: string | null,
  ): Promise<void>;
  /** Read the thread's full event log, verbatim and in order. */
  readEvents(threadId: string): Promise<BaseEvent[]>;
  /** Read the latest agent state (from the last STATE_SNAPSHOT), or `null`. */
  readState(threadId: string): Promise<Record<string, unknown> | null>;
  /** Persist the derived message snapshot for a thread. */
  saveMessages(threadId: string, messages: Message[]): Promise<void>;
  /** Read the derived message snapshot for a thread. */
  readMessages(threadId: string): Promise<Message[]>;
  /**
   * List persisted threads, most recently updated first. With
   * `filter.ownerId`, only that subject's threads are returned.
   */
  listThreads(filter?: ListThreadsFilter): Promise<StoredThread[]>;
  /** Delete one thread's data, or all threads when `threadId` is omitted. */
  clear(threadId?: string): Promise<void>;
}

/**
 * Drop `ACTIVITY_SNAPSHOT` events that a later snapshot for the same message
 * fully replaces, preserving order. A replay produces the identical final UI
 * because each snapshot carries the complete activity state for its message.
 * All other events pass through untouched.
 */
export function pruneSupersededActivitySnapshots(events: BaseEvent[]): BaseEvent[] {
  const lastPerMessage = new Map<unknown, number>();
  events.forEach((event, index) => {
    if (event.type === "ACTIVITY_SNAPSHOT") {
      lastPerMessage.set((event as { messageId?: unknown }).messageId, index);
    }
  });
  if (lastPerMessage.size === 0) return events;
  return events.filter(
    (event, index) =>
      event.type !== "ACTIVITY_SNAPSHOT" ||
      lastPerMessage.get((event as { messageId?: unknown }).messageId) === index,
  );
}
