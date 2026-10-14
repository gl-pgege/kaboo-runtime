import type { RunAgentInput } from "@ag-ui/client";

/**
 * `forwardedProps` key carrying the decisions the host remembers, read by
 * kaboo-workflows' tool gate. The runner always replaces a client-sent value,
 * so only the host can grant a permission.
 */
export const KABOO_GRANTS_PROP = "kaboo_grants";

/** How far a person's approval reaches: this call, this conversation, or from now on. */
export type ApprovalScope = "once" | "thread" | "always";

/** What a remembered decision covers, as the agent described it. */
export interface ApprovalSubject {
  /** Stable key the agent matches calls against (by default the tool name). */
  key: string;
  /** Human label for settings pages and cards. */
  label: string;
}

/**
 * A remembered approval: calls of `tool` about `subject` run without asking,
 * in one conversation (`threadId`) or in all of the owner's conversations with
 * the agent (`threadId: null`).
 */
export interface ToolGrant {
  /** Store-assigned id, used to revoke the grant. */
  id: string;
  /** The person who granted it. */
  ownerId: string;
  /** The CopilotKit agent it applies to. */
  agentId: string;
  /** The conversation it applies to, or `null` for every conversation ("always"). */
  threadId: string | null;
  /** The gated tool's name, as the agent calls it. */
  tool: string;
  /** The subject key the decision covers. */
  subject: string;
  /** Human label for the subject. */
  label: string;
  /** When it was granted, epoch milliseconds. */
  createdAt: number;
}

/** A grant to save; the store assigns `id` and `createdAt`. */
export type NewToolGrant = Omit<ToolGrant, "id" | "createdAt">;

/** Which grants a run sees: the owner's "always" grants plus this conversation's. */
export interface GrantQuery {
  /** The thread's owner. */
  ownerId: string;
  /** The agent running. */
  agentId: string;
  /** The conversation running. */
  threadId: string;
}

/**
 * Pluggable persistence for remembered approvals — the counterpart of
 * {@link ThreadStore} for decisions. `kaboo-runtime` ships
 * `InMemoryGrantStore` and `PostgresGrantStore`; apps that must enforce
 * grants elsewhere (their own domain service) implement this against it.
 */
export interface GrantStore {
  /** The grants a run may use: the owner's "always" grants and the thread's own. */
  list(query: GrantQuery): Promise<ToolGrant[]>;
  /** Save a grant, replacing an identical one (same owner, agent, thread, tool, subject). */
  save(grant: NewToolGrant): Promise<ToolGrant>;
  /** Revoke one of the owner's grants. A grant owned by someone else is left alone. */
  revoke(ownerId: string, id: string): Promise<void>;
  /** Every grant the owner holds, for a settings page. */
  listForOwner(ownerId: string): Promise<ToolGrant[]>;
}

/**
 * A person's answer to one approval request, matched against what the agent
 * actually asked (`kaboo_session.approvals`), never against client claims.
 */
export interface ApprovalDecision {
  /** The AG-UI interrupt id answered. */
  interruptId: string;
  /** The tool call the request was raised for, when known. */
  toolCallId: string | null;
  /** The gated tool. */
  tool: string;
  /** What a remembered decision covers. */
  subject: ApprovalSubject;
  /**
   * `approved`, `denied` (with an optional `reason`), `skipped` (the Skip
   * button or dismissing a card), or `expired` (answered after the deadline).
   */
  decision: "approved" | "denied" | "skipped" | "expired";
  /** For an approval, how far it reaches; `once` otherwise. */
  scope: ApprovalScope;
  /** The person's reason for a denial. */
  reason?: string;
  /** The input the call runs with: the agent's, or the person's edit. */
  input: unknown;
  /**
   * The tool's own request id, when the tool asked for this approval itself
   * (a `kaboo_approval` reply). Read from the request the agent published,
   * never from the client. Forward the decision to that tool's service in
   * {@link KabooApprovalOptions.onDecision}; the runner never saves it as a
   * grant, because the service remembers it.
   */
  request?: string;
}

/** Everything a run's hooks know about the run. */
export interface KabooRunContext {
  /** The conversation. */
  threadId: string;
  /** The CopilotKit agent running. */
  agentId: string;
  /** The thread's owner (from `accessPolicy.ownerOf`), or `null` when unknown. */
  ownerId: string | null;
  /** The run's input as the client sent it. */
  input: RunAgentInput;
}

/** Options for remembered approvals — see {@link KabooRunnerOptions.approvals}. */
export interface KabooApprovalOptions {
  /**
   * Where remembered decisions live. When set (and the thread has an owner),
   * the runner saves "allow for this chat" and "always allow" answers and
   * hands every run the owner's permissions, which is also what tells the
   * agent it may offer those scopes. Omit it to offer only "approve once".
   * Decisions on requests a tool raised itself are never saved here.
   */
  grants?: GrantStore;
  /**
   * Called with the person's decisions before the run continues, after
   * grants are saved — for audit, or to register approvals with a service
   * that enforces them. A decision with a `request` came from a tool that
   * enforces its own approvals: forward it to that tool's service, and only
   * to it. If this throws, the run ends with an error and the requests stay
   * pending.
   */
  onDecision?: (decisions: ApprovalDecision[], context: KabooRunContext) => void | Promise<void>;
}

const SCOPES: readonly ApprovalScope[] = ["once", "thread", "always"];

interface OpenApproval {
  interruptId: string;
  toolCallId: string | null;
  tool: string;
  subject: ApprovalSubject;
  scopes: ApprovalScope[];
  input: unknown;
  expiresAt?: string;
  request?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function openApprovals(state: Record<string, unknown> | null): Map<string, OpenApproval> {
  const open = new Map<string, OpenApproval>();
  const session = state?.kaboo_session;
  const approvals = isRecord(session) ? session.approvals : undefined;
  if (!Array.isArray(approvals)) return open;
  for (const raw of approvals) {
    if (!isRecord(raw) || typeof raw.interruptId !== "string" || typeof raw.tool !== "string") {
      continue;
    }
    const subject = isRecord(raw.subject) && typeof raw.subject.key === "string"
      ? { key: raw.subject.key, label: String(raw.subject.label ?? raw.subject.key) }
      : { key: raw.tool, label: raw.tool };
    const scopes = Array.isArray(raw.scopes)
      ? raw.scopes.filter((s): s is ApprovalScope => SCOPES.includes(s as ApprovalScope))
      : [];
    open.set(raw.interruptId, {
      interruptId: raw.interruptId,
      toolCallId: typeof raw.toolCallId === "string" ? raw.toolCallId : null,
      tool: raw.tool,
      subject,
      scopes: scopes.length > 0 ? scopes : ["once"],
      input: raw.input,
      expiresAt: typeof raw.expiresAt === "string" ? raw.expiresAt : undefined,
      request: typeof raw.request === "string" && raw.request ? raw.request : undefined,
    });
  }
  return open;
}

/**
 * Match a run's `resume` entries against the approvals the agent is waiting
 * on (`state.kaboo_session.approvals`, as persisted from the agent's own
 * snapshot). Entries for anything else — questions, unknown ids — are
 * ignored, a scope the request did not offer is narrowed to `once`, and a
 * tool's `request` id comes from the stored request, never from the payload.
 *
 * @param resume - The run's AG-UI `resume` entries.
 * @param state - The thread's persisted state.
 * @param now - The current time, epoch milliseconds.
 * @returns One decision per answered approval, in the client's order.
 */
export function resolveApprovalDecisions(
  resume: RunAgentInput["resume"],
  state: Record<string, unknown> | null,
  now: number = Date.now(),
): ApprovalDecision[] {
  if (!resume || resume.length === 0) return [];
  const open = openApprovals(state);
  const decisions: ApprovalDecision[] = [];
  for (const entry of resume) {
    const request = open.get(entry.interruptId);
    if (!request) continue;
    const base = {
      interruptId: request.interruptId,
      toolCallId: request.toolCallId,
      tool: request.tool,
      subject: request.subject,
      scope: "once" as ApprovalScope,
      input: request.input,
      ...(request.request ? { request: request.request } : {}),
    };
    if (request.expiresAt && Date.parse(request.expiresAt) <= now) {
      decisions.push({ ...base, decision: "expired" });
      continue;
    }
    const payload = entry.status === "resolved" ? (entry.payload ?? { status: "approved" }) : null;
    if (!isRecord(payload) || payload.skipped || payload.expired) {
      decisions.push({ ...base, decision: "skipped" });
    } else if (payload.status === "approved") {
      const scope = SCOPES.includes(payload.scope as ApprovalScope) &&
        request.scopes.includes(payload.scope as ApprovalScope)
        ? (payload.scope as ApprovalScope)
        : "once";
      const input = isRecord(payload.tool_input) ? payload.tool_input : request.input;
      decisions.push({ ...base, decision: "approved", scope, input });
    } else if (payload.status === "cancelled") {
      const reason = typeof payload.reason === "string" && payload.reason.trim()
        ? payload.reason.trim()
        : undefined;
      decisions.push({ ...base, decision: "denied", ...(reason ? { reason } : {}) });
    } else {
      decisions.push({ ...base, decision: "skipped" });
    }
  }
  return decisions;
}
