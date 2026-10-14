[**@pgege/kaboo-runtime**](../README.md)

***

# Function: resolveApprovalDecisions()

> **resolveApprovalDecisions**(`resume`, `state`, `now?`): [`ApprovalDecision`](../interfaces/ApprovalDecision.md)[]

Defined in: [src/approvals.ts:200](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/approvals.ts#L200)

Match a run's `resume` entries against the approvals the agent is waiting
on (`state.kaboo_session.approvals`, as persisted from the agent's own
snapshot). Entries for anything else — questions, unknown ids — are
ignored, a scope the request did not offer is narrowed to `once`, and a
tool's `request` id comes from the stored request, never from the payload.

## Parameters

### resume

`ResumeEntry`[] \| `undefined`

The run's AG-UI `resume` entries.

### state

`Record`\<`string`, `unknown`\> \| `null`

The thread's persisted state.

### now?

`number` = `...`

The current time, epoch milliseconds.

## Returns

[`ApprovalDecision`](../interfaces/ApprovalDecision.md)[]

One decision per answered approval, in the client's order.
