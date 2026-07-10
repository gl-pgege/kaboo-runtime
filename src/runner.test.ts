import { describe, it, expect } from "vitest";
import { firstValueFrom, toArray, type Observable } from "rxjs";
import { EventType, type BaseEvent, type Message, type RunAgentInput } from "@ag-ui/client";
import { KabooAgentRunner } from "./runner";
import { InMemoryThreadStore } from "./stores/memory";

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

const runReq = (threadId: string, agent: FakeAgent, inp: RunAgentInput) => ({
  threadId,
  agent: agent as unknown as never,
  input: inp,
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
});
