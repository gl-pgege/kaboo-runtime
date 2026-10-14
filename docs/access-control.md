# Access control

kaboo-runtime ships **no HTTP layer** — authentication (verifying who the
caller is) always lives in your host app. What the runner *does* own is
**ownership data**: which subject each thread belongs to. Before 0.2.0 hosts
had to encode ownership into thread ids and re-parse them everywhere; now the
owner is a real field on the thread record.

## Recording owners

Pass an `accessPolicy` when creating the runner:

```ts
import { createKabooRunner, PostgresThreadStore } from "@pgege/kaboo-runtime";

const store = new PostgresThreadStore({ dsn: process.env.DATABASE_URL });
const runner = createKabooRunner(store, {
  accessPolicy: {
    // Resolve the owning subject for a thread — e.g. from your host's
    // thread-id convention, or a session lookup.
    ownerOf: (threadId) => threadId.split("__")[0] ?? null,
    // Disable the store-wide clearThreads() wipe (default: allowed).
    allowClearAll: false,
  },
});
```

When a run persists, the runner resolves `ownerOf(threadId)` and passes it to
`ThreadStore.appendEvents(..., ownerId)`. The Postgres store writes it to the
additive `owner_id` column (existing owners are preserved when a later run
passes none); the in-memory store keeps it on the record.

## Using owners

- **`runner.listThreads()`** populates each record's `createdById` from the
  stored owner (falling back to `ownerOf`, then `""`). Hosts filtering the
  CopilotKit thread list per caller compare against this real field instead of
  parsing ids.
- **`store.listThreads({ ownerId })`** returns only that subject's threads —
  useful for host-side dashboards or cleanup jobs.
- **`runner.clearThreads()`** throws when `allowClearAll: false`, so a bug or
  an over-broad admin endpoint can't wipe every tenant's conversations.

## Scope and honest limits

CopilotKit's thread-list handler does not pass the caller subject down to the
runner, so fully server-side scoping of the `threads/list` endpoint is not
possible from inside the runner today. The supported pattern is:

1. The runner records real owners and serves them as `createdById`.
2. The host verifies the caller (bearer auth, session) at its HTTP layer.
3. The host filters the list response by `createdById` — and applies any
   sharing rules of its own (e.g. threads attached to a shared work item).

Sharing semantics beyond "owner" (teams, roles, work-item collaborators) are
host concerns by design: the runner gives you the data point, your app decides
the policy.

## Remembered approvals

An agent built with kaboo-workflows can offer "Allow for this chat" and "Always
allow" on a tool approval. Remembering the decision is the host's job, and the
runner does it when you give it a grant store. Decisions belong to the thread's
owner, so remembering needs `accessPolicy.ownerOf`:

```ts
import { Pool } from "pg";
import {
  createKabooRunner,
  PostgresGrantStore,
  PostgresThreadStore,
  type ApprovalDecision,
} from "@pgege/kaboo-runtime";

declare function audit(decisions: ApprovalDecision[], ownerId: string | null): Promise<void>;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const runner = createKabooRunner(new PostgresThreadStore({ pool }), {
  accessPolicy: { ownerOf: (threadId) => threadId.split(":")[0] ?? null },
  approvals: {
    grants: new PostgresGrantStore({ pool }),
    onDecision: async (decisions, { ownerId }) => audit(decisions, ownerId),
  },
});
```

Before each run the runner:

1. Matches the run's `resume` answers against the approvals the agent is
   waiting on (`kaboo_session.approvals` in the stored state). Answers to
   anything else are ignored, and a scope the request did not offer is
   narrowed to `once`.
2. Saves "Allow for this chat" (this thread) and "Always allow" (every thread
   of the owner with this agent) as grants.
3. Awaits `onDecision` with the matched decisions — `approved`, `denied` (with
   the person's reason), `skipped` or `expired` — for audit, or to register the
   approval with a service that enforces it. If it throws, the run ends with an
   error and the requests stay pending.
4. Sends the owner's grants to the agent as `forwardedProps.kaboo_grants`,
   which is also how the agent knows it may offer the wider scopes.

Without a grant store, or without an owner, nothing is remembered and the agent
offers only "Approve". `InMemoryGrantStore` suits development; implement
`GrantStore` to keep grants where your app enforces them.

For a settings page, `runner.listGrants(ownerId)` lists an owner's grants and
`runner.revokeGrant(ownerId, id)` revokes one; a grant owned by someone else is
never touched.

## Tools that enforce their own approvals

Some tools ask for approval themselves: their service decides what a call
needs, refuses it with a `kaboo_approval` reply, and kaboo-workflows
(`interrupt.tool_approvals`) pauses the run for the person. The service
remembers the decision, not the runner. A decision on such a request carries
the tool's `request` id; hand it to that service in `onDecision`:

```ts
import { createKabooRunner, InMemoryThreadStore, type ApprovalDecision } from "@pgege/kaboo-runtime";

interface ApprovalService {
  decide(request: string, decision: ApprovalDecision, ownerId: string | null): Promise<void>;
}
declare function serviceFor(tool: string): ApprovalService | null;

const runner = createKabooRunner(new InMemoryThreadStore(), {
  accessPolicy: { ownerOf: (threadId) => threadId.split(":")[0] ?? null },
  approvals: {
    onDecision: async (decisions, { ownerId }) => {
      for (const decision of decisions) {
        if (!decision.request) continue;
        await serviceFor(decision.tool)?.decide(decision.request, decision, ownerId);
      }
    },
  },
});
```

What the runner guarantees:

- **`request` comes from the agent:** it is read from the request stored in
  `kaboo_session`, which comes only from the thread store. A `request` the
  browser sends in a resume payload is ignored.
- **Not a grant:** a decision with a `request` is never saved in the grant
  store, whatever its scope.
- **Only the owner answers:** with an access policy, only the thread's owner
  can resume it.

What the host must do:

- **Forward a decision only to the service whose tool asked,** matching the
  tool's name to that service.
- **Wait for the service to acknowledge** before the run continues. `onDecision`
  is awaited; if it throws, the run ends with an error and the request stays
  pending, so the person can answer again.

The service has its own checklist (random IDs bound to the person,
conversation, resource and call; decisions honoured once, only from the host):
see kaboo-workflows'
[Tools that enforce their own approvals](https://gl-pgege.github.io/kaboo-workflows/workflows/human-in-the-loop/#tools-that-enforce-their-own-approvals).

