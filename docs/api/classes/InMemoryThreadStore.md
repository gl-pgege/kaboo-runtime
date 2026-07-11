[**kaboo-runtime**](../README.md)

***

# Class: InMemoryThreadStore

Defined in: [src/stores/memory.ts:25](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/memory.ts#L25)

In-memory [ThreadStore](../interfaces/ThreadStore.md). Data lives for the life of the process — ideal
for local development, tests, and the demo. Use `PostgresThreadStore` (or a
custom store) for durable persistence.

## Example

```ts
import { createKabooRunner, InMemoryThreadStore } from "kaboo-runtime";

const runner = createKabooRunner(new InMemoryThreadStore());
```

## Implements

- [`ThreadStore`](../interfaces/ThreadStore.md)

## Constructors

### Constructor

> **new InMemoryThreadStore**(): `InMemoryThreadStore`

#### Returns

`InMemoryThreadStore`

## Methods

### appendEvents()

> **appendEvents**(`threadId`, `agentId`, `events`): `Promise`\<`void`\>

Defined in: [src/stores/memory.ts:38](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/memory.ts#L38)

Append a completed run's events (in order) to the thread's log.

#### Parameters

##### threadId

`string`

##### agentId

`string`

##### events

`objectOutputType`\<\{ `rawEvent`: `ZodOptional`\<`ZodAny`\>; `timestamp`: `ZodOptional`\<`ZodNumber`\>; `type`: `ZodNativeEnum`\<*typeof* `EventType`\>; \}, `ZodTypeAny`, `"passthrough"`\>[]

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`ThreadStore`](../interfaces/ThreadStore.md).[`appendEvents`](../interfaces/ThreadStore.md#appendevents)

***

### clear()

> **clear**(`threadId?`): `Promise`\<`void`\>

Defined in: [src/stores/memory.ts:72](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/memory.ts#L72)

Delete one thread's data, or all threads when `threadId` is omitted.

#### Parameters

##### threadId?

`string`

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`ThreadStore`](../interfaces/ThreadStore.md).[`clear`](../interfaces/ThreadStore.md#clear)

***

### listThreads()

> **listThreads**(): `Promise`\<[`StoredThread`](../interfaces/StoredThread.md)[]\>

Defined in: [src/stores/memory.ts:66](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/memory.ts#L66)

List every persisted thread, most recently updated first.

#### Returns

`Promise`\<[`StoredThread`](../interfaces/StoredThread.md)[]\>

#### Implementation of

[`ThreadStore`](../interfaces/ThreadStore.md).[`listThreads`](../interfaces/ThreadStore.md#listthreads)

***

### readEvents()

> **readEvents**(`threadId`): `Promise`\<`objectOutputType`\<\{ `rawEvent`: `ZodOptional`\<`ZodAny`\>; `timestamp`: `ZodOptional`\<`ZodNumber`\>; `type`: `ZodNativeEnum`\<*typeof* `EventType`\>; \}, `ZodTypeAny`, `"passthrough"`\>[]\>

Defined in: [src/stores/memory.ts:45](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/memory.ts#L45)

Read the thread's full event log, verbatim and in order.

#### Parameters

##### threadId

`string`

#### Returns

`Promise`\<`objectOutputType`\<\{ `rawEvent`: `ZodOptional`\<`ZodAny`\>; `timestamp`: `ZodOptional`\<`ZodNumber`\>; `type`: `ZodNativeEnum`\<*typeof* `EventType`\>; \}, `ZodTypeAny`, `"passthrough"`\>[]\>

#### Implementation of

[`ThreadStore`](../interfaces/ThreadStore.md).[`readEvents`](../interfaces/ThreadStore.md#readevents)

***

### readMessages()

> **readMessages**(`threadId`): `Promise`\<(\{ `content`: `string`; `encryptedValue?`: `string`; `id`: `string`; `name?`: `string`; `role`: `"developer"`; \} \| \{ `content`: `string`; `encryptedValue?`: `string`; `id`: `string`; `name?`: `string`; `role`: `"system"`; \} \| \{ `content?`: `string`; `encryptedValue?`: `string`; `id`: `string`; `name?`: `string`; `role`: `"assistant"`; `toolCalls?`: `object`[]; \} \| \{ `content`: `string` \| (\{ `text`: `string`; `type`: `"text"`; \} \| \{ `metadata?`: `unknown`; `source`: \{ `mimeType`: `string`; `type`: `"data"`; `value`: `string`; \} \| \{ `mimeType?`: ... \| ...; `type`: `"url"`; `value`: `string`; \}; `type`: `"image"`; \} \| \{ `metadata?`: `unknown`; `source`: \{ `mimeType`: `string`; `type`: `"data"`; `value`: `string`; \} \| \{ `mimeType?`: ... \| ...; `type`: `"url"`; `value`: `string`; \}; `type`: `"audio"`; \} \| \{ `metadata?`: `unknown`; `source`: \{ `mimeType`: `string`; `type`: `"data"`; `value`: `string`; \} \| \{ `mimeType?`: ... \| ...; `type`: `"url"`; `value`: `string`; \}; `type`: `"video"`; \} \| \{ `metadata?`: `unknown`; `source`: \{ `mimeType`: `string`; `type`: `"data"`; `value`: `string`; \} \| \{ `mimeType?`: ... \| ...; `type`: `"url"`; `value`: `string`; \}; `type`: `"document"`; \} \| \{ `data?`: `string`; `filename?`: `string`; `id?`: `string`; `mimeType`: `string`; `type`: `"binary"`; `url?`: `string`; \})[]; `encryptedValue?`: `string`; `id`: `string`; `name?`: `string`; `role`: `"user"`; \} \| \{ `content`: `string`; `encryptedValue?`: `string`; `error?`: `string`; `id`: `string`; `role`: `"tool"`; `toolCallId`: `string`; \} \| \{ `activityType`: `string`; `content`: `Record`\<`string`, `any`\>; `id`: `string`; `role`: `"activity"`; \} \| \{ `content`: `string`; `encryptedValue?`: `string`; `id`: `string`; `role`: `"reasoning"`; \})[]\>

Defined in: [src/stores/memory.ts:62](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/memory.ts#L62)

Read the derived message snapshot for a thread.

#### Parameters

##### threadId

`string`

#### Returns

`Promise`\<(\{ `content`: `string`; `encryptedValue?`: `string`; `id`: `string`; `name?`: `string`; `role`: `"developer"`; \} \| \{ `content`: `string`; `encryptedValue?`: `string`; `id`: `string`; `name?`: `string`; `role`: `"system"`; \} \| \{ `content?`: `string`; `encryptedValue?`: `string`; `id`: `string`; `name?`: `string`; `role`: `"assistant"`; `toolCalls?`: `object`[]; \} \| \{ `content`: `string` \| (\{ `text`: `string`; `type`: `"text"`; \} \| \{ `metadata?`: `unknown`; `source`: \{ `mimeType`: `string`; `type`: `"data"`; `value`: `string`; \} \| \{ `mimeType?`: ... \| ...; `type`: `"url"`; `value`: `string`; \}; `type`: `"image"`; \} \| \{ `metadata?`: `unknown`; `source`: \{ `mimeType`: `string`; `type`: `"data"`; `value`: `string`; \} \| \{ `mimeType?`: ... \| ...; `type`: `"url"`; `value`: `string`; \}; `type`: `"audio"`; \} \| \{ `metadata?`: `unknown`; `source`: \{ `mimeType`: `string`; `type`: `"data"`; `value`: `string`; \} \| \{ `mimeType?`: ... \| ...; `type`: `"url"`; `value`: `string`; \}; `type`: `"video"`; \} \| \{ `metadata?`: `unknown`; `source`: \{ `mimeType`: `string`; `type`: `"data"`; `value`: `string`; \} \| \{ `mimeType?`: ... \| ...; `type`: `"url"`; `value`: `string`; \}; `type`: `"document"`; \} \| \{ `data?`: `string`; `filename?`: `string`; `id?`: `string`; `mimeType`: `string`; `type`: `"binary"`; `url?`: `string`; \})[]; `encryptedValue?`: `string`; `id`: `string`; `name?`: `string`; `role`: `"user"`; \} \| \{ `content`: `string`; `encryptedValue?`: `string`; `error?`: `string`; `id`: `string`; `role`: `"tool"`; `toolCallId`: `string`; \} \| \{ `activityType`: `string`; `content`: `Record`\<`string`, `any`\>; `id`: `string`; `role`: `"activity"`; \} \| \{ `content`: `string`; `encryptedValue?`: `string`; `id`: `string`; `role`: `"reasoning"`; \})[]\>

#### Implementation of

[`ThreadStore`](../interfaces/ThreadStore.md).[`readMessages`](../interfaces/ThreadStore.md#readmessages)

***

### readState()

> **readState**(`threadId`): `Promise`\<`Record`\<`string`, `unknown`\> \| `null`\>

Defined in: [src/stores/memory.ts:49](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/memory.ts#L49)

Read the latest agent state (from the last STATE_SNAPSHOT), or `null`.

#### Parameters

##### threadId

`string`

#### Returns

`Promise`\<`Record`\<`string`, `unknown`\> \| `null`\>

#### Implementation of

[`ThreadStore`](../interfaces/ThreadStore.md).[`readState`](../interfaces/ThreadStore.md#readstate)

***

### saveMessages()

> **saveMessages**(`threadId`, `messages`): `Promise`\<`void`\>

Defined in: [src/stores/memory.ts:54](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/memory.ts#L54)

Persist the derived message snapshot for a thread.

#### Parameters

##### threadId

`string`

##### messages

(\{ `content`: `string`; `encryptedValue?`: `string`; `id`: `string`; `name?`: `string`; `role`: `"developer"`; \} \| \{ `content`: `string`; `encryptedValue?`: `string`; `id`: `string`; `name?`: `string`; `role`: `"system"`; \} \| \{ `content?`: `string`; `encryptedValue?`: `string`; `id`: `string`; `name?`: `string`; `role`: `"assistant"`; `toolCalls?`: `object`[]; \} \| \{ `content`: `string` \| (\{ `text`: `string`; `type`: `"text"`; \} \| \{ `metadata?`: `unknown`; `source`: \{ `mimeType`: `string`; `type`: `"data"`; `value`: `string`; \} \| \{ `mimeType?`: `string`; `type`: `"url"`; `value`: `string`; \}; `type`: `"image"`; \} \| \{ `metadata?`: `unknown`; `source`: \{ `mimeType`: `string`; `type`: `"data"`; `value`: `string`; \} \| \{ `mimeType?`: `string`; `type`: `"url"`; `value`: `string`; \}; `type`: `"audio"`; \} \| \{ `metadata?`: `unknown`; `source`: \{ `mimeType`: `string`; `type`: `"data"`; `value`: `string`; \} \| \{ `mimeType?`: `string`; `type`: `"url"`; `value`: `string`; \}; `type`: `"video"`; \} \| \{ `metadata?`: `unknown`; `source`: \{ `mimeType`: `string`; `type`: `"data"`; `value`: `string`; \} \| \{ `mimeType?`: `string`; `type`: `"url"`; `value`: `string`; \}; `type`: `"document"`; \} \| \{ `data?`: `string`; `filename?`: `string`; `id?`: `string`; `mimeType`: `string`; `type`: `"binary"`; `url?`: `string`; \})[]; `encryptedValue?`: `string`; `id`: `string`; `name?`: `string`; `role`: `"user"`; \} \| \{ `content`: `string`; `encryptedValue?`: `string`; `error?`: `string`; `id`: `string`; `role`: `"tool"`; `toolCallId`: `string`; \} \| \{ `activityType`: `string`; `content`: `Record`\<`string`, `any`\>; `id`: `string`; `role`: `"activity"`; \} \| \{ `content`: `string`; `encryptedValue?`: `string`; `id`: `string`; `role`: `"reasoning"`; \})[]

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`ThreadStore`](../interfaces/ThreadStore.md).[`saveMessages`](../interfaces/ThreadStore.md#savemessages)
