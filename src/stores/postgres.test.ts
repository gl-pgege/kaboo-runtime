import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { EventType, type BaseEvent, type Message } from "@ag-ui/client";
import { PostgresThreadStore } from "./postgres";

const event = (type: EventType, extra: Record<string, unknown> = {}): BaseEvent =>
  ({ type, ...extra }) as unknown as BaseEvent;

describe("PostgresThreadStore (no DB required)", () => {
  it("throws when neither dsn nor pool is provided", () => {
    expect(() => new PostgresThreadStore({})).toThrow(/dsn.*pool/i);
  });
});

const dsn = process.env.DATABASE_URL;

describe.skipIf(!dsn)("PostgresThreadStore (DATABASE_URL)", () => {
  let store: PostgresThreadStore;
  const tid = `test-${Date.now()}`;

  beforeAll(() => {
    store = new PostgresThreadStore({ dsn: dsn! });
  });

  afterAll(async () => {
    await store.clear();
  });

  it("creates the tables and round-trips events verbatim and in order", async () => {
    await store.appendEvents(tid, "agentA", [
      event(EventType.RUN_STARTED),
      event(EventType.STATE_SNAPSHOT, { snapshot: { k: 1 } }),
      event(EventType.RUN_FINISHED),
    ]);
    const events = await store.readEvents(tid);
    expect(events.map((e) => e.type)).toEqual([
      EventType.RUN_STARTED,
      EventType.STATE_SNAPSHOT,
      EventType.RUN_FINISHED,
    ]);
  });

  it("derives state from the last STATE_SNAPSHOT", async () => {
    expect(await store.readState(tid)).toEqual({ k: 1 });
  });

  it("round-trips messages", async () => {
    const messages = [{ id: "m1", role: "assistant", content: "hi" }] as Message[];
    await store.saveMessages(tid, messages);
    expect(await store.readMessages(tid)).toEqual(messages);
  });

  it("lists threads most-recently-updated first", async () => {
    const tid2 = `test2-${Date.now()}`;
    await store.appendEvents(tid2, "agentB", [event(EventType.RUN_STARTED)]);
    const ids = (await store.listThreads()).map((t) => t.id);
    expect(ids[0]).toBe(tid2);
    await store.clear(tid2);
  });

  it("clear(id) deletes only that thread", async () => {
    await store.clear(tid);
    expect(await store.readEvents(tid)).toEqual([]);
  });

  it("prunes superseded ACTIVITY_SNAPSHOT events on append", async () => {
    const t = `${tid}-snap`;
    const snap = (messageId: string, step: number): BaseEvent =>
      ({ type: "ACTIVITY_SNAPSHOT", messageId, content: { step }, replace: true }) as unknown as BaseEvent;
    await store.appendEvents(t, "agentA", [event(EventType.RUN_STARTED), snap("m1", 1)]);
    await store.appendEvents(t, "agentA", [snap("m1", 2), snap("m2", 1), event(EventType.RUN_FINISHED)]);
    const events = await store.readEvents(t);
    expect(events.map((e) => e.type)).toEqual([
      EventType.RUN_STARTED,
      "ACTIVITY_SNAPSHOT",
      "ACTIVITY_SNAPSHOT",
      EventType.RUN_FINISHED,
    ]);
    const snaps = events.filter((e) => e.type === "ACTIVITY_SNAPSHOT") as Array<
      BaseEvent & { messageId: string; content: { step: number } }
    >;
    expect(snaps.map((s) => [s.messageId, s.content.step])).toEqual([
      ["m1", 2],
      ["m2", 1],
    ]);
  });

  it("persists events whose strings contain \\u0000 and lone surrogates", async () => {
    const dirty = `dirty-${Date.now()}`;
    // Postgres jsonb rejects both of these outright; without sanitization the
    // insert throws `unsupported Unicode escape sequence`.
    await store.appendEvents(dirty, "agentA", [
      event(EventType.RUN_STARTED),
      event(EventType.CUSTOM, { name: "tool_output", value: "before\u0000after \ud800 tail" }),
      event(EventType.RUN_FINISHED),
    ]);
    const events = await store.readEvents(dirty);
    expect(events).toHaveLength(3);
    const custom = events[1] as BaseEvent & { value?: string };
    expect(custom.value).toContain("before");
    expect(custom.value).toContain("after");
    expect(custom.value).not.toContain("\u0000");

    await store.saveMessages(dirty, [
      { id: "m1", role: "assistant", content: "nul\u0000here" } as Message,
    ]);
    const messages = (await store.readMessages(dirty)) as (Message & { content?: string })[];
    expect(messages[0].content).toBe("nulhere");
    await store.clear(dirty);
  });

  it("records the owner, preserves it on nullish appends, and scopes the list", async () => {
    const owned = `owned-${Date.now()}`;
    const other = `other-${Date.now()}`;
    await store.appendEvents(owned, "agentA", [event(EventType.RUN_STARTED)], "alice");
    await store.appendEvents(owned, "agentA", [event(EventType.RUN_FINISHED)]);
    await store.appendEvents(other, "agentA", [event(EventType.RUN_STARTED)], "bob");

    const all = await store.listThreads();
    expect(all.find((t) => t.id === owned)?.ownerId).toBe("alice");

    const alices = await store.listThreads({ ownerId: "alice" });
    expect(alices.map((t) => t.id)).toEqual([owned]);

    await store.clear(owned);
    await store.clear(other);
  });
});
