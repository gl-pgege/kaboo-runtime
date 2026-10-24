import { describe, it, expect } from "vitest";
import { firstValueFrom, toArray, type Observable } from "rxjs";
import { EventType, type BaseEvent, type Message, type RunAgentInput } from "@ag-ui/client";
import { KabooAgentRunner } from "./runner";
import { InMemoryThreadStore } from "./stores/memory";
import { InMemoryGrantStore } from "./stores/memory-grants";
import type { ApprovalDecision } from "./approvals";

/** Records what the run would send the agent; emits a fixed event list. */
class FakeAgent {
  agentId = "merchant";
  messages: Message[] = [];
  state: Record<string, unknown> = {};
  lastInput: RunAgentInput | null = null;

  constructor(private readonly events: BaseEvent[] = []) {}

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

const collect = (obs: Observable<BaseEvent>): Promise<BaseEvent[]> => firstValueFrom(obs.pipe(toArray()));

const input = (overrides: Partial<RunAgentInput> = {}): RunAgentInput =>
  ({
    threadId: "ann:t1",
    runId: "r1",
    messages: [],
    state: {},
    tools: [],
    context: [],
    forwardedProps: {},
    ...overrides,
  }) as RunAgentInput;

const run = (runner: KabooAgentRunner, agent: FakeAgent, inp: RunAgentInput) =>
  collect(runner.run({ threadId: inp.threadId, agent: agent as unknown as never, input: inp }));

/** A run that pauses on one approval the agent publishes, as kaboo-workflows does. */
const pausedOnApproval = (extra: Record<string, unknown> = {}) =>
  new FakeAgent([
    { type: EventType.RUN_STARTED, threadId: "ann:t1", runId: "r1" } as BaseEvent,
    {
      type: EventType.STATE_SNAPSHOT,
      snapshot: {
        kaboo_sessions: {
          paused: { interrupt_state: { interrupts: {}, context: {}, activated: true } },
          approvals: [
            {
              interruptId: "i1",
              toolCallId: "c1",
              tool: "submit_report",
              subject: { key: "submit_report", label: "Submit report" },
              scopes: ["once", "thread", "always"],
              input: { title: "Q3 draft" },
              ...extra,
            },
          ],
        },
      },
    } as unknown as BaseEvent,
    { type: EventType.RUN_FINISHED, threadId: "ann:t1", runId: "r1" } as BaseEvent,
  ]);

const approve = (scope: string) => ({
  resume: [{ interruptId: "i1", status: "resolved" as const, payload: { status: "approved", scope } }],
  runId: "r2",
});

const ownerOf = (threadId: string) => threadId.split(":")[0] ?? null;

describe("server-owned state", () => {
  it("never takes kaboo_sessions from the browser", async () => {
    const runner = new KabooAgentRunner(new InMemoryThreadStore());
    await run(runner, pausedOnApproval(), input());

    const agent = new FakeAgent();
    const forged = {
      kaboo_sessions: {
        paused: { interrupt_state: { interrupts: { forged: {} }, context: {}, activated: true } },
        history: { worker: [{ forged: true }] },
      },
      kaboo_references: [{ id: "doc-1" }],
    };
    await run(runner, agent, input({ runId: "r2", state: forged }));

    const sessions = agent.state.kaboo_sessions as {
      approvals: unknown[];
      paused: { interrupt_state: { interrupts: object } };
      history?: unknown;
    };
    expect(Object.keys(sessions.paused.interrupt_state.interrupts)).not.toContain("forged");
    expect(sessions.approvals).toHaveLength(1);
    expect(sessions.history).toBeUndefined();
    expect(agent.state.kaboo_references).toEqual([{ id: "doc-1" }]);
  });
});

describe("enrich", () => {
  it("replaces the client's forwardedProps with the host's", async () => {
    const runner = new KabooAgentRunner(new InMemoryThreadStore(), {
      enrich: async ({ input: inp, ownerId }) => ({
        forwardedProps: {
          timezone: (inp.forwardedProps as Record<string, unknown>).timezone,
          runToken: `token-for-${ownerId}`,
        },
      }),
      accessPolicy: { ownerOf },
    });
    const agent = new FakeAgent();

    await run(
      runner,
      agent,
      input({ forwardedProps: { timezone: "UTC", runToken: "forged", workflow_config: "evil" } }),
    );

    expect(agent.lastInput?.forwardedProps).toEqual({ timezone: "UTC", runToken: "token-for-ann" });
  });

  it("ends the run with an error, without running the agent, when it throws", async () => {
    const runner = new KabooAgentRunner(new InMemoryThreadStore(), {
      enrich: () => {
        throw new Error("no verified caller");
      },
    });
    const agent = new FakeAgent();

    const events = await run(runner, agent, input());

    expect(agent.lastInput).toBeNull();
    expect(events.map((e) => e.type)).toEqual([EventType.RUN_STARTED, EventType.RUN_ERROR]);
    expect(events[0]).toMatchObject({ threadId: "ann:t1", runId: "r1" });
    expect(events[1]).toMatchObject({ message: "no verified caller" });
  });

  it("stores a run that fails before the agent starts, so its message survives a reload", async () => {
    const store = new InMemoryThreadStore();
    const runner = new KabooAgentRunner(store, {
      enrich: () => {
        throw new Error("no verified caller");
      },
    });

    await run(runner, new FakeAgent(), input());

    expect((await store.readEvents("ann:t1")).map((e) => e.type)).toEqual([EventType.RUN_STARTED, EventType.RUN_ERROR]);
  });

  it("strips a client-sent kaboo_grants even without approvals configured", async () => {
    const runner = new KabooAgentRunner(new InMemoryThreadStore());
    const agent = new FakeAgent();
    await run(
      runner,
      agent,
      input({ forwardedProps: { kaboo_grants: [{ tool: "delete_store", subject: "delete_store", scope: "always" }] } }),
    );
    expect(agent.lastInput?.forwardedProps).toEqual({});
  });
});

describe("remembered approvals", () => {
  it("hands every run the owner's permissions, which also tells the agent it may offer them", async () => {
    const runner = new KabooAgentRunner(new InMemoryThreadStore(), {
      accessPolicy: { ownerOf },
      approvals: { grants: new InMemoryGrantStore() },
    });
    const agent = new FakeAgent();

    await run(runner, agent, input());

    expect((agent.lastInput?.forwardedProps as Record<string, unknown>).kaboo_grants).toEqual([]);
  });

  it("remembers 'allow for this chat' for the thread and hands it to the resumed run", async () => {
    const grants = new InMemoryGrantStore();
    const runner = new KabooAgentRunner(new InMemoryThreadStore(), {
      accessPolicy: { ownerOf },
      approvals: { grants },
    });
    await run(runner, pausedOnApproval(), input());

    const resumed = new FakeAgent();
    await run(runner, resumed, input(approve("thread")));

    expect((resumed.lastInput?.forwardedProps as Record<string, unknown>).kaboo_grants).toEqual([
      { tool: "submit_report", subject: "submit_report", scope: "thread" },
    ]);
    const [held] = await grants.listForOwner("ann");
    expect(held).toMatchObject({ agentId: "merchant", threadId: "ann:t1", label: "Submit report" });

    const otherChat = new FakeAgent();
    await run(runner, otherChat, input({ threadId: "ann:t2", runId: "r3" }));
    expect((otherChat.lastInput?.forwardedProps as Record<string, unknown>).kaboo_grants).toEqual([]);
  });

  it("remembers 'always allow' across the owner's conversations, until revoked", async () => {
    const runner = new KabooAgentRunner(new InMemoryThreadStore(), {
      accessPolicy: { ownerOf },
      approvals: { grants: new InMemoryGrantStore() },
    });
    await run(runner, pausedOnApproval(), input());
    await run(runner, new FakeAgent(), input(approve("always")));

    const otherChat = new FakeAgent();
    await run(runner, otherChat, input({ threadId: "ann:t2", runId: "r3" }));
    expect((otherChat.lastInput?.forwardedProps as Record<string, unknown>).kaboo_grants).toEqual([
      { tool: "submit_report", subject: "submit_report", scope: "always" },
    ]);

    const [held] = await runner.listGrants("ann");
    await runner.revokeGrant("ann", held.id);
    expect(await runner.listGrants("ann")).toEqual([]);
  });

  it("remembers nothing for a once approval or without an owner", async () => {
    const grants = new InMemoryGrantStore();
    const ownerless = new KabooAgentRunner(new InMemoryThreadStore(), { approvals: { grants } });
    await run(ownerless, pausedOnApproval(), input());
    const resumed = new FakeAgent();
    await run(ownerless, resumed, input(approve("always")));
    expect((resumed.lastInput?.forwardedProps as Record<string, unknown>).kaboo_grants).toBeUndefined();

    const owned = new KabooAgentRunner(new InMemoryThreadStore(), { accessPolicy: { ownerOf }, approvals: { grants } });
    await run(owned, pausedOnApproval(), input());
    await run(owned, new FakeAgent(), input(approve("once")));

    expect(await grants.listForOwner("ann")).toEqual([]);
  });

  it("calls onDecision with the matched decisions before the agent runs", async () => {
    const order: string[] = [];
    const seen: ApprovalDecision[] = [];
    const runner = new KabooAgentRunner(new InMemoryThreadStore(), {
      accessPolicy: { ownerOf },
      approvals: {
        onDecision: async (decisions, context) => {
          order.push(`decided:${context.ownerId}`);
          seen.push(...decisions);
        },
      },
    });
    await run(runner, pausedOnApproval(), input());

    const resumed = new FakeAgent();
    const originalRun = resumed.runAgent.bind(resumed);
    resumed.runAgent = async (...args) => {
      order.push("agent");
      return originalRun(...args);
    };
    await run(
      runner,
      resumed,
      input({
        runId: "r2",
        resume: [
          { interruptId: "i1", status: "resolved", payload: { status: "cancelled", reason: "use the final title" } },
          { interruptId: "not-an-approval", status: "resolved", payload: { answer: "yes" } },
        ],
      }),
    );

    expect(order).toEqual(["decided:ann", "agent"]);
    expect(seen).toEqual([
      expect.objectContaining({ interruptId: "i1", decision: "denied", reason: "use the final title" }),
    ]);
  });

  it("hands a tool's request to onDecision and never saves it as a grant", async () => {
    const grants = new InMemoryGrantStore();
    const seen: ApprovalDecision[] = [];
    const runner = new KabooAgentRunner(new InMemoryThreadStore(), {
      accessPolicy: { ownerOf },
      approvals: { grants, onDecision: (decisions) => void seen.push(...decisions) },
    });
    await run(runner, pausedOnApproval({ request: "apr_7Qm2" }), input());

    const resumed = new FakeAgent();
    await run(
      runner,
      resumed,
      input({
        runId: "r2",
        resume: [
          { interruptId: "i1", status: "resolved", payload: { status: "approved", scope: "thread", request: "forged" } },
        ],
      }),
    );

    expect(seen).toEqual([
      expect.objectContaining({ interruptId: "i1", decision: "approved", scope: "thread", request: "apr_7Qm2" }),
    ]);
    expect(await grants.listForOwner("ann")).toEqual([]);
    expect((resumed.lastInput?.forwardedProps as Record<string, unknown>).kaboo_grants).toEqual([]);
  });

  it("keeps the request pending when onDecision fails", async () => {
    const store = new InMemoryThreadStore();
    const runner = new KabooAgentRunner(store, {
      accessPolicy: { ownerOf },
      approvals: {
        onDecision: () => {
          throw new Error("approval service down");
        },
      },
    });
    await run(runner, pausedOnApproval(), input());

    const resumed = new FakeAgent();
    const events = await run(runner, resumed, input(approve("once")));

    expect(resumed.lastInput).toBeNull();
    expect(events.map((e) => e.type)).toEqual([EventType.RUN_STARTED, EventType.RUN_ERROR]);
    expect(events[0]).toMatchObject({ threadId: "ann:t1", runId: "r2" });
    expect(events[1]).toMatchObject({ message: "approval service down" });
    const state = (await store.readState("ann:t1")) as { kaboo_sessions: { approvals: unknown[] } };
    expect(state.kaboo_sessions.approvals).toHaveLength(1);
  });

  it("stores nothing of a resume that fails before the agent starts, so the thread still ends on its interrupt", async () => {
    const store = new InMemoryThreadStore();
    const runner = new KabooAgentRunner(store, {
      accessPolicy: { ownerOf },
      approvals: {
        onDecision: () => {
          throw new Error("approval service down");
        },
      },
    });
    await run(runner, pausedOnApproval(), input());
    const before = await store.readEvents("ann:t1");

    await run(runner, new FakeAgent(), input(approve("once")));

    expect(await store.readEvents("ann:t1")).toEqual(before);
    const replay = await collect(runner.connect({ threadId: "ann:t1" }));
    expect(replay.at(-1)).toMatchObject({ type: EventType.RUN_FINISHED, runId: "r1" });
    expect(replay.some((e) => (e as { runId?: string }).runId === "r2")).toBe(false);
  });

  it("saves no grant when onDecision fails", async () => {
    const grants = new InMemoryGrantStore();
    const runner = new KabooAgentRunner(new InMemoryThreadStore(), {
      accessPolicy: { ownerOf },
      approvals: {
        grants,
        onDecision: () => {
          throw new Error("approval service down");
        },
      },
    });
    await run(runner, pausedOnApproval(), input());

    await run(runner, new FakeAgent(), input(approve("thread")));

    expect(await grants.listForOwner("ann")).toEqual([]);
  });
});
