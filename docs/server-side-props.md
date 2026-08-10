# Server-side forwarded props

A run carries a side channel to the agent service — AG-UI's `forwardedProps`.
kaboo-workflows reads it for host context (`get_forwarded_props()`), for
attachment authorization, and, when the service is started with
`create_agui_app(..., session_config_key=...)`, for **the workflow config the run
should execute**.

Anything the browser puts there is, by definition, whatever the browser felt
like sending. Props that decide what runs or what the agent may reach belong to
the server. This page shows where to stamp them.

## The seam

`KabooAgentRunner` is a CopilotKit `AgentRunner`, and so is anything you wrap it
in. A thin decorator that fills in `request.input.forwardedProps` before
delegating puts every run through one place — chat turns, programmatic runs, and
resumes alike:

```ts
import { AgentRunner } from "@copilotkit/runtime/v2";
import type {
  AgentRunnerRunRequest,
  AgentRunnerConnectRequest,
  AgentRunnerIsRunningRequest,
  AgentRunnerStopRequest,
} from "@copilotkit/runtime/v2";
import type { BaseEvent } from "@ag-ui/client";
import { Observable, ReplaySubject } from "rxjs";

/** Fills in the props only the server can vouch for, then delegates. */
export class EnrichedRunner extends AgentRunner {
  constructor(
    private readonly inner: AgentRunner,
    private readonly enrich: (
      threadId: string,
      props: Record<string, unknown>,
    ) => Promise<Record<string, unknown>>,
  ) {
    super();
  }

  run(request: AgentRunnerRunRequest): Observable<BaseEvent> {
    const relay = new ReplaySubject<BaseEvent>();
    const incoming =
      (request.input.forwardedProps as Record<string, unknown> | undefined) ?? {};
    void this.enrich(request.threadId, incoming)
      .then((props) => {
        request.input.forwardedProps = props;
        this.inner.run(request).subscribe(relay);
      })
      .catch((error: unknown) => relay.error(error));
    return relay.asObservable();
  }

  connect(request: AgentRunnerConnectRequest): Observable<BaseEvent> {
    return this.inner.connect(request);
  }

  isRunning(request: AgentRunnerIsRunningRequest): Promise<boolean> {
    return this.inner.isRunning(request);
  }

  stop(request: AgentRunnerStopRequest): Promise<boolean | undefined> {
    return this.inner.stop(request);
  }
}
```

Mount it in place of the runner you have:

```ts no-verify
const runner = new EnrichedRunner(
  new KabooAgentRunner(store, { accessPolicy }),
  async (threadId, props) => ({
    ...props,
    workflow_config: await configForThread(threadId), // the run's YAML
    run_token: await mintRunToken(threadId),          // scoped, short-lived
  }),
);

const runtime = new CopilotRuntime({ agents: {}, runner });
```

## What belongs here

| Prop | Why the server |
|------|----------------|
| The run's workflow YAML | The client must not choose which agents, tools or MCP clients run. |
| Auth tokens the agent relays to your API | Minted per run and scoped, so a leaked transcript is not a credential. |
| Tenant / workspace / user identity | The one fact everything else is authorized against. |

Leave genuinely client-owned context — the page the user is on, a selection, a
UI preference — on the client's `forwardedProps`. The decorator spreads the
incoming object first, so both arrive together.

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
