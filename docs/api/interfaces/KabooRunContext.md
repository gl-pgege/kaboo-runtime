[**@pgege/kaboo-runtime**](../README.md)

***

# Interface: KabooRunContext

Defined in: [src/approvals.ts:110](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/approvals.ts#L110)

Everything a run's hooks know about the run.

## Properties

### agentId

> **agentId**: `string`

Defined in: [src/approvals.ts:114](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/approvals.ts#L114)

The CopilotKit agent running.

***

### input

> **input**: `RunAgentInput`

Defined in: [src/approvals.ts:118](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/approvals.ts#L118)

The run's input as the client sent it.

***

### ownerId

> **ownerId**: `string` \| `null`

Defined in: [src/approvals.ts:116](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/approvals.ts#L116)

The thread's owner (from `accessPolicy.ownerOf`), or `null` when unknown.

***

### threadId

> **threadId**: `string`

Defined in: [src/approvals.ts:112](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/approvals.ts#L112)

The conversation.
