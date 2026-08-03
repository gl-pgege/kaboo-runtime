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
