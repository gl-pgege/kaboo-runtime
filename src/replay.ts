import { EventType, type BaseEvent } from "@ag-ui/client";
import { createRunEventFinalizer } from "@copilotkit/runtime/v2";

/**
 * Name of the `CUSTOM` event a replay puts where a run failed, carrying the
 * failure's `{ message, code }`: the run itself replays as stopped, so this is
 * how a client can still say why it ended.
 */
export const RUN_ERROR_EVENT = "kaboo.run_error";

/**
 * Make a stored event log safe to replay through an AG-UI client.
 *
 * The AG-UI client accepts nothing after a `RUN_ERROR`, so replaying a log that
 * holds one verbatim would cut the conversation off at the first failed turn.
 * Each historical error becomes a {@link RUN_ERROR_EVENT} followed by the
 * closers a stopped run gets: whatever reasoning, text, tool calls and
 * sub-agents the failure left open, then a cancelled `RUN_FINISHED`.
 *
 * A log can also hold a terminal event outside any open run (e.g. a transport
 * error persisted after the run already finished). Passing it on would close a
 * run twice, which the client rejects, so it is dropped.
 *
 * @param events - The stored log, in order.
 * @returns The log to replay.
 */
export function replayableLog(events: BaseEvent[]): BaseEvent[] {
  const out: BaseEvent[] = [];
  let finalizer = createRunEventFinalizer();
  let protocolVersion: string | undefined;
  let runOpen = false;
  for (const event of events) {
    if (event.type === EventType.RUN_STARTED) {
      finalizer = createRunEventFinalizer();
      protocolVersion = (event as { protocolVersion?: string }).protocolVersion;
      runOpen = true;
    } else if (event.type === EventType.RUN_FINISHED) {
      if (!runOpen) continue;
      runOpen = false;
    } else if (event.type === EventType.RUN_ERROR) {
      if (!runOpen) continue;
      runOpen = false;
      const { message, code } = event as { message?: string; code?: string };
      out.push({ type: EventType.CUSTOM, name: RUN_ERROR_EVENT, value: { message, code } } as BaseEvent);
      out.push(...finalizer.finalize({ stopRequested: true, interruptionMessage: message, protocolVersion }));
      continue;
    }
    if (runOpen) finalizer.observe(event);
    out.push(event);
  }
  return out;
}
