# Server-side forwarded props

A run carries a side channel to the agent service — AG-UI's `forwardedProps`.
kaboo-workflows reads it for host context (`get_forwarded_props()`), for
attachment authorization, and, when the service is started with
`create_agui_app(..., session_config_key=...)`, for **the workflow config the run
should execute**.

Anything the browser puts there is, by definition, whatever the browser felt
like sending. Props that decide what runs or what the agent may reach belong to
the server. This page shows where to stamp them.

## The seam: `enrich`

Pass `enrich` to the runner. It runs before every run — chat turns,
programmatic runs and resumes alike — and its return value **replaces** the
client's `forwardedProps`, so keep client values by spreading
`input.forwardedProps` first and leave out anything only the server may set:

```ts
import { CopilotRuntime } from "@copilotkit/runtime/v2";
import { createKabooRunner, InMemoryThreadStore } from "@pgege/kaboo-runtime";

declare function configForThread(threadId: string): Promise<string>;
declare function mintRunToken(ownerId: string | null): Promise<string>;

const runner = createKabooRunner(new InMemoryThreadStore(), {
  accessPolicy: { ownerOf: (threadId) => threadId.split(":")[0] ?? null },
  enrich: async ({ threadId, ownerId, input }) => {
    const { workflow_config: _ignored, ...client } =
      (input.forwardedProps as Record<string, unknown> | undefined) ?? {};
    return {
      ...client,
      workflow_config: await configForThread(threadId), // the run's YAML
      run_token: await mintRunToken(ownerId), // scoped, short-lived
    };
  },
});

const runtime = new CopilotRuntime({ agents: {}, runner });
```

`enrich` receives the thread id, the agent id, the owner (from
`accessPolicy.ownerOf`) and the run's input. If it throws, the run ends with an
error and the agent never runs.

## What belongs here

| Prop | Why the server |
|------|----------------|
| The run's workflow YAML | The client must not choose which agents, tools or MCP clients run. |
| Auth tokens the agent relays to your API | Minted per run and scoped, so a leaked transcript is not a credential. |
| Tenant / workspace / user identity | The one fact everything else is authorized against. |

Leave genuinely client-owned context — the page the user is on, a selection, a
UI preference — on the client's `forwardedProps`; spread them into the result
as above.

## One prop the runner owns

`kaboo_grants` — the approvals the person remembered ("Allow for this chat",
"Always allow") — is always set by the runner, after `enrich`, and never taken
from the client or from `enrich`: a browser cannot grant itself a permission.
It is sent only when the runner has a grant store; see
[Access control](access-control.md#remembered-approvals).

## Resolving per turn, not per thread

A continuation turn arrives with a thread id and nothing else, so `enrich` runs
on every turn rather than once at thread creation. Read the config from your
database each time and an edit takes effect on the next turn, with no cache to
invalidate. Persisting the exact string you sent alongside the run is worth the
column: it is the only record of what actually executed.

## What it does not carry

Conversation state. History (`kaboo_history`) and pending approvals
(`kaboo_session`) travel on the AG-UI state channel, which the runner replays
from the store on its own — see [Replay & state](replay-and-state.md). Putting
either in `forwardedProps` would fight the mechanism that already handles them.
