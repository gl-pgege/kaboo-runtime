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
});
