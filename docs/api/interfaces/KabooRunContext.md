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

> **input**: `object`

Defined in: [src/approvals.ts:118](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/approvals.ts#L118)

The run's input as the client sent it.

#### context

> **context**: `object`[]

#### forwardedProps?

> `optional` **forwardedProps?**: `any`

#### messages

> **messages**: (\{ `content`: `string`; `encryptedValue?`: `string`; `id`: `string`; `name?`: `string`; `role`: `"developer"`; \} \| \{ `content`: `string`; `encryptedValue?`: `string`; `id`: `string`; `name?`: `string`; `role`: `"system"`; \} \| \{ `content?`: `string`; `encryptedValue?`: `string`; `id`: `string`; `name?`: `string`; `role`: `"assistant"`; `toolCalls?`: `object`[]; \} \| \{ `content`: `string` \| (\{ `text`: `string`; `type`: `"text"`; \} \| \{ `metadata?`: `unknown`; `source`: \{ `mimeType`: `string`; `type`: `"data"`; `value`: `string`; \} \| \{ `mimeType?`: ... \| ...; `type`: `"url"`; `value`: `string`; \}; `type`: `"image"`; \} \| \{ `metadata?`: `unknown`; `source`: \{ `mimeType`: `string`; `type`: `"data"`; `value`: `string`; \} \| \{ `mimeType?`: ... \| ...; `type`: `"url"`; `value`: `string`; \}; `type`: `"audio"`; \} \| \{ `metadata?`: `unknown`; `source`: \{ `mimeType`: `string`; `type`: `"data"`; `value`: `string`; \} \| \{ `mimeType?`: ... \| ...; `type`: `"url"`; `value`: `string`; \}; `type`: `"video"`; \} \| \{ `metadata?`: `unknown`; `source`: \{ `mimeType`: `string`; `type`: `"data"`; `value`: `string`; \} \| \{ `mimeType?`: ... \| ...; `type`: `"url"`; `value`: `string`; \}; `type`: `"document"`; \} \| \{ `data?`: `string`; `filename?`: `string`; `id?`: `string`; `mimeType`: `string`; `type`: `"binary"`; `url?`: `string`; \})[]; `encryptedValue?`: `string`; `id`: `string`; `name?`: `string`; `role`: `"user"`; \} \| \{ `content`: `string`; `encryptedValue?`: `string`; `error?`: `string`; `id`: `string`; `role`: `"tool"`; `toolCallId`: `string`; \} \| \{ `activityType`: `string`; `content`: `Record`\<`string`, `any`\>; `id`: `string`; `role`: `"activity"`; \} \| \{ `content`: `string`; `encryptedValue?`: `string`; `id`: `string`; `role`: `"reasoning"`; \})[]

#### parentRunId?

> `optional` **parentRunId?**: `string`

#### resume?

> `optional` **resume?**: `object`[]

#### runId

> **runId**: `string`

#### state?

> `optional` **state?**: `any`

#### threadId

> **threadId**: `string`

#### tools

> **tools**: `object`[]

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
