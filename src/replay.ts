import { EventType, type BaseEvent } from "@ag-ui/client";

/**
 * Make a stored event log safe to replay through an AG-UI client.
 *
 * A log can hold a `RUN_ERROR` from an aborted run (the client aborts a run to
 * send a new message, or the agent fails). The AG-UI client refuses every
 * event after a `RUN_ERROR`, so replaying such a log verbatim would cut the
 * conversation off at the first aborted turn. Each historical error becomes a
 * `RUN_FINISHED`, after closing any text message or tool call the abort left
 * open.
 *
 * A log can also hold a terminal event outside any open run (e.g. a transport
 * error persisted after the run already finished). Passing it on would close a
 * run twice, which the client rejects, so it is dropped.
 *
 * @param events - The stored log, in order.
 * @param threadId - The thread, for a rewritten run that never recorded its own.
 * @returns The log to replay.
 */
export function replayableLog(events: BaseEvent[], threadId: string): BaseEvent[] {
  return closedRuns(events, threadId);
}

/**
 * Place events that close a replay (a recovered `MESSAGES_SNAPSHOT`) inside
 * its last run, before the run's `RUN_FINISHED`: the AG-UI client accepts
 * nothing after a run's terminal event but a new run. A log with no finished
 * run gets a minimal run of its own around them.
 *
 * @param log - A log already made replayable by {@link replayableLog}.
 * @param closing - The events to add.
 * @param threadId - The thread, for a minimal run.
 * @returns The log with `closing` inside a run.
 */
export function withinLastRun(log: BaseEvent[], closing: BaseEvent[], threadId: string): BaseEvent[] {
  if (closing.length === 0) return log;
  let last = -1;
  for (let i = log.length - 1; i >= 0; i--) {
    if (log[i].type === EventType.RUN_FINISHED) {
      last = i;
      break;
    }
  }
  if (last === -1) {
    return [
      ...log,
      { type: EventType.RUN_STARTED, threadId, runId: "replay" } as BaseEvent,
      ...closing,
      { type: EventType.RUN_FINISHED, threadId, runId: "replay" } as BaseEvent,
    ];
  }
  return [...log.slice(0, last), ...closing, ...log.slice(last)];
}

function closedRuns(events: BaseEvent[], threadId: string): BaseEvent[] {
  const out: BaseEvent[] = [];
  let run: { threadId?: string; runId?: string } = {};
  let runOpen = false;
  const openMessages = new Set<string>();
  const openTools = new Set<string>();
  for (const event of events) {
    const e = event as BaseEvent & {
      threadId?: string;
      runId?: string;
      messageId?: string;
      toolCallId?: string;
    };
    switch (e.type) {
      case EventType.RUN_STARTED:
        run = { threadId: e.threadId, runId: e.runId };
        runOpen = true;
        break;
      case EventType.RUN_FINISHED:
        if (!runOpen) continue;
        runOpen = false;
        openMessages.clear();
        openTools.clear();
        break;
      case EventType.TEXT_MESSAGE_START:
        if (e.messageId) openMessages.add(e.messageId);
        break;
      case EventType.TEXT_MESSAGE_END:
        if (e.messageId) openMessages.delete(e.messageId);
        break;
      case EventType.TOOL_CALL_START:
        if (e.toolCallId) openTools.add(e.toolCallId);
        break;
      case EventType.TOOL_CALL_END:
        if (e.toolCallId) openTools.delete(e.toolCallId);
        break;
      case EventType.RUN_ERROR: {
        if (!runOpen) continue;
        runOpen = false;
        for (const toolCallId of openTools) {
          out.push({ type: EventType.TOOL_CALL_END, toolCallId } as BaseEvent);
        }
        for (const messageId of openMessages) {
          out.push({ type: EventType.TEXT_MESSAGE_END, messageId } as BaseEvent);
        }
        openMessages.clear();
        openTools.clear();
        out.push({
          type: EventType.RUN_FINISHED,
          threadId: run.threadId ?? threadId,
          runId: run.runId ?? "aborted-run",
        } as BaseEvent);
        continue;
      }
      default:
        break;
    }
    out.push(event);
  }
  return out;
}
