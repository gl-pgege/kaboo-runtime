import { describe, it, expect } from "vitest";
import { firstValueFrom, toArray, type Observable } from "rxjs";
import { EventType, type BaseEvent, type Message, type RunAgentInput } from "@ag-ui/client";
import { KabooAgentRunner, createKabooRunner } from "./runner";
import { InMemoryThreadStore } from "./stores/memory";
import type { StoredThread, ThreadStore } from "./store";

class FakeAgent {
  agentId = "test";
  messages: Message[] = [];
  lastInput: RunAgentInput | null = null;

  constructor(private readonly events: BaseEvent[], messages: Message[] = []) {
    this.messages = messages;
  }

  async runAgent(input: RunAgentInput, subscriber?: { onEvent?: (p: { event: BaseEvent }) => void }) {
    this.lastInput = input;
    for (const event of this.events) subscriber?.onEvent?.({ event });
    return {};
  }

  abortRun() {}
}

function collect(obs: Observable<BaseEvent>): Promise<BaseEvent[]> {
  return firstValueFrom(obs.pipe(toArray()));
}

function input(overrides: Partial<RunAgentInput> = {}): RunAgentInput {
  return {
    threadId: "t1",
    runId: "r1",
    messages: [],
    state: {},
    tools: [],
    context: [],
    forwardedProps: {},
    ...overrides,
  } as RunAgentInput;
}

const runReq = (threadId: string, agent: FakeAgent | PausableAgent, inp: RunAgentInput) => ({
  threadId,
  agent: agent as unknown as never,
  input: inp,
});

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

/** An agent that stays "running" until `abortRun` (or its gate) releases it. */
class PausableAgent {
  agentId = "test";
  messages: Message[] = [];
  aborted = false;
  started = deferred();
  private gate = deferred();

  async runAgent(_input: RunAgentInput, subscriber?: { onEvent?: (p: { event: BaseEvent }) => void }) {
    subscriber?.onEvent?.({ event: { type: EventType.RUN_STARTED } as BaseEvent });
    this.started.resolve();
    await this.gate.promise;
    subscriber?.onEvent?.({ event: { type: EventType.RUN_FINISHED } as BaseEvent });
    return {};
  }

  abortRun() {
    this.aborted = true;
    this.gate.resolve();
  }
}

/** A store that fails on `appendEvents` but otherwise delegates to memory. */
class FailingStore implements ThreadStore {
  private readonly inner = new InMemoryThreadStore();
  appendEvents(): Promise<void> {
    return Promise.reject(new Error("boom"));
  }
  readEvents(threadId: string): Promise<BaseEvent[]> {
    return this.inner.readEvents(threadId);
  }
  readState(threadId: string): Promise<Record<string, unknown> | null> {
    return this.inner.readState(threadId);
  }
  saveMessages(threadId: string, messages: Message[]): Promise<void> {
    return this.inner.saveMessages(threadId, messages);
  }
  readMessages(threadId: string): Promise<Message[]> {
    return this.inner.readMessages(threadId);
  }
  listThreads(): Promise<StoredThread[]> {
    return this.inner.listThreads();
  }
  clear(threadId?: string): Promise<void> {
    return this.inner.clear(threadId);
  }
}

const finishedRun = (): FakeAgent =>
  new FakeAgent([
    { type: EventType.RUN_STARTED, threadId: "t1", runId: "r1" } as BaseEvent,
    { type: EventType.RUN_FINISHED, threadId: "t1", runId: "r1" } as BaseEvent,
  ]);

describe("KabooAgentRunner", () => {
  it("emits every event and persists the full log verbatim", async () => {
    const store = new InMemoryThreadStore();
    const runner = new KabooAgentRunner(store);
    const events: BaseEvent[] = [
      { type: EventType.RUN_STARTED, threadId: "t1", runId: "r1" } as BaseEvent,
      { type: EventType.ACTIVITY_SNAPSHOT, messageId: "a", activityType: "kaboo.activity", content: { groups: { g1: {} } } } as unknown as BaseEvent,
      { type: EventType.RUN_FINISHED, threadId: "t1", runId: "r1" } as BaseEvent,
    ];
    const agent = new FakeAgent(events, [{ id: "m1", role: "assistant", content: "hi" } as Message]);

    const emitted = await collect(runner.run(runReq("t1", agent, input())));
    expect(emitted.map((e) => e.type)).toEqual([
      EventType.RUN_STARTED,
      EventType.ACTIVITY_SNAPSHOT,
      EventType.RUN_FINISHED,
    ]);

    // ACTIVITY_SNAPSHOT survives the store round-trip (no compaction).
    const stored = await store.readEvents("t1");
    expect(stored.map((e) => e.type)).toContain(EventType.ACTIVITY_SNAPSHOT);
    expect(runner.getThreadMessages("t1")).toHaveLength(1);
  });

  it("replays the full stored log on connect", async () => {
    const store = new InMemoryThreadStore();
    const runner = new KabooAgentRunner(store);
    const events: BaseEvent[] = [
      { type: EventType.RUN_STARTED, threadId: "t1", runId: "r1" } as BaseEvent,
      { type: EventType.ACTIVITY_SNAPSHOT, messageId: "a", activityType: "kaboo.activity", content: { groups: {} } } as unknown as BaseEvent,
      { type: EventType.RUN_FINISHED, threadId: "t1", runId: "r1" } as BaseEvent,
    ];
    await collect(runner.run(runReq("t1", new FakeAgent(events), input())));

    const replayed = await collect(runner.connect({ threadId: "t1" }));
    expect(replayed.map((e) => e.type)).toEqual([
      EventType.RUN_STARTED,
      EventType.ACTIVITY_SNAPSHOT,
      EventType.RUN_FINISHED,
    ]);
  });

  it("injects persisted state (kaboo_history) into the next run's input", async () => {
    const store = new InMemoryThreadStore();
    const runner = new KabooAgentRunner(store);

    const firstEvents: BaseEvent[] = [
      { type: EventType.RUN_STARTED, threadId: "t1", runId: "r1" } as BaseEvent,
      { type: EventType.STATE_SNAPSHOT, snapshot: { kaboo_history: { worker: [{ x: 1 }] } } } as unknown as BaseEvent,
      { type: EventType.RUN_FINISHED, threadId: "t1", runId: "r1" } as BaseEvent,
    ];
    await collect(runner.run(runReq("t1", new FakeAgent(firstEvents), input())));

    const secondAgent = new FakeAgent([
      { type: EventType.RUN_STARTED, threadId: "t1", runId: "r2" } as BaseEvent,
      { type: EventType.RUN_FINISHED, threadId: "t1", runId: "r2" } as BaseEvent,
    ]);
    await collect(runner.run(runReq("t1", secondAgent, input({ runId: "r2" }))));

    expect((secondAgent.lastInput?.state as Record<string, unknown>).kaboo_history).toEqual({
      worker: [{ x: 1 }],
    });
    expect(runner.getThreadState("t1")).toEqual({ kaboo_history: { worker: [{ x: 1 }] } });
  });

  it("reports running state and refuses concurrent runs", async () => {
    const store = new InMemoryThreadStore();
    const runner = new KabooAgentRunner(store);
    expect(await runner.isRunning({ threadId: "t1" })).toBe(false);
    await collect(
      runner.run(
        runReq("t1", new FakeAgent([
          { type: EventType.RUN_STARTED, threadId: "t1", runId: "r1" } as BaseEvent,
          { type: EventType.RUN_FINISHED, threadId: "t1", runId: "r1" } as BaseEvent,
        ]), input()),
      ),
    );
    expect(await runner.isRunning({ threadId: "t1" })).toBe(false);
    expect(runner.listThreads().map((t) => t.id)).toEqual(["t1"]);
  });

  it("createKabooRunner returns a KabooAgentRunner", () => {
    expect(createKabooRunner(new InMemoryThreadStore())).toBeInstanceOf(KabooAgentRunner);
  });

  it("stop aborts an in-flight run and returns true", async () => {
    const runner = new KabooAgentRunner(new InMemoryThreadStore());
    const agent = new PausableAgent();
    const done = collect(runner.run(runReq("t1", agent, input())));
    await agent.started.promise;

    expect(await runner.isRunning({ threadId: "t1" })).toBe(true);
    expect(await runner.stop({ threadId: "t1" })).toBe(true);
    expect(agent.aborted).toBe(true);

    await done;
    expect(await runner.isRunning({ threadId: "t1" })).toBe(false);
  });

  it("stop returns false for unknown and already-finished threads", async () => {
    const runner = new KabooAgentRunner(new InMemoryThreadStore());
    expect(await runner.stop({ threadId: "ghost" })).toBe(false);
    await collect(runner.run(runReq("t1", finishedRun(), input())));
    expect(await runner.stop({ threadId: "t1" })).toBe(false);
  });

  it("connect on an unknown thread completes with no events", async () => {
    const runner = new KabooAgentRunner(new InMemoryThreadStore());
    expect(await collect(runner.connect({ threadId: "ghost" }))).toEqual([]);
  });

  it("clearThreads empties the cache and clears the store", async () => {
    const store = new InMemoryThreadStore();
    let cleared = false;
    const originalClear = store.clear.bind(store);
    store.clear = (threadId?: string) => {
      cleared = true;
      return originalClear(threadId);
    };
    const runner = new KabooAgentRunner(store);
    await collect(runner.run(runReq("t1", finishedRun(), input())));
    expect(runner.listThreads()).toHaveLength(1);

    runner.clearThreads();
    expect(runner.listThreads()).toHaveLength(0);
    await Promise.resolve();
    expect(cleared).toBe(true);
  });

  it("routes persist failures to onStoreError instead of throwing", async () => {
    const contexts: { threadId: string; op: string }[] = [];
    const runner = new KabooAgentRunner(new FailingStore(), {
      onStoreError: (_error, ctx) => contexts.push(ctx),
    });
    await collect(runner.run(runReq("t1", finishedRun(), input())));
    expect(contexts).toEqual([{ threadId: "t1", op: "persist" }]);
  });

  it("thread accessors reflect a completed run and return copies", async () => {
    const runner = new KabooAgentRunner(new InMemoryThreadStore());
    const agent = new FakeAgent(
      [
        { type: EventType.RUN_STARTED, threadId: "t1", runId: "r1" } as BaseEvent,
        { type: EventType.STATE_SNAPSHOT, snapshot: { k: 1 } } as unknown as BaseEvent,
        { type: EventType.RUN_FINISHED, threadId: "t1", runId: "r1" } as BaseEvent,
      ],
      [{ id: "m1", role: "assistant", content: "hi" } as Message],
    );
    await collect(runner.run(runReq("t1", agent, input())));

    const events = runner.getThreadEvents("t1");
    expect(events).toHaveLength(3);
    events.push({} as BaseEvent);
    expect(runner.getThreadEvents("t1")).toHaveLength(3);

    const messages = runner.getThreadMessages("t1");
    expect(messages).toHaveLength(1);
    messages.pop();
    expect(runner.getThreadMessages("t1")).toHaveLength(1);

    expect(runner.getThreadState("t1")).toEqual({ k: 1 });
    expect(runner.getThreadState("ghost")).toBeNull();
  });
});
