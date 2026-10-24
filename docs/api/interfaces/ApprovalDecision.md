[**@pgege/kaboo-runtime**](../README.md)

***

# Interface: ApprovalDecision

Defined in: [src/approvals.ts:79](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/approvals.ts#L79)

A person's answer to one approval request, matched against what the agent
actually asked (`kaboo_sessions.approvals`), never against client claims.

## Properties

### decision

> **decision**: `"approved"` \| `"denied"` \| `"skipped"` \| `"expired"`

Defined in: [src/approvals.ts:92](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/approvals.ts#L92)

`approved`, `denied` (with an optional `reason`), `skipped` (the Skip
button or dismissing a card), or `expired` (answered after the deadline).

***

### input

> **input**: `unknown`

Defined in: [src/approvals.ts:98](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/approvals.ts#L98)

The input the call runs with: the agent's, or the person's edit.

***

### interruptId

> **interruptId**: `string`

Defined in: [src/approvals.ts:81](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/approvals.ts#L81)

The AG-UI interrupt id answered.

***

### reason?

> `optional` **reason?**: `string`

Defined in: [src/approvals.ts:96](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/approvals.ts#L96)

The person's reason for a denial.

***

### request?

> `optional` **request?**: `string`

Defined in: [src/approvals.ts:106](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/approvals.ts#L106)

The tool's own request id, when the tool asked for this approval itself
(a `kaboo_approval` reply). Read from the request the agent published,
never from the client. Forward the decision to that tool's service in
[KabooApprovalOptions.onDecision](KabooApprovalOptions.md#ondecision); the runner never saves it as a
grant, because the service remembers it.

***

### scope

> **scope**: [`ApprovalScope`](../type-aliases/ApprovalScope.md)

Defined in: [src/approvals.ts:94](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/approvals.ts#L94)

For an approval, how far it reaches; `once` otherwise.

***

### subject

> **subject**: [`ApprovalSubject`](ApprovalSubject.md)

Defined in: [src/approvals.ts:87](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/approvals.ts#L87)

What a remembered decision covers.

***

### tool

> **tool**: `string`

Defined in: [src/approvals.ts:85](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/approvals.ts#L85)

The gated tool.

***

### toolCallId

> **toolCallId**: `string` \| `null`

Defined in: [src/approvals.ts:83](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/approvals.ts#L83)

The tool call the request was raised for, when known.
