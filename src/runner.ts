import { randomUUID } from "node:crypto";
import { Observable, Subject, type Subscription } from "rxjs";
import {
  AgentRunner,
  createRunEventFinalizer,
  type AgentRunnerConnectRequest,
  type AgentRunnerIsRunningRequest,
  type AgentRunnerRunRequest,
  type AgentRunnerStopRequest,
  type LocalThreadEndpointRecord,
} from "@copilotkit/runtime/v2";
import { EventType, type BaseEvent, type Message, type RunAgentInput } from "@ag-ui/client";
import {
  KABOO_GRANTS_PROP,
  resolveApprovalDecisions,
  type KabooApprovalOptions,
  type KabooRunContext,
  type ToolGrant,
} from "./approvals";
import { DEFAULT_STATE_KEYS, StateOwnership, type KabooStateKeys } from "./keys";
import { replayableLog } from "./replay";
import { applyStateDelta } from "./state";
import type { ThreadStore } from "./store";

/**
 * The agent as CopilotKit hands it over. CopilotKit pins its own
 * `@ag-ui/client`, which can be a different copy from the app's, so the
 * runner keeps CopilotKit's type rather than its own `AbstractAgent`.
 */
type RunnerAgent = AgentRunnerRunRequest["agent"];

/**
 * Name of the `CUSTOM` event the runner emits (and persists) once per new
 * input message of a run, carrying `{ messageId, role, createdAt, references }`.
 * Because events are persisted verbatim and replayed on reconnect, this is the
 * durable channel for message timestamps and per-message references — the
 * derived `Message` snapshot cannot be relied on to round-trip extra fields.
 */
export const MESSAGE_META_EVENT = "kaboo.message_meta";

/** Payload of a {@link MESSAGE_META_EVENT} `CUSTOM` event. */
export interface MessageMeta {
  /** Id of the input message this metadata describes. */
  messageId: string;
  /** Role of that message (currently always `"user"`). */
  role: string;
  /** Wall-clock time the run accepted the message, epoch milliseconds. */
  createdAt: number;
  /**
   * The `state.kaboo_references` the message was sent with, attached to the
   * newest user message of the run. Absent when none were staged.
   */
  references?: unknown[];
}

/**
 * Build one {@link MESSAGE_META_EVENT} per input message not seen in a prior
 * run (i.e. the messages this run adds), stamping them with the current time.
 * References ride only the newest user message — that is the message the
 * composer staged them for.
 */
function buildMessageMetaEvents(input: RunAgentInput, known: Message[]): BaseEvent[] {
  const knownIds = new Set(known.map((m) => m.id));
  const fresh = (input.messages ?? []).filter(
    (m) => m.role === "user" && typeof m.id === "string" && m.id.length > 0 && !knownIds.has(m.id),
  );
  if (fresh.length === 0) return [];
  const state = input.state as Record<string, unknown> | null | undefined;
  const references =
    state && Array.isArray(state.kaboo_references) && state.kaboo_references.length > 0
      ? state.kaboo_references
      : undefined;
  const now = Date.now();
  return fresh.map((m, i) => {
    const value: MessageMeta = { messageId: m.id, role: m.role, createdAt: now };
    if (references && i === fresh.length - 1) value.references = references;
    return { type: EventType.CUSTOM, name: MESSAGE_META_EVENT, value, timestamp: now } as BaseEvent;
  });
}

const MAX_CONTINUATIONS = 10;

function waitsOnlyOn(finished: BaseEvent, answered: Set<string>): boolean {
  const outcome = (finished as { outcome?: { type?: string; pendingToolCallIds?: string[] } }).outcome;
  const pending = outcome?.type === "success" ? (outcome.pendingToolCallIds ?? []) : [];
  return pending.length > 0 && pending.every((id) => answered.has(id));
}

function isProxiedMcpRequest(input: RunAgentInput): boolean {
  const props = input.forwardedProps as Record<string, unknown> | undefined;
  return Boolean(props && Object.prototype.hasOwnProperty.call(props, "__proxiedMCPRequest"));
}

function passThrough(agent: AgentRunnerRunRequest["agent"], input: RunAgentInput): Observable<BaseEvent> {
  return new Observable<BaseEvent>((subscriber) => {
    agent
      .runAgent(input, { onEvent: ({ event }: { event: BaseEvent }) => subscriber.next(event) })
      .then(
        () => subscriber.complete(),
        (error: unknown) => subscriber.error(error),
      );
  });
}

/**
 * The input a run's `RUN_STARTED` is stamped with: the messages the run adds
 * and any resume answers. A replay restores those messages from it, so a run
 * that failed before the agent said anything still shows what was asked.
 * Tools, state and `forwardedProps` stay out: they are large, already logged
 * elsewhere, or carry credentials.
 */
function stampedInput(input: RunAgentInput, known: Message[]): RunAgentInput {
  const knownIds = new Set(known.map((m) => m.id));
  return {
    threadId: input.threadId,
    runId: input.runId,
    ...(input.parentRunId ? { parentRunId: input.parentRunId } : {}),
    state: {},
    messages: (input.messages ?? []).filter((m) => !knownIds.has(m.id)),
    tools: [],
    context: input.context ?? [],
    forwardedProps: {},
    ...(input.resume ? { resume: input.resume } : {}),
  } as RunAgentInput;
}

/**
 * Write-behind persistence for one in-flight run.
 *
 * Events are appended to {@link RunPersistence.unpersisted} and flushed to the
 * store in batches as fast as the store accepts them; a batch is dropped from
 * memory the moment its transaction commits. This bounds the runner's memory
 * to the flush lag instead of the whole run (a multi-hour agent run can emit
 * gigabytes of snapshot events), and it makes the log durable as the run
 * progresses — a crash loses at most the in-flight batch, not the entire run.
 *
 * {@link RunPersistence.pause} freezes flushing so a reader can take a
 * consistent split: everything committed is in the store, everything else is
 * in `unpersisted`. That is what makes a mid-run `connect` gap-free.
 */
class RunPersistence {
  /** Events accepted but not yet committed to the store, in order. */
  readonly unpersisted: BaseEvent[] = [];
  /** Live feed of every accepted event, for mid-run subscribers. */
  readonly live = new Subject<BaseEvent>();

  private flushing = false;
  private pauses = 0;
  private lastFlushFailed = false;
  private inFlight: Promise<void> = Promise.resolve();
  private resumeWaiters: (() => void)[] = [];

  constructor(
    private readonly flushBatch: (events: BaseEvent[]) => Promise<void>,
    private readonly onError: (error: unknown) => void,
  ) {}

  /** Record an event: buffer it, feed live subscribers, schedule a flush. */
  accept(event: BaseEvent): void {
    this.unpersisted.push(event);
    this.live.next(event);
    this.schedule();
  }

  /** Feed live subscribers an event that must not enter the log. */
  announce(event: BaseEvent): void {
    this.live.next(event);
  }

  private schedule(): void {
    if (this.flushing || this.pauses > 0 || this.unpersisted.length === 0) return;
    this.flushing = true;
    const batch = this.unpersisted.slice();
    this.inFlight = this.flushBatch(batch).then(
      () => {
        // batch is always a prefix of unpersisted (events only append).
        this.unpersisted.splice(0, batch.length);
        this.lastFlushFailed = false;
        this.flushing = false;
        this.schedule();
      },
      (error) => this.isolateFailure(batch, error),
    );
  }

  /**
   * A batch write failed. Retry its events one at a time, in order, to tell
   * *poison events* (ones the store deterministically rejects — e.g. JSON
   * Postgres refuses) apart from a *down store*. If nothing in the batch can
   * be persisted individually, the store is treated as down and the whole
   * batch stays buffered for the next regular retry. If some events persist,
   * the rejected ones are dropped and reported so the log keeps flowing;
   * without this, every retry would resend the poison in an ever-growing
   * batch, wedging persistence for the rest of the run and retaining it all
   * in memory.
   */
  private async isolateFailure(batch: BaseEvent[], batchError: unknown): Promise<void> {
    let persisted = 0;
    const failures: { event: BaseEvent; error: unknown }[] = [];
    for (const event of batch) {
      try {
        await this.flushBatch([event]);
        persisted += 1;
      } catch (error) {
        failures.push({ event, error });
      }
    }
    if (persisted === 0) {
      this.lastFlushFailed = true;
      this.flushing = false;
      this.onError(batchError);
      return;
    }
    for (const { event, error } of failures) {
      this.onError(
        new Error(
          `dropped event of type ${String((event as { type?: unknown }).type)} rejected by the store: ${String(error)}`,
        ),
      );
    }
    this.unpersisted.splice(0, batch.length);
    this.lastFlushFailed = false;
    this.flushing = false;
    this.schedule();
  }

  /**
   * Pause flushing and wait out any in-flight write. Afterwards the store and
   * `unpersisted` form a consistent, non-overlapping split of the run's events
   * until {@link RunPersistence.resume} is called.
   */
  async pause(): Promise<void> {
    this.pauses += 1;
    await this.inFlight.catch(() => {});
  }

  /** Undo one {@link RunPersistence.pause}; resumes flushing at zero. */
  resume(): void {
    this.pauses -= 1;
    if (this.pauses === 0) {
      for (const waiter of this.resumeWaiters.splice(0)) waiter();
      this.schedule();
    }
  }

  /**
   * Flush everything left (used at run end). Resolves once the log is durable,
   * or after a failed write (already routed to `onError`).
   */
  async drain(): Promise<void> {
    while (this.unpersisted.length > 0) {
      if (this.pauses > 0) {
        await new Promise<void>((resolve) => this.resumeWaiters.push(resolve));
        continue;
      }
      this.schedule();
      await this.inFlight.catch(() => {});
      if (this.lastFlushFailed) return;
    }
  }

  /** Complete the live feed (run is over). */
  complete(): void {
    this.live.complete();
  }
}

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
  /**
   * Add what the host vouches for to a run — run-scoped credentials, the
   * tenant, a composed workflow, a server-owned state value. Awaited before
   * the run starts; if it throws, the run ends with an error.
   */
  enrich?: (context: KabooRunContext) => KabooEnrichment | Promise<KabooEnrichment>;
  /** Remembered tool approvals — see {@link KabooApprovalOptions}. */
  approvals?: KabooApprovalOptions;
  /**
   * Which state keys the server owns. Defaults to {@link DEFAULT_STATE_KEYS}:
   * kaboo-workflows' sessions hidden, its workspace visible.
   */
  stateKeys?: KabooStateKeys;
}

/** What {@link KabooRunnerOptions.enrich} adds to a run. */
export interface KabooEnrichment {
  /**
   * Replaces the client's `forwardedProps`, so a client cannot smuggle in what
   * only the host may set (start from `context.input.forwardedProps` to keep
   * client values). Omit to keep the client's. `kaboo_grants` is always set by
   * the runner.
   */
  forwardedProps?: Record<string, unknown>;
  /**
   * State values set for this run over the merged state, server-owned keys
   * included. This is the only way a server key changes outside the agent.
   */
  state?: Record<string, unknown>;
}

interface ThreadRuntime {
  agentId: string;
  ownerId: string | null;
  /** Whether the thread has any persisted or in-flight events. */
  hasEvents: boolean;
  /** Latest `STATE_SNAPSHOT` payload, folded incrementally as runs stream. */
  state: Record<string, unknown> | null;
  messages: Message[];
  running: boolean;
  runId: string | null;
  stopRequested: boolean;
  run: RunPersistence | null;
  agent: RunnerAgent | null;
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
 * Events are persisted *incrementally* while a run streams (write-behind
 * batches) and dropped from memory once committed, so memory stays bounded on
 * long, snapshot-heavy runs and a crash preserves the log up to the last
 * committed batch. On replay of a thread whose final run has no terminal event
 * (e.g. the host crashed mid-run), the runner synthesizes the missing
 * `TEXT_MESSAGE_END` / `TOOL_CALL_*` / `RUN_ERROR` events so clients never
 * hang on a dangling run.
 *
 * On each run it injects the thread's persisted state into the run, so anything
 * kaboo-workflows keeps there is seeded from the store rather than the browser:
 * `kaboo_sessions`, every agent's transcript and the paused checkpoint — which
 * is what lets an approval survive a restart of the agent service. Server-owned
 * keys never come from the browser ({@link KabooRunnerOptions.stateKeys}).
 *
 * A finished run is compacted with AG-UI's `compactEvents`, which replays to
 * the same transcript and cards. A run that ends waiting only on calls it
 * answered itself — an MCP App's tool, run by CopilotKit's middleware — goes on
 * with the agent in the same run. MCP Apps' own requests pass straight through,
 * unrecorded.
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
  private readonly sealing = new Set<string>();
  private readonly ownership: StateOwnership;

  /**
   * @param store - Where to persist and read each thread's event log.
   * @param options - Optional hooks (e.g. {@link KabooRunnerOptions.onStoreError}).
   */
  constructor(
    private readonly store: ThreadStore,
    private readonly options: KabooRunnerOptions = {},
  ) {
    super();
    this.ownership = new StateOwnership(options.stateKeys ?? DEFAULT_STATE_KEYS);
  }

  /**
   * Warm the in-memory index from the store so the synchronous thread-query
   * methods (`listThreads`, `getThreadMessages`, ...) work after a cold start.
   * Loads each thread's metadata, message snapshot, and latest state — not its
   * event log. Optional: `run`/`connect` also hydrate their own thread lazily.
   */
  async hydrate(): Promise<void> {
    const threads = await this.store.listThreads();
    for (const t of threads) {
      const record = this.getOrCreate(t.id, t.agentId);
      record.createdAt = t.createdAt;
      record.updatedAt = t.updatedAt;
      record.ownerId = t.ownerId ?? record.ownerId;
      record.hasEvents = true;
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
        hasEvents: false,
        state: null,
        messages: [],
        running: false,
        runId: null,
        stopRequested: false,
        run: null,
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
    record.messages = await this.store.readMessages(threadId);
    record.state = await this.store.readState(threadId);
    record.hydrated = true;
  }

  /**
   * The state the run starts with ({@link StateOwnership.merge}): the
   * browser's keys from the client, the server's from the store, then the
   * host's. A browser-sent server key is never used, so a client cannot forge
   * a session or the workspace.
   *
   * The merged state is written back onto the *agent*, not just the returned
   * input. `AbstractAgent.prepareRunAgentInput` builds the wire payload from
   * `this.state` and ignores `input.state` entirely, so setting the field alone
   * is silently dropped.
   */
  private injectState(
    agent: RunnerAgent,
    input: RunAgentInput,
    persisted: Record<string, unknown> | null,
    host: Record<string, unknown> | undefined,
  ): RunAgentInput {
    const merged = this.ownership.merge(persisted, input.state, host);
    // Guarded because the runner accepts whatever CopilotKit hands it, which may
    // be a duck-typed agent that reads `input.state` instead.
    if (typeof agent.setState === "function") agent.setState(merged);
    return { ...input, state: merged };
  }

  /**
   * Settle what the run carries before the agent sees it: what the host adds
   * ({@link KabooRunnerOptions.enrich}), the person's approval decisions
   * (handed to {@link KabooApprovalOptions.onDecision}, then saved as grants
   * once it accepts them), and the permissions the agent may use
   * (`kaboo_grants`, replacing anything the client sent).
   */
  private async prepareInput(
    threadId: string,
    record: ThreadRuntime,
    input: RunAgentInput,
    persisted: Record<string, unknown> | null,
  ): Promise<{ input: RunAgentInput; hostState?: Record<string, unknown> }> {
    const context: KabooRunContext = {
      threadId,
      agentId: record.agentId,
      ownerId: record.ownerId,
      input,
    };
    const clientProps =
      input.forwardedProps && typeof input.forwardedProps === "object"
        ? (input.forwardedProps as Record<string, unknown>)
        : {};
    const enrichment = this.options.enrich ? await this.options.enrich(context) : {};
    const forwardedProps: Record<string, unknown> = { ...(enrichment.forwardedProps ?? clientProps) };
    delete forwardedProps[KABOO_GRANTS_PROP];

    const approvals = this.options.approvals;
    if (approvals) {
      const decisions = resolveApprovalDecisions(input.resume, persisted);
      const grants = approvals.grants;
      if (decisions.length > 0 && approvals.onDecision) {
        await approvals.onDecision(decisions, context);
      }
      if (grants && record.ownerId) {
        for (const d of decisions) {
          if (d.decision !== "approved" || d.scope === "once" || d.request) continue;
          await grants.save({
            ownerId: record.ownerId,
            agentId: record.agentId,
            threadId: d.scope === "thread" ? threadId : null,
            tool: d.tool,
            subject: d.subject.key,
            label: d.subject.label,
          });
        }
      }
      if (grants && record.ownerId) {
        const held = await grants.list({ ownerId: record.ownerId, agentId: record.agentId, threadId });
        forwardedProps[KABOO_GRANTS_PROP] = held.map((g) => ({
          tool: g.tool,
          subject: g.subject,
          scope: g.threadId === null ? "always" : "thread",
        }));
      }
    }
    return { input: { ...input, forwardedProps }, hostState: enrichment.state };
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
   * persisted state is injected into `input.state` first. Events are persisted
   * incrementally as the run streams (and dropped from memory once committed);
   * the derived message snapshot is persisted on completion. Throws if the
   * thread is already running.
   *
   * A run that fails before the agent emits anything (`enrich` or
   * `onDecision` throws, the store can't be read) still opens with
   * `RUN_STARTED` and closes with `RUN_ERROR`, as AG-UI clients expect. When
   * that run was a resume, none of it is stored: the thread still ends on the
   * interrupts it answered, and they stay open to be answered again.
   *
   * @param request - The CopilotKit run request (`threadId`, `agent`, `input`).
   * @returns An observable of the run's events (also mirrored to `connect`).
   */
  run(request: AgentRunnerRunRequest): Observable<BaseEvent> {
    const { threadId, agent, input } = request;
    if (isProxiedMcpRequest(input)) return passThrough(agent, input);
    const record = this.getOrCreate(threadId, agent.agentId ?? "default");
    if (record.running) {
      throw new Error(`Thread ${threadId} is already running`);
    }
    record.running = true;
    record.runId = input.runId;
    record.stopRequested = false;
    record.agent = agent;
    record.agentId = agent.agentId ?? record.agentId;
    record.ownerId = record.ownerId ?? this.resolveOwner(threadId);

    const persistence = new RunPersistence(
      (batch) => this.store.appendEvents(threadId, record.agentId, batch, record.ownerId),
      (error) => this.reportStoreError(error, threadId, "persist"),
    );
    record.run = persistence;

    // Output stream for CopilotKit's response writer: buffer only until the
    // first subscriber attaches, then feed it directly. (A ReplaySubject here
    // would retain the entire run in memory for its lifetime.)
    let backlog: BaseEvent[] | null = [];
    let completed = false;
    const out = new Subject<BaseEvent>();
    const output = new Observable<BaseEvent>((subscriber) => {
      if (backlog) {
        for (const event of backlog) subscriber.next(event);
        backlog = null;
      }
      if (completed) {
        subscriber.complete();
        return;
      }
      const sub = out.subscribe(subscriber);
      return () => sub.unsubscribe();
    });
    const emit = (event: BaseEvent) => {
      const visible = this.ownership.visible(event);
      if (!visible) return;
      if (backlog) backlog.push(visible);
      else out.next(visible);
    };

    // Tracks what is open so a run that ends early can be closed, without
    // retaining the (potentially huge) events themselves.
    const finalizer = createRunEventFinalizer();
    const stamp = stampedInput(input, record.messages);
    let protocolVersion: string | undefined;
    let started = false;
    let unrecorded = false;
    const opened = (event: BaseEvent) => {
      if (event.timestamp == null) event.timestamp = Date.now();
      if (event.type === EventType.RUN_STARTED) {
        started = true;
        const startedEvent = event as BaseEvent & { protocolVersion?: string; input?: RunAgentInput };
        protocolVersion = startedEvent.protocolVersion;
        startedEvent.input = stamp;
      }
      finalizer.observe(event);
    };
    const accept = (event: BaseEvent) => {
      opened(event);
      if (event.type === EventType.STATE_SNAPSHOT) {
        const snapshot = (event as { snapshot?: unknown }).snapshot;
        if (snapshot && typeof snapshot === "object") record.state = snapshot as Record<string, unknown>;
      } else if (event.type === EventType.STATE_DELTA) {
        record.state = applyStateDelta(record.state, (event as { delta?: unknown }).delta);
      }
      record.hasEvents = true;
      persistence.accept(event);
      emit(event);
    };
    const announce = (event: BaseEvent) => {
      opened(event);
      persistence.announce(event);
      emit(event);
    };

    const runAgent = async () => {
      try {
        await this.hydrateThread(threadId);
        const persisted = record.state ?? (await this.store.readState(threadId));
        const prepared = await this.prepareInput(threadId, record, input, persisted);
        const mergedInput = this.injectState(agent, prepared.input, persisted, prepared.hostState);
        // Message-meta events trail the agent's first event (RUN_STARTED)
        // rather than leading it: AG-UI clients validate that a run's stream
        // opens with RUN_STARTED, so leading CUSTOM events would be rejected.
        const metaEvents = buildMessageMetaEvents(mergedInput, record.messages);
        let metaPending = metaEvents.length > 0;
        let rounds = 0;
        let goOn = false;
        const answered = new Set<string>();
        const onEvent = ({ event }: { event: BaseEvent }) => {
          // An aborted client reports its own RUN_ERROR; a stop ends as cancelled instead.
          if (record.stopRequested && event.type === EventType.RUN_ERROR) return;
          if (event.type === EventType.TOOL_CALL_RESULT) answered.add((event as unknown as { toolCallId: string }).toolCallId);
          if (
            event.type === EventType.RUN_FINISHED &&
            rounds < MAX_CONTINUATIONS &&
            !record.stopRequested &&
            waitsOnlyOn(event, answered)
          ) {
            goOn = true;
            return;
          }
          if (rounds > 0 && event.type === EventType.RUN_STARTED) return;
          accept(rounds > 0 && event.type === EventType.RUN_FINISHED ? ({ ...event, runId: input.runId } as BaseEvent) : event);
          if (metaPending) {
            metaPending = false;
            for (const meta of metaEvents) accept(meta);
          }
        };
        await agent.runAgent(mergedInput, { onEvent });
        while (goOn) {
          goOn = false;
          rounds += 1;
          await agent.runAgent({ ...mergedInput, runId: randomUUID(), resume: undefined }, { onEvent });
        }
        for (const event of finalizer.finalize({ stopRequested: record.stopRequested, protocolVersion })) {
          accept(event);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        unrecorded = !started && Array.isArray(input.resume) && input.resume.length > 0;
        const send = unrecorded ? announce : accept;
        if (!started) send({ type: EventType.RUN_STARTED, threadId, runId: input.runId } as BaseEvent);
        for (const event of finalizer.finalize({
          stopRequested: record.stopRequested,
          interruptionMessage: message,
          protocolVersion,
        })) {
          send(event);
        }
      } finally {
        if (!unrecorded) {
          record.messages = Array.isArray(agent.messages) ? [...agent.messages] : record.messages;
          record.updatedAt = Date.now();
        }
        record.hydrated = true;
        await persistence.drain();
        if (!unrecorded) {
          try {
            await this.store.saveMessages(threadId, record.messages);
          } catch (error) {
            this.reportStoreError(error, threadId, "persist");
          }
        }
        record.running = false;
        record.stopRequested = false;
        record.agent = null;
        record.run = null;
        completed = true;
        persistence.complete();
        out.complete();
        if (!unrecorded) {
          void this.store
            .compactRun(threadId, input.runId)
            .catch((error) => this.reportStoreError(error, threadId, "compact"));
        }
      }
    };

    void runAgent();
    return output;
  }

  /**
   * Replay a thread's stored event log, then tee any in-flight run so a
   * reconnecting client sees prior turns followed by live events, without
   * gaps or duplicates (flushing is paused while the split is taken).
   *
   * When the thread is idle but its log ends in a run with no terminal event —
   * the host crashed mid-run — the missing `TEXT_MESSAGE_END` / `TOOL_CALL_*` /
   * `RUN_ERROR` events are synthesized (and persisted, best-effort) so the
   * client's stream closes cleanly instead of hanging. Completes immediately
   * (after replay) when nothing is running.
   *
   * @param request - The connect request (`threadId`).
   * @returns An observable that emits the stored log and, if running, live events.
   */
  connect(request: AgentRunnerConnectRequest): Observable<BaseEvent> {
    const { threadId } = request;
    return new Observable<BaseEvent>((subscriber) => {
      let liveSub: Subscription | null = null;
      let cancelled = false;
      const send = (event: BaseEvent) => {
        const visible = this.ownership.visible(event);
        if (visible) subscriber.next(visible);
      };
      void (async () => {
        const record = this.cache.get(threadId);
        const run = record?.running ? record.run : null;
        try {
          if (run) {
            await run.pause();
            try {
              const stored = await this.store.readEvents(threadId);
              if (cancelled) return;
              // Same tick as the subscription below, so nothing can interleave:
              // the store + unpersisted tail + live feed join up gap-free.
              for (const event of replayableLog([...stored, ...run.unpersisted])) send(event);
              liveSub = run.live.subscribe({
                next: send,
                error: (error) => subscriber.error(error),
                complete: () => subscriber.complete(),
              });
            } finally {
              run.resume();
            }
          } else {
            const stored = await this.store.readEvents(threadId);
            if (cancelled) return;
            const sealed = this.sealDanglingRun(threadId, stored);
            for (const event of replayableLog([...stored, ...sealed])) send(event);
            subscriber.complete();
          }
        } catch (error) {
          if (!cancelled) subscriber.error(error);
        }
      })();
      return () => {
        cancelled = true;
        liveSub?.unsubscribe();
      };
    });
  }

  /**
   * Synthesize the terminal events for a stored log whose last run never
   * ended (crash mid-run). Returns the events to append to the replay, and
   * persists them (best-effort, once) so subsequent replays read a well-formed
   * log directly.
   */
  private sealDanglingRun(threadId: string, stored: BaseEvent[]): BaseEvent[] {
    let lastRunStart = -1;
    for (let i = stored.length - 1; i >= 0; i--) {
      if (stored[i].type === EventType.RUN_STARTED) {
        lastRunStart = i;
        break;
      }
    }
    if (lastRunStart === -1) return [];
    const tail = stored.slice(lastRunStart);
    if (tail.some((e) => e.type === EventType.RUN_FINISHED || e.type === EventType.RUN_ERROR)) {
      return [];
    }
    const finalizer = createRunEventFinalizer();
    for (const event of tail) finalizer.observe(event);
    const appended = finalizer.finalize({});
    const now = Date.now();
    for (const event of appended) {
      if (event.timestamp == null) event.timestamp = now;
    }
    const record = this.cache.get(threadId);
    if (appended.length > 0 && record && !record.running && !this.sealing.has(threadId)) {
      this.sealing.add(threadId);
      void this.store
        .appendEvents(threadId, record.agentId, appended, record.ownerId)
        .catch((error) => this.reportStoreError(error, threadId, "seal"))
        .finally(() => this.sealing.delete(threadId));
    }
    return appended;
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
   * @param request - The stop request (`threadId`, and `runId` to stop only that run).
   * @returns `true` if a stop was initiated; `false` when nothing is running,
   * `runId` names another run, a stop was already requested, or the abort threw.
   */
  stop(request: AgentRunnerStopRequest): Promise<boolean | undefined> {
    const record = this.cache.get(request.threadId);
    if (!record || !record.running || record.stopRequested) return Promise.resolve(false);
    if (request.runId !== undefined && record.runId !== request.runId) return Promise.resolve(false);
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
   * List threads that have at least one event, most recently updated first, as
   * CopilotKit `LocalThreadEndpointRecord`s. Served synchronously from the
   * in-memory index (call {@link KabooAgentRunner.hydrate} after a cold start).
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
      .filter(([, r]) => r.hasEvents)
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
   * Get the not-yet-persisted tail of a thread's in-flight run.
   *
   * Full event logs are no longer retained in memory (they are persisted
   * incrementally and dropped once committed), so this synchronous accessor
   * only sees what is still buffered. For the full log, read the store:
   * `await store.readEvents(threadId)` — or replay via `connect`.
   *
   * @param threadId - The thread to read.
   * @returns A copy of the in-flight run's unpersisted events (empty when idle).
   */
  getThreadEvents(threadId: string): BaseEvent[] {
    const run = this.cache.get(threadId)?.run;
    return run ? run.unpersisted.flatMap((event) => this.ownership.visible(event) ?? []) : [];
  }

  /**
   * Get a thread's latest state as the browser may see it, folded
   * incrementally as runs stream and hydrated from the store on cold start.
   *
   * @param threadId - The thread to read.
   * @returns The latest state without hidden keys, or `null` when unknown or never emitted.
   */
  getThreadState(threadId: string): Record<string, unknown> | null {
    return this.ownership.visibleState(this.cache.get(threadId)?.state ?? null);
  }

  /**
   * List the approvals an owner has remembered, newest first, for a settings
   * page. Empty when no {@link KabooApprovalOptions.grants | grant store} is
   * configured.
   *
   * @param ownerId - The owner, as `accessPolicy.ownerOf` reports it.
   * @returns The owner's grants across agents and threads.
   */
  async listGrants(ownerId: string): Promise<ToolGrant[]> {
    const grants = this.options.approvals?.grants;
    return grants ? grants.listForOwner(ownerId) : [];
  }

  /**
   * Revoke one of the owner's remembered approvals. Later calls of that tool
   * ask again. A no-op without a grant store, or for a grant someone else owns.
   *
   * @param ownerId - The owner, as `accessPolicy.ownerOf` reports it.
   * @param id - The grant's id, from {@link KabooAgentRunner.listGrants}.
   */
  async revokeGrant(ownerId: string, id: string): Promise<void> {
    await this.options.approvals?.grants?.revoke(ownerId, id);
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
