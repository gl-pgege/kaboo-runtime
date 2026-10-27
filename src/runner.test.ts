import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { firstValueFrom, from, toArray, type Observable } from "rxjs";
import { EventType, verifyEvents, type BaseEvent, type Message, type RunAgentInput } from "@ag-ui/client";
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
  compactRun(threadId: string, runId: string): Promise<void> {
    return this.inner.compactRun(threadId, runId);
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

const finishedRun = (runId = "r1"): FakeAgent =>
  new FakeAgent([
    { type: EventType.RUN_STARTED, threadId: "t1", runId } as BaseEvent,
    { type: EventType.RUN_FINISHED, threadId: "t1", runId } as BaseEvent,
  ]);

class ContinuingAgent extends FakeAgent {
  runs = 0;
  constructor(private readonly rounds: BaseEvent[][]) {
    super([]);
  }
  async runAgent(input: RunAgentInput, subscriber?: { onEvent?: (p: { event: BaseEvent }) => void }) {
    this.lastInput = input;
    for (const event of this.rounds[this.runs] ?? []) subscriber?.onEvent?.({ event });
    this.runs += 1;
    return {};
  }
}

describe("KabooAgentRunner MCP Apps requests", () => {
  it("lets the agent go on when the run answered the calls it ended waiting on", async () => {
    const ev = (event: Record<string, unknown>) => event as unknown as BaseEvent;
    const agent = new ContinuingAgent([
      [
        ev({ type: EventType.RUN_STARTED, threadId: "t1", runId: "r1" }),
        ev({ type: EventType.TOOL_CALL_START, toolCallId: "c1", toolCallName: "partner_benchmarks" }),
        ev({ type: EventType.TOOL_CALL_END, toolCallId: "c1" }),
        ev({ type: EventType.TOOL_CALL_RESULT, messageId: "m1", toolCallId: "c1", content: "{}" }),
        ev({ type: EventType.RUN_FINISHED, threadId: "t1", runId: "r1", outcome: { type: "success", pendingToolCallIds: ["c1"] } }),
      ],
      [
        ev({ type: EventType.RUN_STARTED, threadId: "t1", runId: "r2" }),
        ev({ type: EventType.TEXT_MESSAGE_START, messageId: "t", role: "assistant" }),
        ev({ type: EventType.TEXT_MESSAGE_CONTENT, messageId: "t", delta: "Above the median." }),
        ev({ type: EventType.TEXT_MESSAGE_END, messageId: "t" }),
        ev({ type: EventType.RUN_FINISHED, threadId: "t1", runId: "r2", outcome: { type: "success" } }),
      ],
    ]);
    const runner = new KabooAgentRunner(new InMemoryThreadStore());

    const emitted = await collect(runner.run(runReq("t1", agent as unknown as FakeAgent, input())));

    expect(agent.runs).toBe(2);
    expect(emitted.filter((e) => e.type === EventType.RUN_STARTED)).toHaveLength(1);
    const finishes = emitted.filter((e) => e.type === EventType.RUN_FINISHED);
    expect(finishes).toHaveLength(1);
    expect(finishes[0]).toMatchObject({ runId: "r1", outcome: { type: "success" } });
    expect(emitted.some((e) => (e as { delta?: string }).delta === "Above the median.")).toBe(true);
  });

  it("ends the run as it is when a call is still waiting for the browser", async () => {
    const ev = (event: Record<string, unknown>) => event as unknown as BaseEvent;
    const agent = new ContinuingAgent([
      [
        ev({ type: EventType.RUN_STARTED, threadId: "t1", runId: "r1" }),
        ev({ type: EventType.TOOL_CALL_START, toolCallId: "q1", toolCallName: "ask_user" }),
        ev({ type: EventType.TOOL_CALL_END, toolCallId: "q1" }),
        ev({ type: EventType.RUN_FINISHED, threadId: "t1", runId: "r1", outcome: { type: "success", pendingToolCallIds: ["q1"] } }),
      ],
    ]);
    const runner = new KabooAgentRunner(new InMemoryThreadStore());

    const emitted = await collect(runner.run(runReq("t1", agent as unknown as FakeAgent, input())));

    expect(agent.runs).toBe(1);
    expect(emitted.at(-1)).toMatchObject({ type: EventType.RUN_FINISHED, outcome: { pendingToolCallIds: ["q1"] } });
  });

  it("passes an MCP App's proxied request straight through, outside the thread", async () => {
    const store = new InMemoryThreadStore();
    let enriched = 0;
    const runner = new KabooAgentRunner(store, { enrich: async () => (enriched++, {}) });
    const events: BaseEvent[] = [
      { type: EventType.RUN_STARTED, threadId: "t1", runId: "p1" } as BaseEvent,
      { type: EventType.RUN_FINISHED, threadId: "t1", runId: "p1", result: { content: [] } } as BaseEvent,
    ];
    const proxied = input({
      runId: "p1",
      forwardedProps: { __proxiedMCPRequest: { serverId: "partner", method: "tools/call", params: {} } },
    });

    const emitted = await collect(runner.run(runReq("t1", new FakeAgent(events), proxied)));

    expect(emitted.map((e) => e.type)).toEqual([EventType.RUN_STARTED, EventType.RUN_FINISHED]);
    expect(await store.readEvents("t1")).toEqual([]);
    expect(enriched).toBe(0);
  });
});

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
      { type: EventType.ACTIVITY_SNAPSHOT, messageId: "a", activityType: "a2ui-surface", content: { groups: {} } } as unknown as BaseEvent,
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

  it("replays only what a client still needs: the last snapshots, joined deltas, no legacy activity", async () => {
    const store = new InMemoryThreadStore();
    const runner = new KabooAgentRunner(store);
    const turn = (runId: string, text: string): BaseEvent[] => [
      { type: EventType.RUN_STARTED, threadId: "t1", runId } as BaseEvent,
      { type: EventType.ACTIVITY_DELTA, messageId: "a", activityType: "kaboo.activity", patch: [] } as unknown as BaseEvent,
      { type: EventType.STATE_SNAPSHOT, snapshot: { turn: runId } } as BaseEvent,
      { type: EventType.MESSAGES_SNAPSHOT, messages: [] } as BaseEvent,
      { type: EventType.REASONING_MESSAGE_START, messageId: `why-${runId}`, role: "reasoning" } as BaseEvent,
      { type: EventType.REASONING_MESSAGE_CONTENT, messageId: `why-${runId}`, delta: "think" } as BaseEvent,
      { type: EventType.REASONING_MESSAGE_CONTENT, messageId: `why-${runId}`, delta: "ing" } as BaseEvent,
      { type: EventType.REASONING_MESSAGE_END, messageId: `why-${runId}` } as BaseEvent,
      { type: EventType.TEXT_MESSAGE_START, messageId: `m-${runId}`, role: "assistant" } as BaseEvent,
      ...[...text].map((delta) => ({ type: EventType.TEXT_MESSAGE_CONTENT, messageId: `m-${runId}`, delta }) as BaseEvent),
      { type: EventType.TEXT_MESSAGE_END, messageId: `m-${runId}` } as BaseEvent,
      { type: EventType.RUN_FINISHED, threadId: "t1", runId } as BaseEvent,
    ];
    await store.appendEvents("t1", "default", [...turn("r1", "one"), ...turn("r2", "two")]);

    const replayed = await collect(runner.connect({ threadId: "t1" }));

    expect(replayed.some((e) => (e as { activityType?: string }).activityType === "kaboo.activity")).toBe(false);
    expect(replayed.filter((e) => e.type === EventType.MESSAGES_SNAPSHOT)).toHaveLength(1);
    expect(replayed.filter((e) => e.type === EventType.STATE_SNAPSHOT)).toEqual([
      expect.objectContaining({ snapshot: { turn: "r2" } }),
    ]);
    expect(replayed.filter((e) => e.type === EventType.TEXT_MESSAGE_CONTENT).map((e) => (e as BaseEvent & { delta?: string }).delta)).toEqual(["one", "two"]);
    expect(replayed.filter((e) => e.type === EventType.REASONING_MESSAGE_CONTENT).map((e) => (e as BaseEvent & { delta?: string }).delta)).toEqual(["thinking", "thinking"]);
  });

  it("stores the deltas of one batch as one row", async () => {
    const store = new InMemoryThreadStore();
    const appended: BaseEvent[][] = [];
    const append = store.appendEvents.bind(store);
    store.appendEvents = (threadId, agentId, events, ownerId) => {
      appended.push(events);
      return append(threadId, agentId, events, ownerId);
    };
    const runner = new KabooAgentRunner(store);
    const events: BaseEvent[] = [
      { type: EventType.RUN_STARTED, threadId: "t1", runId: "r1" } as BaseEvent,
      { type: EventType.TEXT_MESSAGE_START, messageId: "m", role: "assistant" } as BaseEvent,
      { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "m", delta: "a" } as BaseEvent,
      { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "m", delta: "b" } as BaseEvent,
      { type: EventType.TEXT_MESSAGE_END, messageId: "m" } as BaseEvent,
      { type: EventType.RUN_FINISHED, threadId: "t1", runId: "r1" } as BaseEvent,
    ];

    await collect(runner.run(runReq("t1", new FakeAgent(events), input())));

    const deltas = appended.flat().filter((e) => e.type === EventType.TEXT_MESSAGE_CONTENT);
    expect(deltas.map((e) => (e as BaseEvent & { delta?: string }).delta).join("")).toBe("ab");
    expect(deltas.length).toBeLessThan(2);
  });

  it("tells the host when a run has ended, with how it ended", async () => {
    const ends: unknown[] = [];
    const runner = new KabooAgentRunner(new InMemoryThreadStore(), { onRunEnd: (end) => void ends.push(end) });
    const events: BaseEvent[] = [
      { type: EventType.RUN_STARTED, threadId: "t1", runId: "r1" } as BaseEvent,
      { type: EventType.RUN_ERROR, message: "boom" } as BaseEvent,
    ];

    await collect(runner.run(runReq("t1", new FakeAgent(events), input())));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(ends).toEqual([{ threadId: "t1", runId: input().runId, outcome: "failed" }]);
  });

  it("drains: waits for runs in flight before a host shuts down", async () => {
    const runner = new KabooAgentRunner(new InMemoryThreadStore());
    expect(await runner.drain(10)).toBe(true);
  });

  it("keeps the messages of the most recent idle threads only, reading the others again when needed", async () => {
    const store = new InMemoryThreadStore();
    const runner = new KabooAgentRunner(store, { maxCachedThreads: 1 });
    const turn = (threadId: string): BaseEvent[] => [
      { type: EventType.RUN_STARTED, threadId, runId: `r-${threadId}` } as BaseEvent,
      { type: EventType.RUN_FINISHED, threadId, runId: `r-${threadId}` } as BaseEvent,
    ];
    const reply = [{ id: "m1", role: "assistant", content: "hi" } as Message];

    await collect(runner.run(runReq("t1", new FakeAgent(turn("t1"), reply), input())));
    await new Promise((resolve) => setTimeout(resolve, 5));
    await collect(runner.run(runReq("t2", new FakeAgent(turn("t2"), reply), input())));

    expect(runner.getThreadMessages("t2")).toHaveLength(1);
    expect(runner.getThreadMessages("t1")).toHaveLength(0);
    expect(await store.readMessages("t1")).toHaveLength(1);
  });

  it("stores a recorded lab run compacted, and replays it as a stream AG-UI accepts with the same sub-agents", async () => {
    const recorded = readFileSync(join(process.cwd(), "src/__fixtures__/delegate-dashboard.jsonl"), "utf8")
      .trim()
      .split("\n")
      .map((line) => {
        const { at: _at, ...event } = JSON.parse(line) as Record<string, unknown>;
        return event as unknown as BaseEvent;
      });
    const { threadId, runId } = recorded[0] as unknown as { threadId: string; runId: string };
    const runner = new KabooAgentRunner(new InMemoryThreadStore());
    await collect(runner.run(runReq(threadId, new FakeAgent(recorded), input({ threadId, runId }))));

    const replayed = await collect(runner.connect({ threadId }));
    await expect(firstValueFrom(from(replayed).pipe(verifyEvents(false), toArray()))).resolves.toHaveLength(replayed.length);
    expect(replayed.length).toBeLessThan(recorded.length);
    const subagents = (events: BaseEvent[]) =>
      events.filter((e) => e.type === EventType.SUBAGENT_STARTED).map((e) => (e as { subagentRunId?: string }).subagentRunId);
    expect(subagents(replayed)).toEqual(subagents(recorded));
  });

  it("replays the message of a run that failed before the agent said anything", async () => {
    const store = new InMemoryThreadStore();
    const runner = new KabooAgentRunner(store, {
      enrich: () => {
        throw new Error("invalid workflow config");
      },
    });
    const ask = { id: "u1", role: "user", content: "build a dashboard" } as Message;
    await collect(runner.run(runReq("t1", new FakeAgent([]), input({ messages: [ask] }))));

    const replayed = await collect(new KabooAgentRunner(store).connect({ threadId: "t1" }));
    expect(replayed[0]).toMatchObject({ type: EventType.RUN_STARTED, input: { messages: [ask] } });
    expect(replayed.at(-1)).toMatchObject({ type: EventType.RUN_FINISHED });
  });

  it("stamps RUN_STARTED with the messages the run adds, never its props or state", async () => {
    const runner = new KabooAgentRunner(new InMemoryThreadStore());
    const older = { id: "u1", role: "user", content: "hi" } as Message;
    const newer = { id: "u2", role: "user", content: "and now?" } as Message;
    const first = finishedRun();
    first.messages = [older];
    await collect(runner.run(runReq("t1", first, input({ messages: [older] }))));

    const events = await collect(
      runner.run(
        runReq(
          "t1",
          finishedRun("r2"),
          input({ runId: "r2", messages: [older, newer], forwardedProps: { runToken: "secret" }, state: { a: 1 } }),
        ),
      ),
    );
    const started = events[0] as BaseEvent & { input: RunAgentInput };
    expect(started.input.messages).toEqual([newer]);
    expect(started.input.forwardedProps).toEqual({});
    expect(started.input.state).toEqual({});
  });

  it("injects persisted state (kaboo_sessions) into the next run's input", async () => {
    const store = new InMemoryThreadStore();
    const runner = new KabooAgentRunner(store);

    const firstEvents: BaseEvent[] = [
      { type: EventType.RUN_STARTED, threadId: "t1", runId: "r1" } as BaseEvent,
      { type: EventType.STATE_SNAPSHOT, snapshot: { kaboo_sessions: { worker: [{ x: 1 }] } } } as unknown as BaseEvent,
      { type: EventType.RUN_FINISHED, threadId: "t1", runId: "r1" } as BaseEvent,
    ];
    await collect(runner.run(runReq("t1", new FakeAgent(firstEvents), input())));

    const secondAgent = new FakeAgent([
      { type: EventType.RUN_STARTED, threadId: "t1", runId: "r2" } as BaseEvent,
      { type: EventType.RUN_FINISHED, threadId: "t1", runId: "r2" } as BaseEvent,
    ]);
    await collect(runner.run(runReq("t1", secondAgent, input({ runId: "r2" }))));

    expect((secondAgent.lastInput?.state as Record<string, unknown>).kaboo_sessions).toEqual({
      worker: [{ x: 1 }],
    });
    // What actually goes on the wire: AbstractAgent builds its payload from the
    // agent's own state and ignores input.state, so the merge has to land here.
    expect(secondAgent.state.kaboo_sessions).toEqual({ worker: [{ x: 1 }] });
    expect(runner.getThreadState("t1")).toEqual({});
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
              type: EventType.STATE_DELTA,
              delta: [{ op: "add", path: "/kaboo_sessions", value: { paused } }],
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

    expect(resumed.state.kaboo_sessions).toEqual({ paused });
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

  it("stop with another run's id leaves the active run running", async () => {
    const runner = new KabooAgentRunner(new InMemoryThreadStore());
    const agent = new PausableAgent();
    const done = collect(runner.run(runReq("t1", agent, input({ runId: "r2" }))));
    await agent.started.promise;

    expect(await runner.stop({ threadId: "t1", runId: "r1" })).toBe(false);
    expect(agent.aborted).toBe(false);
    expect(await runner.stop({ threadId: "t1", runId: "r2" })).toBe(true);
    expect(agent.aborted).toBe(true);

    await done;
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

    const sealedReplay = [
      EventType.RUN_STARTED,
      EventType.TEXT_MESSAGE_START,
      EventType.TEXT_MESSAGE_CONTENT,
      EventType.TEXT_MESSAGE_END,
      EventType.CUSTOM,
      EventType.RUN_FINISHED,
    ];
    const replayed = await collect(runner.connect({ threadId: "t1" }));
    expect(replayed.map((e) => e.type)).toEqual(sealedReplay);

    // The seal is persisted, so the next replay reads a well-formed log
    // directly and synthesizes nothing new.
    await settle();
    expect((await store.readEvents("t1")).map((e) => e.type).at(-1)).toBe(EventType.RUN_ERROR);
    const again = await collect(runner.connect({ threadId: "t1" }));
    expect(again.map((e) => e.type)).toEqual(sealedReplay);
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

/** An agent that, like an aborted HttpAgent, stops streaming without a terminal event. */
class StoppableAgent {
  agentId = "test";
  messages: Message[] = [];
  started = deferred();
  private gate = deferred();

  async runAgent(_input: RunAgentInput, subscriber?: { onEvent?: (p: { event: BaseEvent }) => void }) {
    const send = (event: Record<string, unknown>) => subscriber?.onEvent?.({ event: event as unknown as BaseEvent });
    send({ type: EventType.RUN_STARTED, threadId: "t1", runId: "r1", protocolVersion: "1.0" });
    send({ type: EventType.TEXT_MESSAGE_START, messageId: "m1", role: "assistant" });
    this.started.resolve();
    await this.gate.promise;
    return {};
  }

  abortRun() {
    this.gate.resolve();
  }
}

/** An agent whose client, like HttpAgent, reports an abort as a RUN_ERROR of its own. */
class AbortReportingAgent extends StoppableAgent {
  private report?: (event: BaseEvent) => void;

  async runAgent(input: RunAgentInput, subscriber?: { onEvent?: (p: { event: BaseEvent }) => void }) {
    this.report = (event) => subscriber?.onEvent?.({ event });
    return super.runAgent(input, subscriber);
  }

  abortRun() {
    this.report?.({ type: EventType.RUN_ERROR, message: "This operation was aborted", code: "abort" } as unknown as BaseEvent);
    super.abortRun();
  }
}

const stateEvent = (snapshot: Record<string, unknown>) =>
  ({ type: EventType.STATE_SNAPSHOT, snapshot }) as unknown as BaseEvent;

describe("KabooAgentRunner run lifecycle", () => {
  it("ends a stopped run as cancelled, closing what it left open", async () => {
    const runner = new KabooAgentRunner(new InMemoryThreadStore());
    const agent = new StoppableAgent();
    const done = collect(runner.run(runReq("t1", agent as unknown as FakeAgent, input())));
    await agent.started.promise;
    await runner.stop({ threadId: "t1" });

    const events = await done;
    expect(events.slice(-2).map((e) => e.type)).toEqual([EventType.TEXT_MESSAGE_END, EventType.RUN_FINISHED]);
    expect(events.at(-1)).toMatchObject({ outcome: { type: "cancelled" } });
  });

  it("ends a stopped run as cancelled even when the client reports the abort as an error", async () => {
    const runner = new KabooAgentRunner(new InMemoryThreadStore());
    const agent = new AbortReportingAgent();
    const done = collect(runner.run(runReq("t1", agent as unknown as FakeAgent, input())));
    await agent.started.promise;
    await runner.stop({ threadId: "t1" });

    const events = await done;
    expect(events.map((e) => e.type)).not.toContain(EventType.RUN_ERROR);
    expect(events.at(-1)).toMatchObject({ type: EventType.RUN_FINISHED, outcome: { type: "cancelled" } });
  });

  it("compacts a finished run in the store", async () => {
    const store = new InMemoryThreadStore();
    const runner = new KabooAgentRunner(store);
    await collect(
      runner.run(
        runReq(
          "t1",
          new FakeAgent([
            { type: EventType.RUN_STARTED, threadId: "t1", runId: "r1" } as BaseEvent,
            { type: EventType.TEXT_MESSAGE_START, messageId: "m1", role: "assistant" } as unknown as BaseEvent,
            { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "m1", delta: "Hel" } as unknown as BaseEvent,
            { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "m1", delta: "lo" } as unknown as BaseEvent,
            { type: EventType.TEXT_MESSAGE_END, messageId: "m1" } as unknown as BaseEvent,
            { type: EventType.RUN_FINISHED, threadId: "t1", runId: "r1" } as BaseEvent,
          ]),
          input(),
        ),
      ),
    );
    await settle();
    const stored = await store.readEvents("t1");
    expect(stored.filter((e) => e.type === EventType.TEXT_MESSAGE_CONTENT)).toMatchObject([{ delta: "Hello" }]);
  });
});

describe("KabooAgentRunner state ownership", () => {
  it("never takes a server key from the browser, and lets the host set one", async () => {
    const runner = new KabooAgentRunner(new InMemoryThreadStore(), {
      enrich: () => ({ state: { kaboo_workspace: { focus: "d_1" } } }),
    });
    const agent = finishedRun();
    await collect(
      runner.run(
        runReq("t1", agent, input({ state: { kaboo_workspace: { forged: true }, kaboo_sessions: { forged: true }, picked: 1 } })),
      ),
    );
    expect(agent.state).toEqual({ kaboo_workspace: { focus: "d_1" }, picked: 1 });
  });

  it("keeps hidden keys from the browser, live and on replay, but stores them", async () => {
    const store = new InMemoryThreadStore();
    const runner = new KabooAgentRunner(store);
    const live = await collect(
      runner.run(
        runReq(
          "t1",
          new FakeAgent([
            { type: EventType.RUN_STARTED, threadId: "t1", runId: "r1" } as BaseEvent,
            stateEvent({ kaboo_sessions: { lead: [1] }, kaboo_workspace: { focus: "d_1" } }),
            { type: EventType.STATE_DELTA, delta: [{ op: "add", path: "/kaboo_sessions/analyst", value: [2] }] } as unknown as BaseEvent,
            {
              type: EventType.STATE_DELTA,
              delta: [
                { op: "add", path: "/kaboo_sessions/visualizer", value: [3] },
                { op: "replace", path: "/kaboo_workspace/focus", value: "d_2" },
              ],
            } as unknown as BaseEvent,
            { type: EventType.RUN_FINISHED, threadId: "t1", runId: "r1" } as BaseEvent,
          ]),
          input(),
        ),
      ),
    );
    const replayed = await collect(runner.connect({ threadId: "t1" }));

    for (const events of [live, replayed]) {
      expect(JSON.stringify(events)).not.toContain("kaboo_sessions");
    }
    expect(live.filter((e) => e.type === EventType.STATE_DELTA)).toMatchObject([
      { delta: [{ op: "replace", path: "/kaboo_workspace/focus", value: "d_2" }] },
    ]);
    expect(runner.getThreadState("t1")).toEqual({ kaboo_workspace: { focus: "d_2" } });
    expect(await store.readState("t1")).toEqual({
      kaboo_sessions: { lead: [1], analyst: [2], visualizer: [3] },
      kaboo_workspace: { focus: "d_2" },
    });
  });

  it("folds state deltas into the state the next run starts with", async () => {
    const runner = new KabooAgentRunner(new InMemoryThreadStore());
    await collect(
      runner.run(
        runReq(
          "t1",
          new FakeAgent([
            { type: EventType.RUN_STARTED, threadId: "t1", runId: "r1" } as BaseEvent,
            stateEvent({ kaboo_workspace: { changes: [] } }),
            { type: EventType.STATE_DELTA, delta: [{ op: "add", path: "/kaboo_workspace/changes/-", value: "plotted w_3" }] } as unknown as BaseEvent,
            { type: EventType.RUN_FINISHED, threadId: "t1", runId: "r1" } as BaseEvent,
          ]),
          input(),
        ),
      ),
    );
    const next = finishedRun("r2");
    await collect(runner.run(runReq("t1", next, input({ runId: "r2" }))));
    expect(next.state).toEqual({ kaboo_workspace: { changes: ["plotted w_3"] } });
  });
});
