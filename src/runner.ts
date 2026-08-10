import { Observable, ReplaySubject } from "rxjs";
import {
  AgentRunner,
  finalizeRunEvents,
  type AgentRunnerConnectRequest,
  type AgentRunnerIsRunningRequest,
  type AgentRunnerRunRequest,
  type AgentRunnerStopRequest,
  type LocalThreadEndpointRecord,
} from "@copilotkit/runtime/v2";
import type { AbstractAgent, BaseEvent, Message, RunAgentInput } from "@ag-ui/client";
import type { ThreadStore } from "./store";
import { deriveState } from "./state";

/**
 * Access-control hooks for {@link KabooAgentRunner}.
 *
 * kaboo-runtime ships no HTTP layer, so *authentication* stays in the host —
 * but ownership is real data the runner records and serves. `ownerOf` tells
 * the runner which subject owns a thread (typically parsed from the host's
 * thread-id convention or session); the owner is persisted on the thread
 * record and surfaced as `createdById` in {@link KabooAgentRunner.listThreads},
 * so host request filters can compare against a real field instead of
 * re-deriving ownership.
 */
export interface KabooAccessPolicy {
  /**
   * Resolve the owning subject for a thread (or `null` when unknown). Called
   * when a run persists and when listing threads that have no recorded owner.
   */
  ownerOf?: (threadId: string) => string | null;
  /**
   * Whether {@link KabooAgentRunner.clearThreads} (which wipes the whole
   * store) is allowed. Defaults to `true` for compatibility; multi-tenant
   * hosts should set `false`.
   */
  allowClearAll?: boolean;
}

/** Options for {@link KabooAgentRunner} / {@link createKabooRunner}. */
export interface KabooRunnerOptions {
  /** Called when a store write fails, so hosts can log/observe. */
  onStoreError?: (error: unknown, context: { threadId: string; op: string }) => void;
  /** Ownership hooks — see {@link KabooAccessPolicy}. */
  accessPolicy?: KabooAccessPolicy;
}

interface ThreadRuntime {
  agentId: string;
  ownerId: string | null;
  events: BaseEvent[];
  messages: Message[];
  running: boolean;
  stopRequested: boolean;
  live: ReplaySubject<BaseEvent> | null;
  agent: AbstractAgent | null;
  createdAt: number;
  updatedAt: number;
  hydrated: boolean;
}

/**
 * A CopilotKit `AgentRunner` that persists the full AG-UI event log to a
 * pluggable {@link ThreadStore} and replays it verbatim on reconnect. Drop it
 * into `new CopilotRuntime({ agents, runner })` — it ships no HTTP layer, so it
 * works under any framework the host already mounts CopilotKit with.
 *
 * On each run it injects the thread's persisted state into the run, so anything
 * kaboo-workflows keeps there is seeded from the store rather than the browser:
 * `kaboo_history` for multi-agent transcripts, and `kaboo_session` for pending
 * interrupts — which is what lets an approval survive a restart of the agent
 * service. Unlike the stock in-memory runner, events are NOT compacted, so
 * `ACTIVITY_SNAPSHOT` / `CUSTOM` events survive for a full UI replay.
 *
 * @example
 * ```ts
 * import { CopilotRuntime } from "@copilotkit/runtime/v2";
 * import { KabooAgentRunner, InMemoryThreadStore } from "@pgege/kaboo-runtime";
 *
 * const runtime = new CopilotRuntime({
 *   agents: {},
 *   runner: new KabooAgentRunner(new InMemoryThreadStore()),
 * });
 * ```
 */
export class KabooAgentRunner extends AgentRunner {
  /** @internal Framework marker telling CopilotKit this runner serves local thread endpoints. */
  readonly ɵsupportsLocalThreadEndpoints = true;

  private readonly cache = new Map<string, ThreadRuntime>();

  /**
   * @param store - Where to persist and read each thread's event log.
   * @param options - Optional hooks (e.g. {@link KabooRunnerOptions.onStoreError}).
   */
  constructor(
    private readonly store: ThreadStore,
    private readonly options: KabooRunnerOptions = {},
  ) {
    super();
  }

  /**
   * Warm the in-memory index from the store so the synchronous thread-query
   * methods (`listThreads`, `getThreadEvents`, ...) work after a cold start.
   * Optional: `run`/`connect` also hydrate their own thread lazily.
   */
  async hydrate(): Promise<void> {
    const threads = await this.store.listThreads();
    for (const t of threads) {
      const record = this.getOrCreate(t.id, t.agentId);
      record.createdAt = t.createdAt;
      record.updatedAt = t.updatedAt;
      record.ownerId = t.ownerId ?? record.ownerId;
      await this.hydrateThread(t.id);
    }
  }

  private getOrCreate(threadId: string, agentId = "default"): ThreadRuntime {
    let record = this.cache.get(threadId);
    if (!record) {
      const now = Date.now();
      record = {
        agentId,
        ownerId: null,
        events: [],
        messages: [],
        running: false,
        stopRequested: false,
        live: null,
        agent: null,
        createdAt: now,
        updatedAt: now,
        hydrated: false,
      };
      this.cache.set(threadId, record);
    }
    return record;
  }

  private async hydrateThread(threadId: string): Promise<void> {
    const record = this.getOrCreate(threadId);
    if (record.hydrated) return;
    record.events = await this.store.readEvents(threadId);
    record.messages = await this.store.readMessages(threadId);
    record.hydrated = true;
  }

  /**
   * Merge the thread's persisted state under the caller's for this run.
   *
   * The merged state is written back onto the *agent*, not just the returned
   * input. `AbstractAgent.prepareRunAgentInput` builds the wire payload from
   * `this.state` and ignores `input.state` entirely, so setting the field alone
   * is silently dropped — which used to make this whole injection a no-op, and
   * left every host to replay state itself.
   */
  private injectState(
    agent: AbstractAgent,
    input: RunAgentInput,
    persisted: Record<string, unknown> | null,
  ): RunAgentInput {
    if (!persisted) return input;
    const inputState = input.state && typeof input.state === "object" ? input.state : {};
    const merged = { ...persisted, ...(inputState as Record<string, unknown>) };
    // Guarded because the runner accepts whatever CopilotKit hands it, which may
    // be a duck-typed agent that reads `input.state` instead.
    if (typeof agent.setState === "function") agent.setState(merged);
    return { ...input, state: merged };
  }

  private reportStoreError(error: unknown, threadId: string, op: string): void {
    if (this.options.onStoreError) this.options.onStoreError(error, { threadId, op });
    else console.error(`[kaboo-runtime] store ${op} failed for thread ${threadId}:`, error);
  }

  private resolveOwner(threadId: string): string | null {
    return this.options.accessPolicy?.ownerOf?.(threadId) ?? null;
  }

  /**
   * Run an agent for a thread, streaming its AG-UI events. The thread's
   * persisted state is injected into `input.state` first; on completion the run's
   * events and derived messages are persisted to the store. Throws if the thread
   * is already running.
   *
   * @param request - The CopilotKit run request (`threadId`, `agent`, `input`).
   * @returns An observable of the run's events (also mirrored to `connect`).
   */
  run(request: AgentRunnerRunRequest): Observable<BaseEvent> {
    const { threadId, agent, input } = request;
    const record = this.getOrCreate(threadId, agent.agentId ?? "default");
    if (record.running) {
      throw new Error(`Thread ${threadId} is already running`);
    }
    record.running = true;
    record.stopRequested = false;
    record.agent = agent;
    record.agentId = agent.agentId ?? record.agentId;
    record.ownerId = record.ownerId ?? this.resolveOwner(threadId);

    const runSubject = new ReplaySubject<BaseEvent>(Infinity);
    const live = new ReplaySubject<BaseEvent>(Infinity);
    record.live = live;

    const runEvents: BaseEvent[] = [];

    const emit = (event: BaseEvent) => {
      runSubject.next(event);
      live.next(event);
    };

    const runAgent = async () => {
      try {
        await this.hydrateThread(threadId);
        const persisted = await this.store.readState(threadId);
        const mergedInput = this.injectState(agent, input, persisted);
        await agent.runAgent(mergedInput, {
          onEvent: ({ event }: { event: BaseEvent }) => {
            runEvents.push(event);
            emit(event);
          },
        });
        // finalizeRunEvents mutates runEvents (appends any missing terminal
        // events) and returns just the appended ones for us to emit.
        for (const event of finalizeRunEvents(runEvents, { stopRequested: record.stopRequested })) {
          emit(event);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        for (const event of finalizeRunEvents(runEvents, {
          stopRequested: record.stopRequested,
          interruptionMessage: message,
        })) {
          emit(event);
        }
      } finally {
        record.events.push(...runEvents);
        const derivedMessages = Array.isArray(agent.messages) ? [...agent.messages] : record.messages;
        record.messages = derivedMessages;
        record.updatedAt = Date.now();
        record.hydrated = true;
        try {
          await this.store.appendEvents(threadId, record.agentId, runEvents, record.ownerId);
          await this.store.saveMessages(threadId, derivedMessages);
        } catch (error) {
          this.reportStoreError(error, threadId, "persist");
        }
        record.running = false;
        record.stopRequested = false;
        record.agent = null;
        record.live = null;
        runSubject.complete();
        live.complete();
      }
    };

    void runAgent();
    return runSubject.asObservable();
  }

  /**
   * Replay a thread's stored event log, then tee any in-flight run so a
   * reconnecting client sees prior turns followed by live events. Completes
   * immediately (after replay) when nothing is running.
   *
   * @param request - The connect request (`threadId`).
   * @returns An observable that emits the stored log and, if running, live events.
   */
  connect(request: AgentRunnerConnectRequest): Observable<BaseEvent> {
    const { threadId } = request;
    const subject = new ReplaySubject<BaseEvent>(Infinity);
    const record = this.cache.get(threadId);
    // Capture the live stream up front: if a run is in flight its events are
    // not yet in the store (they persist on completion), so we replay the
    // stored prior turns and tee the in-flight run from the live subject.
    const live = record?.running ? record.live : null;

    void (async () => {
      try {
        const events = await this.store.readEvents(threadId);
        for (const event of events) subject.next(event);
        if (live) {
          live.subscribe({
            next: (event) => subject.next(event),
            error: (error) => subject.error(error),
            complete: () => subject.complete(),
          });
        } else {
          subject.complete();
        }
      } catch (error) {
        subject.error(error);
      }
    })();

    return subject.asObservable();
  }

  /**
   * Report whether a thread currently has a run in flight.
   *
   * @param request - The is-running request (`threadId`).
   * @returns `true` while a run is active, otherwise `false`.
   */
  isRunning(request: AgentRunnerIsRunningRequest): Promise<boolean> {
    return Promise.resolve(this.cache.get(request.threadId)?.running ?? false);
  }

  /**
   * Request cancellation of a thread's in-flight run by aborting its agent.
   *
   * @param request - The stop request (`threadId`).
   * @returns `true` if a stop was initiated; `false` when nothing is running, a
   * stop was already requested, or the abort threw.
   */
  stop(request: AgentRunnerStopRequest): Promise<boolean | undefined> {
    const record = this.cache.get(request.threadId);
    if (!record || !record.running || record.stopRequested) return Promise.resolve(false);
    const agent = record.agent;
    if (!agent) return Promise.resolve(false);
    record.stopRequested = true;
    try {
      agent.abortRun();
      return Promise.resolve(true);
    } catch (error) {
      record.stopRequested = false;
      this.reportStoreError(error, request.threadId, "stop");
      return Promise.resolve(false);
    }
  }

  // -- LocalThreadEndpointRunner (synchronous, served from the in-memory index) --

  /**
   * List threads that have at least one persisted event, most recently updated
   * first, as CopilotKit `LocalThreadEndpointRecord`s. Served synchronously from
   * the in-memory index (call {@link KabooAgentRunner.hydrate} after a cold start).
   *
   * `createdById` carries the thread's owner (from the store record or
   * {@link KabooAccessPolicy.ownerOf}; empty string when unknown), so hosts can
   * scope the list per caller. Note: CopilotKit's thread-list handler does not
   * pass the caller subject down to the runner, so per-caller filtering itself
   * still happens in the host (e.g. an `onResponse` filter comparing
   * `createdById`).
   *
   * @returns The thread records for CopilotKit's thread-list endpoint.
   */
  listThreads(): LocalThreadEndpointRecord[] {
    return [...this.cache.entries()]
      .filter(([, r]) => r.events.length > 0)
      .map(([id, r]) => ({
        id,
        name: null,
        agentId: r.agentId,
        organizationId: "",
        createdById: r.ownerId ?? this.resolveOwner(id) ?? "",
        archived: false,
        createdAt: new Date(r.createdAt).toISOString(),
        updatedAt: new Date(r.updatedAt).toISOString(),
      }))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  /**
   * Get a thread's derived message snapshot from the in-memory index.
   *
   * @param threadId - The thread to read.
   * @returns A copy of the thread's messages (empty when unknown).
   */
  getThreadMessages(threadId: string): Message[] {
    return [...(this.cache.get(threadId)?.messages ?? [])];
  }

  /**
   * Get a thread's full event log from the in-memory index.
   *
   * @param threadId - The thread to read.
   * @returns A copy of the thread's events (empty when unknown).
   */
  getThreadEvents(threadId: string): BaseEvent[] {
    return [...(this.cache.get(threadId)?.events ?? [])];
  }

  /**
   * Get a thread's latest derived state (from its last `STATE_SNAPSHOT`).
   *
   * @param threadId - The thread to read.
   * @returns The derived state, or `null` when unknown or never emitted.
   */
  getThreadState(threadId: string): Record<string, unknown> | null {
    const record = this.cache.get(threadId);
    return record ? deriveState(record.events) : null;
  }

  /**
   * Clear the in-memory index and the backing store (all threads). Store errors
   * are routed to {@link KabooRunnerOptions.onStoreError}. Throws when the
   * access policy sets `allowClearAll: false`.
   */
  clearThreads(): void {
    if (this.options.accessPolicy?.allowClearAll === false) {
      throw new Error("clearThreads is disabled by the runner's access policy (allowClearAll: false)");
    }
    this.cache.clear();
    void this.store.clear().catch((error) => this.reportStoreError(error, "*", "clear"));
  }
}

/**
 * Create a {@link KabooAgentRunner} bound to a {@link ThreadStore}. Pass the
 * result to `new CopilotRuntime({ agents, runner })`.
 *
 * ```ts
 * const runtime = new CopilotRuntime({
 *   agents: { research_pipeline: new HttpAgent({ url: pipelineUrl }) },
 *   runner: createKabooRunner(new PostgresThreadStore({ dsn })),
 * });
 * ```
 */
export function createKabooRunner(store: ThreadStore, options?: KabooRunnerOptions): KabooAgentRunner {
  return new KabooAgentRunner(store, options);
}
