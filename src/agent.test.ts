import { describe, expect, it } from "vitest";
import { KabooHttpAgent } from "./agent";

describe("KabooHttpAgent", () => {
  it("reads the service's capabilities once, beside its endpoint", async () => {
    const calls: string[] = [];
    const agent = new KabooHttpAgent({ url: "http://agent/invocations/" });
    agent.fetch = (async (url: string) => {
      calls.push(url);
      return new Response(JSON.stringify({ identity: { name: "lab" } }));
    }) as unknown as typeof agent.fetch;

    expect(await agent.getCapabilities()).toEqual({ identity: { name: "lab" } });
    expect(await agent.getCapabilities()).toEqual({ identity: { name: "lab" } });
    expect(calls).toEqual(["http://agent/invocations/capabilities"]);
  });

  it("reports no capabilities when the service does not answer", async () => {
    const agent = new KabooHttpAgent({ url: "http://agent/invocations" });
    agent.fetch = (async () => new Response("", { status: 404 })) as unknown as typeof agent.fetch;
    expect(await agent.getCapabilities()).toEqual({});
  });
});
