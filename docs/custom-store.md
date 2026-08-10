# Custom store

When neither `InMemoryThreadStore` nor `PostgresThreadStore` fits, implement the
`ThreadStore` interface against your own datastore. A store is just seven async
methods.

## The contract

- **Store events verbatim.** `appendEvents` must preserve order and never drop or
  compact events — the full UI is reconstructed from them.
- **Derive state, don't invent it.** `readState` should return the last
  `STATE_SNAPSHOT`; use the exported `deriveState` helper so behavior matches the
  built-in stores. This one is not optional: the state you return is replayed into
  the next run, and it carries pending human-in-the-loop approvals, so a store
  that loses it loses approvals across a restart.
- **`listThreads` is most-recent-first.**
- **`clear(id?)`** deletes one thread when given an id, or all threads when
  omitted.

## Implement `ThreadStore`

This `JsonFileThreadStore` persists every thread to one JSON file. It is the
runnable [`examples/custom-store`](https://github.com/gl-pgege/kaboo-runtime/tree/main/examples/custom-store)
and is kept in sync with this guide by a drift check:

<!-- source: examples/custom-store/src/store.ts#custom-store -->
```ts
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import type { BaseEvent, Message } from "@ag-ui/client";
import {
  deriveState,
  type ListThreadsFilter,
  type StoredThread,
  type ThreadStore,
} from "@pgege/kaboo-runtime";

interface Row {
  agentId: string;
  ownerId: string | null;
  events: BaseEvent[];
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

/**
 * A minimal ThreadStore that persists every thread to a single JSON file.
 * Demonstrates the extension point — events are stored verbatim and state is
 * derived with `deriveState`. Not tuned for concurrency or scale.
 *
 * `readState` is load-bearing rather than optional: the runner replays what it
 * returns into the next run, which is how a paused human-in-the-loop approval
 * (`kaboo_session`) survives the agent process restarting.
 */
export class JsonFileThreadStore implements ThreadStore {
  private readonly data: Record<string, Row>;

  constructor(private readonly file: string) {
    this.data = existsSync(file)
      ? (JSON.parse(readFileSync(file, "utf8")) as Record<string, Row>)
      : {};
  }

  private flush(): void {
    writeFileSync(this.file, JSON.stringify(this.data));
  }

  private row(threadId: string, agentId: string): Row {
    let row = this.data[threadId];
    if (!row) {
      const now = Date.now();
      row = { agentId, ownerId: null, events: [], messages: [], createdAt: now, updatedAt: now };
      this.data[threadId] = row;
    }
    return row;
  }

  async appendEvents(
    threadId: string,
    agentId: string,
    events: BaseEvent[],
    ownerId?: string | null,
  ): Promise<void> {
    const row = this.row(threadId, agentId);
    row.agentId = agentId;
    if (ownerId != null) row.ownerId = ownerId;
    row.events.push(...events);
    row.updatedAt = Date.now();
    this.flush();
  }

  async readEvents(threadId: string): Promise<BaseEvent[]> {
    return [...(this.data[threadId]?.events ?? [])];
  }

  async readState(threadId: string): Promise<Record<string, unknown> | null> {
    return deriveState(this.data[threadId]?.events ?? []);
  }

  async saveMessages(threadId: string, messages: Message[]): Promise<void> {
    const row = this.data[threadId];
    if (row) {
      row.messages = [...messages];
      row.updatedAt = Date.now();
      this.flush();
    }
  }

  async readMessages(threadId: string): Promise<Message[]> {
    return [...(this.data[threadId]?.messages ?? [])];
  }

  async listThreads(filter?: ListThreadsFilter): Promise<StoredThread[]> {
    return Object.entries(this.data)
      .filter(([, r]) => filter?.ownerId === undefined || (r.ownerId ?? null) === filter.ownerId)
      .map(([id, r]) => ({
        id,
        agentId: r.agentId,
        ownerId: r.ownerId ?? null,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async clear(threadId?: string): Promise<void> {
    if (threadId === undefined) {
      for (const key of Object.keys(this.data)) delete this.data[key];
    } else {
      delete this.data[threadId];
    }
    this.flush();
  }
}
```

## Wire it up

A custom store drops into `createKabooRunner` exactly like the built-ins:

```ts no-verify
import { createKabooRunner } from "@pgege/kaboo-runtime";
import { JsonFileThreadStore } from "./store";

const runner = createKabooRunner(new JsonFileThreadStore("./threads.json"));
```
