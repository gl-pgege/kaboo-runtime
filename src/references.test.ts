import { describe, it, expect } from "vitest";
import { firstValueFrom, toArray, type Observable } from "rxjs";
import { EventType, type BaseEvent, type Message, type RunAgentInput } from "@ag-ui/client";
import { KabooAgentRunner } from "./runner";
import { InMemoryThreadStore } from "./stores/memory";

class FakeAgent {
  agentId = "test";
  messages: Message[] = [];

  constructor(private readonly events: BaseEvent[], messages: Message[] = []) {
    this.messages = messages;
  }

  async runAgent(_input: RunAgentInput, subscriber?: { onEvent?: (p: { event: BaseEvent }) => void }) {
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

// Mirrors the InputContent parts kaboo-react emits (see serialize.ts): a URL
// attachment and a base64/data attachment, each stamping kaboo_* metadata.
const multimodalUserMessage = (): Message =>
  ({
    id: "u1",
    role: "user",
    content: [
      { type: "text", text: "Compare these [file:file_1] [file:file_2]" },
      {
        type: "image",
        source: { type: "url", value: "https://cdn.example/a.png", mimeType: "image/png" },
        metadata: { kaboo_id: "file_1", kaboo_kind: "file", kaboo_name: "a.png", filename: "a.png" },
      },
      {
        type: "document",
        source: { type: "data", value: "JVBERi0xLjQK", mimeType: "application/pdf" },
        metadata: { kaboo_id: "file_2", kaboo_kind: "file", kaboo_name: "spec.pdf", filename: "spec.pdf" },
      },
    ],
  }) as unknown as Message;

const RUN_START = { type: EventType.RUN_STARTED, threadId: "t1", runId: "r1" } as BaseEvent;
const RUN_FINISH = { type: EventType.RUN_FINISHED, threadId: "t1", runId: "r1" } as BaseEvent;

describe("multimodal InputContent round-trip", () => {
  it("persists a user message's InputContent parts verbatim (url + base64)", async () => {
    const store = new InMemoryThreadStore();
    const runner = new KabooAgentRunner(store);
    const message = multimodalUserMessage();
    const agent = new FakeAgent([RUN_START, RUN_FINISH], [message]);

    await collect(runner.run(runReq("t1", agent, input())));

    // The message snapshot the backend reloads via readMessages keeps every
    // part — no flattening of content to a string, metadata intact.
    const persisted = await store.readMessages("t1");
    expect(persisted).toEqual([message]);
    const parts = persisted[0].content as unknown as Array<Record<string, unknown>>;
    expect(parts).toHaveLength(3);
    expect(parts[1].source).toEqual({ type: "url", value: "https://cdn.example/a.png", mimeType: "image/png" });
    expect(parts[2].source).toEqual({ type: "data", value: "JVBERi0xLjQK", mimeType: "application/pdf" });
    expect(parts[1].metadata).toMatchObject({ kaboo_id: "file_1", kaboo_kind: "file", kaboo_name: "a.png" });
  });

  it("replays InputContent parts from the event log on reload (connect)", async () => {
    const store = new InMemoryThreadStore();
    const message = multimodalUserMessage();
    const snapshot = {
      type: EventType.MESSAGES_SNAPSHOT,
      messages: [message],
    } as unknown as BaseEvent;

    await collect(
      new KabooAgentRunner(store).run(
        runReq("t1", new FakeAgent([RUN_START, snapshot, RUN_FINISH]), input()),
      ),
    );

    // A fresh runner over the same store models a page reload: connect() replays
    // the stored event log, and the multimodal content survives unchanged.
    const replayed = await collect(new KabooAgentRunner(store).connect({ threadId: "t1" }));
    const replayedSnapshot = replayed.find((e) => e.type === EventType.MESSAGES_SNAPSHOT) as
      | (BaseEvent & { messages: Message[] })
      | undefined;
    expect(replayedSnapshot).toBeDefined();
    expect(replayedSnapshot!.messages[0]).toEqual(message);
  });
});
