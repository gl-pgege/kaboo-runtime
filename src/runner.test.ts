import { describe, it, expect } from "vitest";
import { firstValueFrom, toArray, type Observable } from "rxjs";
import { EventType, type BaseEvent, type Message, type RunAgentInput } from "@ag-ui/client";
import { KabooAgentRunner, createKabooRunner, MESSAGE_META_EVENT } from "./runner";
import { InMemoryThreadStore } from "./stores/memory";
import type { StoredThread, ThreadStore } from "./store";

class FakeAgent {
  agentId = "test";
  messages: Message[] = [];
  lastInput: RunAgentInput | null = null;
  // The real AbstractAgent sends `this.state`, not `input.state`, so the double
  // has to model both to be worth anything.
  state: Record<string, unknown> = {};

  constructor(private readonly events: BaseEvent[], messages: Message[] = []) {
    this.messages = messages;
  }

  setState(state: Record<string, unknown>) {
    this.state = state;
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

/**
 * A store that rejects any batch containing a "poison" CUSTOM event, whether
 * batched or alone — modeling e.g. Postgres refusing an event's JSON.
 */
class PoisonRejectingStore extends InMemoryThreadStore {
  appendEvents(
    threadId: string,
    agentId: string,
    events: BaseEvent[],
    ownerId?: string | null,
  ): Promise<void> {
    if (events.some((e) => (e as { name?: string }).name === "poison")) {
      return Promise.reject(new Error("unsupported Unicode escape sequence"));
    }
    return super.appendEvents(threadId, agentId, events, ownerId);
  }
}

/** A store that rejects every write while `down` is true. */
class OutageStore extends InMemoryThreadStore {
  down = true;
  appendEvents(
    threadId: string,
    agentId: string,
    events: BaseEvent[],
    ownerId?: string | null,
  ): Promise<void> {
    if (this.down) return Promise.reject(new Error("store down"));
    return super.appendEvents(threadId, agentId, events, ownerId);
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

  it("recovers messages the event log lost (run failed before the agent emitted)", async () => {
    const store = new InMemoryThreadStore();
    // A startup failure persists only RUN_STARTED / RUN_ERROR, while the
    // message snapshot (saved even on failure) still has the user's message.
    await store.appendEvents("t1", "test", [
      { type: EventType.RUN_STARTED, threadId: "t1", runId: "r1" } as BaseEvent,
      { type: EventType.RUN_ERROR, message: "invalid workflow config" } as unknown as BaseEvent,
    ]);
    await store.saveMessages("t1", [{ id: "u1", role: "user", content: "build a dashboard" } as Message]);

    const replayed = await collect(new KabooAgentRunner(store).connect({ threadId: "t1" }));
    expect(replayed.map((e) => e.type)).toEqual([
      EventType.RUN_STARTED,
      EventType.RUN_ERROR,
      EventType.MESSAGES_SNAPSHOT,
    ]);
    const snapshot = replayed[2] as BaseEvent & { messages: Message[] };
    expect(snapshot.messages.map((m) => m.id)).toEqual(["u1"]);
  });

  it("does not append a snapshot when the log already covers every message", async () => {
    const store = new InMemoryThreadStore();
    await store.appendEvents("t1", "test", [
      { type: EventType.RUN_STARTED, threadId: "t1", runId: "r1" } as BaseEvent,
      {
        type: EventType.MESSAGES_SNAPSHOT,
        messages: [{ id: "u1", role: "user", content: "hi" }],
      } as unknown as BaseEvent,
      { type: EventType.TEXT_MESSAGE_START, messageId: "a1", role: "assistant" } as unknown as BaseEvent,
      { type: EventType.TEXT_MESSAGE_END, messageId: "a1" } as unknown as BaseEvent,
      { type: EventType.RUN_FINISHED, threadId: "t1", runId: "r1" } as BaseEvent,
    ]);
    await store.saveMessages("t1", [
      { id: "u1", role: "user", content: "hi" } as Message,
      { id: "a1", role: "assistant", content: "yo" } as Message,
    ]);

    const replayed = await collect(new KabooAgentRunner(store).connect({ threadId: "t1" }));
    expect(replayed.filter((e) => e.type === EventType.MESSAGES_SNAPSHOT)).toHaveLength(1);
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
    // What actually goes on the wire: AbstractAgent builds its payload from the
    // agent's own state and ignores input.state, so the merge has to land here.
    expect(secondAgent.state.kaboo_history).toEqual({ worker: [{ x: 1 }] });
    expect(runner.getThreadState("t1")).toEqual({ kaboo_history: { worker: [{ x: 1 }] } });
  });

  it("replays a pending interrupt so an approval survives an agent restart", async () => {
    const store = new InMemoryThreadStore();
    const runner = new KabooAgentRunner(store);

    const paused = {
      interrupt_state: {
        interrupts: { "int-1": { id: "int-1", reason: "approve payment" } },
        context: {},
        activated: true,
      },
    };
    await collect(
      runner.run(
        runReq(
          "t1",
          new FakeAgent([
            { type: EventType.RUN_STARTED, threadId: "t1", runId: "r1" } as BaseEvent,
            {
              type: EventType.STATE_SNAPSHOT,
              snapshot: { kaboo_session: paused },
            } as unknown as BaseEvent,
            { type: EventType.RUN_FINISHED, threadId: "t1", runId: "r1" } as BaseEvent,
          ]),
          input(),
        ),
      ),
    );

    // A fresh agent, as after a restart of the agent service: it knows nothing
    // about the gate, so the runner has to hand it back.
    const resumed = new FakeAgent([
      { type: EventType.RUN_STARTED, threadId: "t1", runId: "r2" } as BaseEvent,
      { type: EventType.RUN_FINISHED, threadId: "t1", runId: "r2" } as BaseEvent,
    ]);
    await collect(runner.run(runReq("t1", resumed, input({ runId: "r2" }))));

    expect(resumed.state.kaboo_session).toEqual(paused);
  });

  it("lets the caller's state win over the persisted copy", async () => {
    const store = new InMemoryThreadStore();
    const runner = new KabooAgentRunner(store);
    await collect(
      runner.run(
        runReq(
          "t1",
          new FakeAgent([
            { type: EventType.STATE_SNAPSHOT, snapshot: { seat: "stored", keep: 1 } } as unknown as BaseEvent,
          ]),
          input(),
        ),
      ),
    );

    const next = new FakeAgent([]);
    await collect(runner.run(runReq("t1", next, input({ state: { seat: "caller" } }))));

    expect(next.state).toEqual({ seat: "caller", keep: 1 });
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
    expect(contexts.length).toBeGreaterThanOrEqual(1);
    expect(contexts).toContainEqual({ threadId: "t1", op: "persist" });
  });

  it("drops a poison event the store rejects and persists the rest of the log", async () => {
    const store = new PoisonRejectingStore();
    const errors: unknown[] = [];
    const runner = new KabooAgentRunner(store, {
      onStoreError: (error) => errors.push(error),
    });
    const agent = new FakeAgent([
      { type: EventType.RUN_STARTED, threadId: "t1", runId: "r1" } as BaseEvent,
      { type: EventType.CUSTOM, name: "poison", value: "x" } as unknown as BaseEvent,
      { type: EventType.RUN_FINISHED, threadId: "t1", runId: "r1" } as BaseEvent,
    ]);
    await collect(runner.run(runReq("t1", agent, input())));

    const persisted = await store.readEvents("t1");
    expect(persisted.map((e) => e.type)).toEqual([
      EventType.RUN_STARTED,
      EventType.RUN_FINISHED,
    ]);
    expect(errors.some((e) => String(e).includes("dropped event"))).toBe(true);
  });

  it("keeps the whole batch buffered while the store is down and flushes on recovery", async () => {
    const store = new OutageStore();
    const runner = new KabooAgentRunner(store, { onStoreError: () => {} });
    const agent = new PausableAgent();
    const done = collect(runner.run(runReq("t1", agent, input())));
    await agent.started.promise;
    await settle();
    expect(await store.readEvents("t1")).toEqual([]);

    store.down = false;
    agent.abortRun();
    await done;
    await settle();
    const types = (await store.readEvents("t1")).map((e) => e.type);
    expect(types[0]).toBe(EventType.RUN_STARTED);
    expect(types).toContain(EventType.RUN_FINISHED);
  });

  it("thread accessors reflect a completed run and return copies", async () => {
    const store = new InMemoryThreadStore();
    const runner = new KabooAgentRunner(store);
    const agent = new FakeAgent(
      [
        { type: EventType.RUN_STARTED, threadId: "t1", runId: "r1" } as BaseEvent,
        { type: EventType.STATE_SNAPSHOT, snapshot: { k: 1 } } as unknown as BaseEvent,
        { type: EventType.RUN_FINISHED, threadId: "t1", runId: "r1" } as BaseEvent,
      ],
      [{ id: "m1", role: "assistant", content: "hi" } as Message],
    );
    await collect(runner.run(runReq("t1", agent, input())));

    // Events are not retained in memory once persisted: the sync accessor only
    // sees an in-flight run's unpersisted tail; the store has the full log.
    expect(runner.getThreadEvents("t1")).toEqual([]);
    expect(await store.readEvents("t1")).toHaveLength(3);

    const messages = runner.getThreadMessages("t1");
    expect(messages).toHaveLength(1);
    messages.pop();
    expect(runner.getThreadMessages("t1")).toHaveLength(1);

    expect(runner.getThreadState("t1")).toEqual({ k: 1 });
    expect(runner.getThreadState("ghost")).toBeNull();
  });

  it("stamps a timestamp on every emitted and persisted event", async () => {
    const store = new InMemoryThreadStore();
    const runner = new KabooAgentRunner(store);
    const before = Date.now();

    const emitted = await collect(runner.run(runReq("t1", finishedRun(), input())));
    for (const event of emitted) {
      expect(event.timestamp).toBeTypeOf("number");
      expect(event.timestamp).toBeGreaterThanOrEqual(before);
    }
    const stored = await store.readEvents("t1");
    for (const event of stored) expect(event.timestamp).toBeTypeOf("number");
  });

  it("preserves timestamps already present on events", async () => {
    const runner = new KabooAgentRunner(new InMemoryThreadStore());
    const agent = new FakeAgent([
      { type: EventType.RUN_STARTED, threadId: "t1", runId: "r1", timestamp: 42 } as BaseEvent,
      { type: EventType.RUN_FINISHED, threadId: "t1", runId: "r1" } as BaseEvent,
    ]);
    const emitted = await collect(runner.run(runReq("t1", agent, input())));
    expect(emitted[0].timestamp).toBe(42);
  });

  it("emits message meta (with references) for new user messages, after RUN_STARTED", async () => {
    const store = new InMemoryThreadStore();
    const runner = new KabooAgentRunner(store);
    const refs = [{ transport: "object", kind: "database", id: "db1", name: "assets-db" }];
    const inp = input({
      messages: [{ id: "u1", role: "user", content: "hi" } as Message],
      state: { kaboo_references: refs },
    });

    const emitted = await collect(runner.run(runReq("t1", finishedRun(), inp)));
    expect(emitted.map((e) => e.type)).toEqual([
      EventType.RUN_STARTED,
      EventType.CUSTOM,
      EventType.RUN_FINISHED,
    ]);
    const meta = emitted[1] as BaseEvent & { name: string; value: Record<string, unknown> };
    expect(meta.name).toBe(MESSAGE_META_EVENT);
    expect(meta.value.messageId).toBe("u1");
    expect(meta.value.role).toBe("user");
    expect(meta.value.createdAt).toBeTypeOf("number");
    expect(meta.value.references).toEqual(refs);

    // Persisted verbatim, so replay carries it.
    const replayed = await collect(runner.connect({ threadId: "t1" }));
    expect(replayed.map((e) => e.type)).toContain(EventType.CUSTOM);
  });

  it("does not re-emit meta for messages already known from prior runs", async () => {
    const runner = new KabooAgentRunner(new InMemoryThreadStore());
    const u1 = { id: "u1", role: "user", content: "hi" } as Message;
    const u2 = { id: "u2", role: "user", content: "again" } as Message;

    // First run persists u1 in the derived message snapshot.
    const first = new FakeAgent(
      [
        { type: EventType.RUN_STARTED, threadId: "t1", runId: "r1" } as BaseEvent,
        { type: EventType.RUN_FINISHED, threadId: "t1", runId: "r1" } as BaseEvent,
      ],
      [u1, { id: "a1", role: "assistant", content: "yo" } as Message],
    );
    await collect(runner.run(runReq("t1", first, input({ messages: [u1] }))));

    const second = new FakeAgent([
      { type: EventType.RUN_STARTED, threadId: "t1", runId: "r2" } as BaseEvent,
      { type: EventType.RUN_FINISHED, threadId: "t1", runId: "r2" } as BaseEvent,
    ]);
    const emitted = await collect(
      runner.run(runReq("t1", second, input({ runId: "r2", messages: [u1, u2] }))),
    );
    const metas = emitted.filter(
      (e) => e.type === EventType.CUSTOM && (e as BaseEvent & { name: string }).name === MESSAGE_META_EVENT,
    ) as (BaseEvent & { value: Record<string, unknown> })[];
    expect(metas).toHaveLength(1);
    expect(metas[0].value.messageId).toBe("u2");
  });
});

/** Let pending microtasks (write-behind flushes) settle. */
const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** An agent that streams a first half, waits on a gate, then finishes. */
class TwoPhaseAgent {
  agentId = "test";
  messages: Message[] = [];
  gate = deferred();
  started = deferred();

  constructor(
    private readonly firstHalf: BaseEvent[],
    private readonly secondHalf: BaseEvent[],
  ) {}

  async runAgent(_input: RunAgentInput, subscriber?: { onEvent?: (p: { event: BaseEvent }) => void }) {
    for (const event of this.firstHalf) subscriber?.onEvent?.({ event });
    this.started.resolve();
    await this.gate.promise;
    for (const event of this.secondHalf) subscriber?.onEvent?.({ event });
    return {};
  }

  abortRun() {
    this.gate.resolve();
  }
}

describe("KabooAgentRunner write-behind persistence", () => {
  it("persists events incrementally while the run is still streaming", async () => {
    const store = new InMemoryThreadStore();
    const runner = new KabooAgentRunner(store);
    const agent = new TwoPhaseAgent(
      [
        { type: EventType.RUN_STARTED, threadId: "t1", runId: "r1" } as BaseEvent,
        { type: EventType.TEXT_MESSAGE_START, messageId: "m1" } as BaseEvent,
      ],
      [
        { type: EventType.TEXT_MESSAGE_END, messageId: "m1" } as BaseEvent,
        { type: EventType.RUN_FINISHED, threadId: "t1", runId: "r1" } as BaseEvent,
      ],
    );
    const done = collect(runner.run(runReq("t1", agent as unknown as FakeAgent, input())));
    await agent.started.promise;
    await settle();

    // A crash at this point would still have the first half durable.
    const durable = await store.readEvents("t1");
    expect(durable.map((e) => e.type)).toEqual([EventType.RUN_STARTED, EventType.TEXT_MESSAGE_START]);
    expect(await runner.isRunning({ threadId: "t1" })).toBe(true);

    agent.gate.resolve();
    await done;
    expect((await store.readEvents("t1")).map((e) => e.type)).toEqual([
      EventType.RUN_STARTED,
      EventType.TEXT_MESSAGE_START,
      EventType.TEXT_MESSAGE_END,
      EventType.RUN_FINISHED,
    ]);
  });

  it("connect mid-run replays prior turns plus the live run without gaps or duplicates", async () => {
    const store = new InMemoryThreadStore();
    const runner = new KabooAgentRunner(store);
    await collect(runner.run(runReq("t1", finishedRun(), input())));

    const agent = new TwoPhaseAgent(
      [
        { type: EventType.RUN_STARTED, threadId: "t1", runId: "r2" } as BaseEvent,
        { type: EventType.TEXT_MESSAGE_START, messageId: "m2" } as BaseEvent,
      ],
      [
        { type: EventType.TEXT_MESSAGE_END, messageId: "m2" } as BaseEvent,
        { type: EventType.RUN_FINISHED, threadId: "t1", runId: "r2" } as BaseEvent,
      ],
    );
    const done = collect(
      runner.run(runReq("t1", agent as unknown as FakeAgent, input({ runId: "r2" }))),
    );
    await agent.started.promise;
    await settle();

    const replay = collect(runner.connect({ threadId: "t1" }));
    await settle();
    agent.gate.resolve();
    await done;

    expect((await replay).map((e) => e.type)).toEqual([
      // prior turn from the store
      EventType.RUN_STARTED,
      EventType.RUN_FINISHED,
      // in-flight run: persisted prefix + live tail, exactly once each
      EventType.RUN_STARTED,
      EventType.TEXT_MESSAGE_START,
      EventType.TEXT_MESSAGE_END,
      EventType.RUN_FINISHED,
    ]);
  });

  it("seals a dangling run (crash mid-run) on replay and persists the seal", async () => {
    const store = new InMemoryThreadStore();
    // A log as left behind by a crash: message and run never closed.
    await store.appendEvents("t1", "kaboo", [
      { type: EventType.RUN_STARTED, threadId: "t1", runId: "r1" } as BaseEvent,
      { type: EventType.TEXT_MESSAGE_START, messageId: "m1" } as BaseEvent,
      { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "m1", delta: "hal" } as unknown as BaseEvent,
    ]);
    const runner = new KabooAgentRunner(store);
    await runner.hydrate();

    const replayed = await collect(runner.connect({ threadId: "t1" }));
    expect(replayed.map((e) => e.type)).toEqual([
      EventType.RUN_STARTED,
      EventType.TEXT_MESSAGE_START,
      EventType.TEXT_MESSAGE_CONTENT,
      EventType.TEXT_MESSAGE_END,
      EventType.RUN_ERROR,
    ]);

    // The seal is persisted, so the next replay reads a well-formed log
    // directly and synthesizes nothing new.
    await settle();
    const again = await collect(runner.connect({ threadId: "t1" }));
    expect(again.map((e) => e.type)).toEqual([
      EventType.RUN_STARTED,
      EventType.TEXT_MESSAGE_START,
      EventType.TEXT_MESSAGE_CONTENT,
      EventType.TEXT_MESSAGE_END,
      EventType.RUN_ERROR,
    ]);
  });

  it("does not seal a healthy log or an in-flight run", async () => {
    const store = new InMemoryThreadStore();
    const runner = new KabooAgentRunner(store);
    await collect(runner.run(runReq("t1", finishedRun(), input())));
    const replayed = await collect(runner.connect({ threadId: "t1" }));
    expect(replayed.map((e) => e.type)).toEqual([EventType.RUN_STARTED, EventType.RUN_FINISHED]);

    const agent = new TwoPhaseAgent(
      [{ type: EventType.RUN_STARTED, threadId: "t1", runId: "r2" } as BaseEvent],
      [{ type: EventType.RUN_FINISHED, threadId: "t1", runId: "r2" } as BaseEvent],
    );
    const done = collect(
      runner.run(runReq("t1", agent as unknown as FakeAgent, input({ runId: "r2" }))),
    );
    await agent.started.promise;
    await settle();
    const midRun = collect(runner.connect({ threadId: "t1" }));
    await settle();
    agent.gate.resolve();
    await done;
    const types = (await midRun).map((e) => e.type);
    expect(types.filter((t) => t === EventType.RUN_ERROR)).toHaveLength(0);
    expect(types.filter((t) => t === EventType.RUN_FINISHED)).toHaveLength(2);
  });
});
