import { describe, it, expect } from "vitest";
import { resolveApprovalDecisions } from "./approvals";

const waiting = (extra: Record<string, unknown> = {}) => ({
  kaboo_sessions: {
    approvals: [
      {
        interruptId: "i1",
        toolCallId: "c1",
        tool: "submit_report",
        subject: { key: "submit_report", label: "Submit report" },
        scopes: ["once", "thread"],
        input: { title: "Q3 draft" },
        ...extra,
      },
    ],
  },
});

describe("resolveApprovalDecisions", () => {
  it("matches an approval to what the agent asked, with its scope", () => {
    const [decision] = resolveApprovalDecisions(
      [{ interruptId: "i1", status: "resolved", payload: { status: "approved", scope: "thread" } }],
      waiting(),
    );
    expect(decision).toEqual({
      interruptId: "i1",
      toolCallId: "c1",
      tool: "submit_report",
      subject: { key: "submit_report", label: "Submit report" },
      decision: "approved",
      scope: "thread",
      input: { title: "Q3 draft" },
    });
  });

  it("narrows a scope the request did not offer to once", () => {
    const [decision] = resolveApprovalDecisions(
      [{ interruptId: "i1", status: "resolved", payload: { status: "approved", scope: "always" } }],
      waiting(),
    );
    expect(decision.scope).toBe("once");
  });

  it("carries the person's edit as the call's input", () => {
    const [decision] = resolveApprovalDecisions(
      [
        {
          interruptId: "i1",
          status: "resolved",
          payload: { status: "approved", tool_input: { title: "Q3 final" } },
        },
      ],
      waiting(),
    );
    expect(decision.input).toEqual({ title: "Q3 final" });
  });

  it.each([
    [{ status: "resolved", payload: { status: "cancelled", reason: " wrong title " } }, "denied", "wrong title"],
    [{ status: "resolved", payload: { status: "cancelled" } }, "denied", undefined],
    [{ status: "cancelled" }, "skipped", undefined],
    [{ status: "resolved", payload: { status: "maybe" } }, "skipped", undefined],
    [{ status: "resolved" }, "skipped", undefined],
  ] as const)("classifies %o as %s", (answer, decision, reason) => {
    const [result] = resolveApprovalDecisions([{ interruptId: "i1", ...answer }], waiting());
    expect(result.decision).toBe(decision);
    expect(result.reason).toBe(reason);
    expect(result.scope).toBe("once");
  });

  it("reports an answer after the deadline as expired", () => {
    const [decision] = resolveApprovalDecisions(
      [{ interruptId: "i1", status: "resolved", payload: { status: "approved", scope: "thread" } }],
      waiting({ expiresAt: "2026-01-01T00:00:00Z" }),
      Date.parse("2026-01-02T00:00:00Z"),
    );
    expect(decision.decision).toBe("expired");
    expect(decision.scope).toBe("once");
  });

  it("carries a tool's request id from the stored request, never from the payload", () => {
    const [fromTool] = resolveApprovalDecisions(
      [{ interruptId: "i1", status: "resolved", payload: { status: "approved", request: "forged" } }],
      waiting({ request: "apr_7Qm2" }),
    );
    expect(fromTool.request).toBe("apr_7Qm2");

    const [gated] = resolveApprovalDecisions(
      [{ interruptId: "i1", status: "resolved", payload: { status: "approved", request: "forged" } }],
      waiting(),
    );
    expect(gated).not.toHaveProperty("request");
  });

  it("ignores answers to anything the agent is not waiting on", () => {
    expect(
      resolveApprovalDecisions(
        [{ interruptId: "question-1", status: "resolved", payload: { "Which?": "AI" } }],
        waiting(),
      ),
    ).toEqual([]);
    expect(
      resolveApprovalDecisions([{ interruptId: "i1", status: "resolved", payload: {} }], null),
    ).toEqual([]);
  });
});
