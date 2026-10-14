[**@pgege/kaboo-runtime**](../README.md)

***

# Interface: ToolGrant

Defined in: src/approvals.ts:26

A remembered approval: calls of `tool` about `subject` run without asking,
in one conversation (`threadId`) or in all of the owner's conversations with
the agent (`threadId: null`).

## Properties

### agentId

> **agentId**: `string`

Defined in: src/approvals.ts:32

The CopilotKit agent it applies to.

***

### createdAt

> **createdAt**: `number`

Defined in: src/approvals.ts:42

When it was granted, epoch milliseconds.

***

### id

> **id**: `string`

Defined in: src/approvals.ts:28

Store-assigned id, used to revoke the grant.

***

### label

> **label**: `string`

Defined in: src/approvals.ts:40

Human label for the subject.

***

### ownerId

> **ownerId**: `string`

Defined in: src/approvals.ts:30

The person who granted it.

***

### subject

> **subject**: `string`

Defined in: src/approvals.ts:38

The subject key the decision covers.

***

### threadId

> **threadId**: `string` \| `null`

Defined in: src/approvals.ts:34

The conversation it applies to, or `null` for every conversation ("always").

***

### tool

> **tool**: `string`

Defined in: src/approvals.ts:36

The gated tool's name, as the agent calls it.
