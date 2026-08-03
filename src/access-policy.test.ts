import { describe, it, expect } from "vitest";
import { firstValueFrom, toArray, type Observable } from "rxjs";
import { EventType, type BaseEvent, type Message, type RunAgentInput } from "@ag-ui/client";
import { KabooAgentRunner } from "./runner";
import { InMemoryThreadStore } from "./stores/memory";

class FakeAgent {
  agentId = "test";
  messages: Message[] = [];

  constructor(private readonly events: BaseEvent[]) {}

  async runAgent(_input: RunAgentInput, subscriber?: { onEvent?: (p: { event: BaseEvent }) => void }) {
    for (const event of this.events) subscriber?.onEvent?.({ event });
    return {};
  }

  abortRun() {}
}

const EVENTS: BaseEvent[] = [
  { type: EventType.RUN_STARTED } as BaseEvent,
  { type: EventType.RUN_FINISHED } as BaseEvent,
];

function input(threadId: string): RunAgentInput {
  return {
    threadId,
    runId: "r1",
    messages: [],
    state: {},
    tools: [],
    context: [],
    forwardedProps: {},
  } as RunAgentInput;
}

function collect(obs: Observable<BaseEvent>): Promise<BaseEvent[]> {
  return firstValueFrom(obs.pipe(toArray()));
}

async function runThread(runner: KabooAgentRunner, threadId: string): Promise<void> {
  await collect(
    runner.run({ threadId, agent: new FakeAgent(EVENTS) as unknown as never, input: input(threadId) }),
  );
}

// Owner convention used by these tests: "<owner>__<rest>".
const ownerOf = (threadId: string) => threadId.split("__")[0] || null;

describe("store ownership", () => {
  it("records the owner and preserves it on later nullish appends", async () => {
    const store = new InMemoryThreadStore();
    await store.appendEvents("t1", "a", EVENTS, "alice");
    await store.appendEvents("t1", "a", EVENTS);
    const [thread] = await store.listThreads();
    expect(thread.ownerId).toBe("alice");
  });

  it("scopes listThreads by ownerId", async () => {
    const store = new InMemoryThreadStore();
    await store.appendEvents("t1", "a", EVENTS, "alice");
    await store.appendEvents("t2", "a", EVENTS, "bob");
    await store.appendEvents("t3", "a", EVENTS);
    expect((await store.listThreads()).length).toBe(3);
    const alices = await store.listThreads({ ownerId: "alice" });
    expect(alices.map((t) => t.id)).toEqual(["t1"]);
  });
});

describe("runner access policy", () => {
  it("persists ownerOf's subject and surfaces it as createdById", async () => {
    const store = new InMemoryThreadStore();
    const runner = new KabooAgentRunner(store, { accessPolicy: { ownerOf } });
    await runThread(runner, "alice__t1");
    await runThread(runner, "bob__t2");

    const listed = runner.listThreads();
    const byId = new Map(listed.map((t) => [t.id, t.createdById]));
    expect(byId.get("alice__t1")).toBe("alice");
    expect(byId.get("bob__t2")).toBe("bob");

    const stored = await store.listThreads({ ownerId: "alice" });
    expect(stored.map((t) => t.id)).toEqual(["alice__t1"]);
  });

  it("hydrates owners from the store after a cold start", async () => {
    const store = new InMemoryThreadStore();
    await store.appendEvents("alice__t1", "a", EVENTS, "alice");
    const runner = new KabooAgentRunner(store); // no ownerOf: owner comes from the store
    await runner.hydrate();
    expect(runner.listThreads()[0].createdById).toBe("alice");
  });

  it("createdById is empty without a recorded owner or policy", async () => {
    const runner = new KabooAgentRunner(new InMemoryThreadStore());
    await runThread(runner, "t1");
    expect(runner.listThreads()[0].createdById).toBe("");
  });

  it("clearThreads throws when allowClearAll is false", async () => {
    const store = new InMemoryThreadStore();
    const runner = new KabooAgentRunner(store, { accessPolicy: { allowClearAll: false } });
    await runThread(runner, "t1");
    expect(() => runner.clearThreads()).toThrow(/allowClearAll/);
    expect((await store.listThreads()).length).toBe(1);
  });

  it("clearThreads still works by default", async () => {
    const store = new InMemoryThreadStore();
    const runner = new KabooAgentRunner(store, { accessPolicy: { ownerOf } });
    await runThread(runner, "alice__t1");
    runner.clearThreads();
    expect(runner.listThreads()).toEqual([]);
  });
});
