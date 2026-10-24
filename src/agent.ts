import { HttpAgent, type AgentCapabilities } from "@ag-ui/client";

/**
 * An `HttpAgent` for a kaboo-workflows service that also reports what the
 * service can do: its AG-UI `AgentCapabilities`, read once from
 * `<url>/capabilities`. CopilotKit includes them in its runtime info, where
 * `useCapabilities` reads them. A service that does not answer reports none.
 *
 * @example
 * ```ts
 * import { CopilotRuntime } from "@copilotkit/runtime/v2";
 * import { KabooHttpAgent } from "@pgege/kaboo-runtime";
 *
 * const runtime = new CopilotRuntime({
 *   agents: { kaboo: new KabooHttpAgent({ url: "http://localhost:8080/invocations" }) },
 * });
 * ```
 */
export class KabooHttpAgent extends HttpAgent {
  private capabilities?: Promise<AgentCapabilities>;

  getCapabilities(): Promise<AgentCapabilities> {
    this.capabilities ??= this.fetch(`${this.url.replace(/\/+$/, "")}/capabilities`, { headers: this.headers })
      .then((response) => (response.ok ? (response.json() as Promise<AgentCapabilities>) : {}))
      .catch(() => ({}));
    return this.capabilities;
  }
}
