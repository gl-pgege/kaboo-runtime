import { describe, it, expect } from "vitest";
import { EventType, type BaseEvent } from "@ag-ui/client";
import { InMemoryThreadStore } from "./memory";
import { pruneSupersededActivitySnapshots } from "../store";

const event = (type: string, extra: Record<string, unknown> = {}): BaseEvent =>
  ({ type, ...extra }) as unknown as BaseEvent;

const snapshot = (messageId: string, content: unknown): BaseEvent =>
  event("ACTIVITY_SNAPSHOT", { messageId, content, replace: true });

describe("pruneSupersededActivitySnapshots", () => {
  it("keeps only the last snapshot per message, preserving order", () => {
    const events = [
      event(EventType.RUN_STARTED),
      snapshot("m1", { step: 1 }),
      event(EventType.TEXT_MESSAGE_START, { messageId: "t1" }),
      snapshot("m1", { step: 2 }),
      snapshot("m2", { step: 1 }),
      snapshot("m1", { step: 3 }),
      event(EventType.RUN_FINISHED),
    ];
    const pruned = pruneSupersededActivitySnapshots(events);
    expect(pruned.map((e) => e.type)).toEqual([
      EventType.RUN_STARTED,
      EventType.TEXT_MESSAGE_START,
      "ACTIVITY_SNAPSHOT",
      "ACTIVITY_SNAPSHOT",
      EventType.RUN_FINISHED,
    ]);
    const snaps = pruned.filter((e) => e.type === "ACTIVITY_SNAPSHOT") as Array<
      BaseEvent & { messageId: string; content: { step: number } }
    >;
    expect(snaps.map((s) => [s.messageId, s.content.step])).toEqual([
      ["m2", 1],
      ["m1", 3],
    ]);
  });

  it("passes through logs without snapshots untouched", () => {
    const events = [event(EventType.RUN_STARTED), event(EventType.RUN_FINISHED)];
    expect(pruneSupersededActivitySnapshots(events)).toBe(events);
  });
});

describe("InMemoryThreadStore snapshot pruning", () => {
  it("prunes superseded snapshots across appends", async () => {
    const store = new InMemoryThreadStore();
    await store.appendEvents("t", "a", [event(EventType.RUN_STARTED), snapshot("m1", { step: 1 })]);
    await store.appendEvents("t", "a", [snapshot("m1", { step: 2 }), event(EventType.RUN_FINISHED)]);
    const events = await store.readEvents("t");
    expect(events.map((e) => e.type)).toEqual([
      EventType.RUN_STARTED,
      "ACTIVITY_SNAPSHOT",
      EventType.RUN_FINISHED,
    ]);
    expect((events[1] as BaseEvent & { content: { step: number } }).content.step).toBe(2);
  });
});
