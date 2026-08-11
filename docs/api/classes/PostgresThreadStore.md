[**@pgege/kaboo-runtime**](../README.md)

***

# Class: PostgresThreadStore

Defined in: [src/stores/postgres.ts:32](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/postgres.ts#L32)

Durable [ThreadStore](../interfaces/ThreadStore.md) backed by Postgres. Uses its own conversation
tables (`kaboo_threads`, `kaboo_thread_events`, `kaboo_thread_messages`),
independent of any application schema. `pg` is an optional peer dependency —
install it in the host app to use this store.

## Example

```ts
import { createKabooRunner, PostgresThreadStore } from "@pgege/kaboo-runtime";

const store = new PostgresThreadStore({ dsn: process.env.DATABASE_URL });
const runner = createKabooRunner(store);
```

## Implements

- [`ThreadStore`](../interfaces/ThreadStore.md)

## Constructors

### Constructor

> **new PostgresThreadStore**(`options`): `PostgresThreadStore`

Defined in: [src/stores/postgres.ts:37](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/postgres.ts#L37)

#### Parameters

##### options

[`PostgresThreadStoreOptions`](../interfaces/PostgresThreadStoreOptions.md)

#### Returns

`PostgresThreadStore`

## Methods

### appendEvents()

> **appendEvents**(`threadId`, `agentId`, `events`, `ownerId?`): `Promise`\<`void`\>

Defined in: [src/stores/postgres.ts:85](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/postgres.ts#L85)

Append a completed run's events (in order) to the thread's log.

`ownerId` records the owning subject on the thread (the runner passes it
from [accessPolicy.ownerOf](../interfaces/KabooRunnerOptions.md#accesspolicy)). A
nullish value must preserve any owner already recorded.

#### Parameters

##### threadId

`string`

##### agentId

`string`

##### events

`objectOutputType`\<\{ `rawEvent`: `ZodOptional`\<`ZodAny`\>; `timestamp`: `ZodOptional`\<`ZodNumber`\>; `type`: `ZodNativeEnum`\<*typeof* `EventType`\>; \}, `ZodTypeAny`, `"passthrough"`\>[]

##### ownerId?

`string` \| `null`

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`ThreadStore`](../interfaces/ThreadStore.md).[`appendEvents`](../interfaces/ThreadStore.md#appendevents)

***

### clear()

> **clear**(`threadId?`): `Promise`\<`void`\>

Defined in: [src/stores/postgres.ts:191](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/postgres.ts#L191)

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

> **listThreads**(`filter?`): `Promise`\<[`StoredThread`](../interfaces/StoredThread.md)[]\>

Defined in: [src/stores/postgres.ts:165](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/postgres.ts#L165)

List persisted threads, most recently updated first. With
`filter.ownerId`, only that subject's threads are returned.

#### Parameters

##### filter?

[`ListThreadsFilter`](../interfaces/ListThreadsFilter.md)

#### Returns

`Promise`\<[`StoredThread`](../interfaces/StoredThread.md)[]\>

#### Implementation of

[`ThreadStore`](../interfaces/ThreadStore.md).[`listThreads`](../interfaces/ThreadStore.md#listthreads)

***

### readEvents()

> **readEvents**(`threadId`): `Promise`\<`objectOutputType`\<\{ `rawEvent`: `ZodOptional`\<`ZodAny`\>; `timestamp`: `ZodOptional`\<`ZodNumber`\>; `type`: `ZodNativeEnum`\<*typeof* `EventType`\>; \}, `ZodTypeAny`, `"passthrough"`\>[]\>

Defined in: [src/stores/postgres.ts:122](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/postgres.ts#L122)

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

Defined in: [src/stores/postgres.ts:156](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/postgres.ts#L156)

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

Defined in: [src/stores/postgres.ts:131](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/postgres.ts#L131)

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

Defined in: [src/stores/postgres.ts:146](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/postgres.ts#L146)

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
