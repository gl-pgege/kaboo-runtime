import { compactEvents, EventType, type BaseEvent, type Message } from "@ag-ui/client";

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
 * Events are appended as a run streams, so a crash keeps everything up to the
 * last write. Once a run ends, the runner asks the store to compact it
 * ({@link ThreadStore.compactRun}): streamed deltas become single events and
 * the run's state changes become one snapshot, with the order of everything
 * else kept.
 */
export interface ThreadStore {
  /**
   * Append events (in order) to the thread's log.
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
  /**
   * Replace a finished run's events with {@link compactRunEvents} of them, in
   * place: events appended after the run keep their position. A run that has
   * not finished, or is not in the log, is left alone.
   */
  compactRun(threadId: string, runId: string): Promise<void>;
  /** Read the thread's full event log, in order. */
  readEvents(threadId: string): Promise<BaseEvent[]>;
  /** Read the latest agent state (see `deriveState`), or `null`. */
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
 * The bounds of a finished run in a log: the index of its `RUN_STARTED` and of
 * the terminal event that closes it, or `null`.
 */
export function finishedRunBounds(events: readonly BaseEvent[], runId: string): [number, number] | null {
  for (let start = events.length - 1; start >= 0; start--) {
    const event = events[start] as BaseEvent & { runId?: unknown };
    if (event.type !== EventType.RUN_STARTED || event.runId !== runId) continue;
    for (let end = start + 1; end < events.length; end++) {
      const type = events[end].type;
      if (type === EventType.RUN_FINISHED || type === EventType.RUN_ERROR) return [start, end];
      if (type === EventType.RUN_STARTED) return null;
    }
    return null;
  }
  return null;
}

/**
 * Compact one finished run's events with AG-UI's `compactEvents`: text and
 * tool-argument deltas joined, state changes folded into one snapshot.
 * Returns the input when compaction would not shrink it.
 */
export function compactRunEvents(events: BaseEvent[]): BaseEvent[] {
  const compacted = foldReasoning(compactEvents(events));
  return compacted.length < events.length ? compacted : events;
}

const DELTAS: Partial<Record<string, string>> = {
  [EventType.TEXT_MESSAGE_CONTENT]: "messageId",
  [EventType.TOOL_CALL_ARGS]: "toolCallId",
  [EventType.REASONING_MESSAGE_CONTENT]: "messageId",
};

type Delta = BaseEvent & { delta?: string } & Record<string, unknown>;

/**
 * Join neighbouring deltas of one message or tool call into one event, so a
 * batch of streamed tokens is stored as one row. The joined events replay the
 * same text and arguments.
 */
export function mergeDeltas(events: BaseEvent[]): BaseEvent[] {
  const merged: BaseEvent[] = [];
  for (const event of events) {
    const key = DELTAS[event.type];
    const last = merged[merged.length - 1] as Delta | undefined;
    if (key && last && last.type === event.type && last[key] === (event as Delta)[key]) {
      merged[merged.length - 1] = { ...last, delta: `${last.delta ?? ""}${(event as Delta).delta ?? ""}` };
    } else {
      merged.push(event);
    }
  }
  return merged;
}

/**
 * Join every reasoning delta of a message into its first, which `compactEvents`
 * leaves as streamed.
 */
export function foldReasoning(events: BaseEvent[]): BaseEvent[] {
  const first = new Map<unknown, number>();
  const folded: BaseEvent[] = [];
  for (const event of events) {
    if (event.type !== EventType.REASONING_MESSAGE_CONTENT) {
      folded.push(event);
      continue;
    }
    const delta = event as Delta;
    const at = first.get(delta.messageId);
    if (at === undefined) {
      first.set(delta.messageId, folded.length);
      folded.push(event);
    } else {
      const head = folded[at] as Delta;
      folded[at] = { ...head, delta: `${head.delta ?? ""}${delta.delta ?? ""}` };
    }
  }
  return folded;
}

const LEGACY_ACTIVITY = "kaboo.activity";

/**
 * What a reconnecting client needs from a thread's log: only the last messages
 * snapshot and the last state snapshot (with the deltas after it), without the
 * activity events of runtimes before 0.8, which nothing renders, and with
 * deltas joined.
 */
export function compactForReplay(events: BaseEvent[]): BaseEvent[] {
  let lastMessages = -1;
  let lastState = -1;
  events.forEach((event, index) => {
    if (event.type === EventType.MESSAGES_SNAPSHOT) lastMessages = index;
    if (event.type === EventType.STATE_SNAPSHOT) lastState = index;
  });
  const kept = events.filter((event, index) => {
    if ((event as { activityType?: unknown }).activityType === LEGACY_ACTIVITY) return false;
    if (event.type === EventType.MESSAGES_SNAPSHOT) return index === lastMessages;
    if (event.type === EventType.STATE_SNAPSHOT || event.type === EventType.STATE_DELTA) return index >= lastState;
    return true;
  });
  return foldReasoning(compactEvents(kept));
}
