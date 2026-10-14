import { describe, it, expect } from "vitest";
import { EventType, type BaseEvent } from "@ag-ui/client";
import { replayableLog, withinLastRun } from "./replay";

const event = (type: EventType, extra: Record<string, unknown> = {}): BaseEvent =>
  ({ type, ...extra }) as unknown as BaseEvent;

describe("replayableLog", () => {
  it("replays an aborted run as finished, closing what it left open, so later turns survive", () => {
    const log = [
      event(EventType.RUN_STARTED, { runId: "r1" }),
      event(EventType.TEXT_MESSAGE_START, { messageId: "m1" }),
      event(EventType.TOOL_CALL_START, { toolCallId: "c1" }),
      event(EventType.RUN_ERROR, { message: "aborted" }),
      event(EventType.RUN_STARTED, { runId: "r2" }),
      event(EventType.RUN_FINISHED, { runId: "r2" }),
    ];

    const replay = replayableLog(log, "t1");

    expect(replay.map((e) => e.type)).toEqual([
      EventType.RUN_STARTED,
      EventType.TEXT_MESSAGE_START,
      EventType.TOOL_CALL_START,
      EventType.TOOL_CALL_END,
      EventType.TEXT_MESSAGE_END,
      EventType.RUN_FINISHED,
      EventType.RUN_STARTED,
      EventType.RUN_FINISHED,
    ]);
    expect(replay[5]).toMatchObject({ runId: "r1" });
  });

  it("drops terminal events outside any open run", () => {
    const log = [
      event(EventType.RUN_STARTED),
      event(EventType.RUN_FINISHED),
      event(EventType.RUN_ERROR, { message: "late transport error" }),
      event(EventType.RUN_FINISHED),
    ];
    expect(replayableLog(log, "t1").map((e) => e.type)).toEqual([
      EventType.RUN_STARTED,
      EventType.RUN_FINISHED,
    ]);
  });

  it("leaves a healthy log untouched", () => {
    const log = [
      event(EventType.RUN_STARTED),
      event(EventType.TEXT_MESSAGE_START, { messageId: "m1" }),
      event(EventType.TEXT_MESSAGE_END, { messageId: "m1" }),
      event(EventType.RUN_FINISHED),
    ];
    expect(replayableLog(log, "t1")).toEqual(log);
  });
});

describe("withinLastRun", () => {
  it("puts closing events before the last run's finish", () => {
    const log = [event(EventType.RUN_STARTED), event(EventType.RUN_FINISHED)];
    const closing = [event(EventType.MESSAGES_SNAPSHOT, { messages: [] })];
    expect(withinLastRun(log, closing, "t1").map((e) => e.type)).toEqual([
      EventType.RUN_STARTED,
      EventType.MESSAGES_SNAPSHOT,
      EventType.RUN_FINISHED,
    ]);
  });

  it("wraps closing events in a run of their own when no run finished", () => {
    const closing = [event(EventType.MESSAGES_SNAPSHOT, { messages: [] })];
    expect(withinLastRun([], closing, "t1").map((e) => e.type)).toEqual([
      EventType.RUN_STARTED,
      EventType.MESSAGES_SNAPSHOT,
      EventType.RUN_FINISHED,
    ]);
  });
});
