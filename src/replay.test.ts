import { describe, it, expect } from "vitest";
import { EventType, type BaseEvent } from "@ag-ui/client";
import { RUN_ERROR_EVENT, replayableLog } from "./replay";

const event = (type: EventType, extra: Record<string, unknown> = {}): BaseEvent =>
  ({ type, ...extra }) as unknown as BaseEvent;

describe("replayableLog", () => {
  it("replays a failed run as stopped, closing what it left open, so later turns survive", () => {
    const log = [
      event(EventType.RUN_STARTED, { threadId: "t1", runId: "r1", protocolVersion: "1.0" }),
      event(EventType.SUBAGENT_STARTED, { subagentRunId: "s1", name: "analyst" }),
      event(EventType.TEXT_MESSAGE_START, { messageId: "m1", subagentRunId: "s1" }),
      event(EventType.TOOL_CALL_START, { toolCallId: "c1", toolCallName: "lookup" }),
      event(EventType.RUN_ERROR, { message: "aborted", code: "BOOM" }),
      event(EventType.RUN_STARTED, { threadId: "t1", runId: "r2" }),
      event(EventType.RUN_FINISHED, { threadId: "t1", runId: "r2" }),
    ];

    const replay = replayableLog(log);

    expect(replay.map((e) => e.type)).toEqual([
      EventType.RUN_STARTED,
      EventType.SUBAGENT_STARTED,
      EventType.TEXT_MESSAGE_START,
      EventType.TOOL_CALL_START,
      EventType.CUSTOM,
      EventType.TEXT_MESSAGE_END,
      EventType.TOOL_CALL_END,
      EventType.TOOL_CALL_RESULT,
      EventType.SUBAGENT_ERROR,
      EventType.RUN_FINISHED,
      EventType.RUN_STARTED,
      EventType.RUN_FINISHED,
    ]);
    expect(replay[4]).toMatchObject({ name: RUN_ERROR_EVENT, value: { message: "aborted", code: "BOOM" } });
    expect(replay[9]).toMatchObject({ threadId: "t1", runId: "r1", outcome: { type: "cancelled" } });
  });

  it("drops terminal events outside any open run", () => {
    const log = [
      event(EventType.RUN_STARTED),
      event(EventType.RUN_FINISHED),
      event(EventType.RUN_ERROR, { message: "late transport error" }),
      event(EventType.RUN_FINISHED),
    ];
    expect(replayableLog(log).map((e) => e.type)).toEqual([EventType.RUN_STARTED, EventType.RUN_FINISHED]);
  });

  it("leaves a healthy log untouched", () => {
    const log = [
      event(EventType.RUN_STARTED),
      event(EventType.TEXT_MESSAGE_START, { messageId: "m1" }),
      event(EventType.TEXT_MESSAGE_END, { messageId: "m1" }),
      event(EventType.RUN_FINISHED),
    ];
    expect(replayableLog(log)).toEqual(log);
  });
});
