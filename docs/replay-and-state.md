# Replay & state

kaboo-runtime treats the AG-UI event log as the single source of truth. Messages,
tools, state, and activity are all reconstructed from it — there is no separate,
hand-maintained state blob.

## The event log

Each run's events are appended to the thread's log **verbatim and in order**.
Nothing is compacted, so `ACTIVITY_SNAPSHOT` and `CUSTOM` events (the ones a rich
UI like [kaboo-react](https://github.com/gl-pgege/kaboo-react) needs) survive the
round-trip. `readEvents(threadId)` returns exactly what was emitted.

## Deriving state

State is not stored on its own. `deriveState` scans an event log backwards for
the last `STATE_SNAPSHOT` and returns its snapshot object (or `null`):

```ts
import { deriveState } from "@pgege/kaboo-runtime";
import type { BaseEvent } from "@ag-ui/client";

declare const events: BaseEvent[];
const state = deriveState(events); // Record<string, unknown> | null
```

The built-in stores use `deriveState` for `readState`, and so should custom
stores, so behavior is identical everywhere.

## State replay is a guarantee, not a convention

kaboo-workflows folds what a turn accumulates into its trailing `STATE_SNAPSHOT`.
Before every run, `KabooAgentRunner` reads the thread's persisted state and sets
it on the agent as `input.state` (persisted values first, then any incoming state,
so an explicit caller value wins). Every app on the runtime therefore gets the
round-trip without writing any code for it.

Two things ride that channel today:

- **`kaboo_history`** — sub-agent transcripts, so multi-agent history is seeded
  from the server rather than the browser.
- **`kaboo_session`** — a pending human-in-the-loop interrupt. This is what makes
  an approval durable: the open gate is restored onto whichever agent serves the
  resume, so a workflows restart, a second replica, or a rebuilt session between
  the question and the answer no longer strands it with
  `No agent session found for resume`.

Because a paused approval now depends on this, persisting `STATE_SNAPSHOT` is a
requirement of a store rather than a nicety — see [thread stores](thread-stores.md)
and [custom store](custom-store.md).

## Replay on reconnect

`connect(threadId)` replays the thread's stored log, then tees any in-flight run:

- If nothing is running, it emits the stored events and completes.
- If a run is in flight (its events aren't persisted until completion), it emits
  the stored prior turns and then forwards live events from the running run.

This is what lets a browser reload — or a second tab — rebuild the full
transcript and then continue watching live work.

## Warming the index after a cold start

The synchronous thread-query methods (`listThreads`, `getThreadEvents`, …) read
an in-memory index. After a process restart, call `hydrate()` once to populate it
from the store (individual `run`/`connect` calls also hydrate their own thread
lazily):

```ts
import { KabooAgentRunner, InMemoryThreadStore } from "@pgege/kaboo-runtime";

async function main() {
  const runner = new KabooAgentRunner(new InMemoryThreadStore());
  await runner.hydrate();
  return runner.listThreads();
}
```

## No compaction

Unlike the stock in-memory runner, kaboo-runtime never trims or summarizes the
log. Durability + verbatim storage is the whole point: the cost is storage, the
benefit is a perfectly reconstructable conversation.
