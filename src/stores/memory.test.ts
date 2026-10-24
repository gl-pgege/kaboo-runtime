import { describe, it, expect } from "vitest";
import { EventType, type BaseEvent } from "@ag-ui/client";
import { InMemoryThreadStore } from "./memory";

const event = (type: string, extra: Record<string, unknown> = {}): BaseEvent =>
  ({ type, ...extra }) as unknown as BaseEvent;

const run = (runId: string, text: string[]): BaseEvent[] => [
  event(EventType.RUN_STARTED, { threadId: "t", runId }),
  event(EventType.TEXT_MESSAGE_START, { messageId: `m-${runId}`, role: "assistant" }),
  ...text.map((delta) => event(EventType.TEXT_MESSAGE_CONTENT, { messageId: `m-${runId}`, delta })),
  event(EventType.TEXT_MESSAGE_END, { messageId: `m-${runId}` }),
  event(EventType.STATE_SNAPSHOT, { snapshot: { count: 1 } }),
  event(EventType.STATE_DELTA, { delta: [{ op: "replace", path: "/count", value: 2 }] }),
  event(EventType.RUN_FINISHED, { threadId: "t", runId }),
];

describe("InMemoryThreadStore.compactRun", () => {
  it("joins a finished run's deltas in place and leaves later runs alone", async () => {
    const store = new InMemoryThreadStore();
    await store.appendEvents("t", "a", run("r1", ["Hel", "lo"]));
    await store.appendEvents("t", "a", run("r2", ["Bye", "!"]));

    await store.compactRun("t", "r1");

    const events = await store.readEvents("t");
    const firstRun = events.slice(0, events.findIndex((e) => e.type === EventType.RUN_FINISHED) + 1);
    expect(firstRun.filter((e) => e.type === EventType.TEXT_MESSAGE_CONTENT)).toMatchObject([{ delta: "Hello" }]);
    expect(firstRun.filter((e) => e.type === EventType.STATE_DELTA)).toEqual([]);
    expect(events.slice(firstRun.length)).toEqual(run("r2", ["Bye", "!"]));
    expect(await store.readState("t")).toEqual({ count: 2 });
  });

  it("leaves a run that has not finished alone", async () => {
    const store = new InMemoryThreadStore();
    const open = run("r1", ["a", "b"]).slice(0, -1);
    await store.appendEvents("t", "a", open);
    await store.compactRun("t", "r1");
    expect(await store.readEvents("t")).toEqual(open);
  });
});
