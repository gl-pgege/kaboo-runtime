[**@kaboo/runtime**](../README.md)

***

# Interface: ThreadStore

Defined in: [src/store.ts:25](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/store.ts#L25)

Pluggable persistence for a thread's full AG-UI event log.

This is the extension point: implement it against your own database to
control where conversations live. `kaboo-runtime` ships `InMemoryThreadStore`
and `PostgresThreadStore` out of the box.

The store persists events verbatim (no compaction) so `ACTIVITY_SNAPSHOT` /
`CUSTOM` events survive the round-trip and the full UI can be replayed.

## Methods

### appendEvents()

> **appendEvents**(`threadId`, `agentId`, `events`): `Promise`\<`void`\>

Defined in: [src/store.ts:27](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/store.ts#L27)

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

***

### clear()

> **clear**(`threadId?`): `Promise`\<`void`\>

Defined in: [src/store.ts:39](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/store.ts#L39)

Delete one thread's data, or all threads when `threadId` is omitted.

#### Parameters

##### threadId?

`string`

#### Returns

`Promise`\<`void`\>

***

### listThreads()

> **listThreads**(): `Promise`\<[`StoredThread`](StoredThread.md)[]\>

Defined in: [src/store.ts:37](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/store.ts#L37)

List every persisted thread, most recently updated first.

#### Returns

`Promise`\<[`StoredThread`](StoredThread.md)[]\>

***

### readEvents()

> **readEvents**(`threadId`): `Promise`\<`objectOutputType`\<\{ `rawEvent`: `ZodOptional`\<`ZodAny`\>; `timestamp`: `ZodOptional`\<`ZodNumber`\>; `type`: `ZodNativeEnum`\<*typeof* `EventType`\>; \}, `ZodTypeAny`, `"passthrough"`\>[]\>

Defined in: [src/store.ts:29](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/store.ts#L29)

Read the thread's full event log, verbatim and in order.

#### Parameters

##### threadId

`string`

#### Returns

`Promise`\<`objectOutputType`\<\{ `rawEvent`: `ZodOptional`\<`ZodAny`\>; `timestamp`: `ZodOptional`\<`ZodNumber`\>; `type`: `ZodNativeEnum`\<*typeof* `EventType`\>; \}, `ZodTypeAny`, `"passthrough"`\>[]\>

***

### readMessages()

> **readMessages**(`threadId`): `Promise`\<(\{ `content`: `string`; `encryptedValue?`: `string`; `id`: `string`; `name?`: `string`; `role`: `"developer"`; \} \| \{ `content`: `string`; `encryptedValue?`: `string`; `id`: `string`; `name?`: `string`; `role`: `"system"`; \} \| \{ `content?`: `string`; `encryptedValue?`: `string`; `id`: `string`; `name?`: `string`; `role`: `"assistant"`; `toolCalls?`: `object`[]; \} \| \{ `content`: `string` \| (\{ `text`: `string`; `type`: `"text"`; \} \| \{ `metadata?`: `unknown`; `source`: \{ `mimeType`: `string`; `type`: `"data"`; `value`: `string`; \} \| \{ `mimeType?`: ... \| ...; `type`: `"url"`; `value`: `string`; \}; `type`: `"image"`; \} \| \{ `metadata?`: `unknown`; `source`: \{ `mimeType`: `string`; `type`: `"data"`; `value`: `string`; \} \| \{ `mimeType?`: ... \| ...; `type`: `"url"`; `value`: `string`; \}; `type`: `"audio"`; \} \| \{ `metadata?`: `unknown`; `source`: \{ `mimeType`: `string`; `type`: `"data"`; `value`: `string`; \} \| \{ `mimeType?`: ... \| ...; `type`: `"url"`; `value`: `string`; \}; `type`: `"video"`; \} \| \{ `metadata?`: `unknown`; `source`: \{ `mimeType`: `string`; `type`: `"data"`; `value`: `string`; \} \| \{ `mimeType?`: ... \| ...; `type`: `"url"`; `value`: `string`; \}; `type`: `"document"`; \} \| \{ `data?`: `string`; `filename?`: `string`; `id?`: `string`; `mimeType`: `string`; `type`: `"binary"`; `url?`: `string`; \})[]; `encryptedValue?`: `string`; `id`: `string`; `name?`: `string`; `role`: `"user"`; \} \| \{ `content`: `string`; `encryptedValue?`: `string`; `error?`: `string`; `id`: `string`; `role`: `"tool"`; `toolCallId`: `string`; \} \| \{ `activityType`: `string`; `content`: `Record`\<`string`, `any`\>; `id`: `string`; `role`: `"activity"`; \} \| \{ `content`: `string`; `encryptedValue?`: `string`; `id`: `string`; `role`: `"reasoning"`; \})[]\>

Defined in: [src/store.ts:35](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/store.ts#L35)

Read the derived message snapshot for a thread.

#### Parameters

##### threadId

`string`

#### Returns

`Promise`\<(\{ `content`: `string`; `encryptedValue?`: `string`; `id`: `string`; `name?`: `string`; `role`: `"developer"`; \} \| \{ `content`: `string`; `encryptedValue?`: `string`; `id`: `string`; `name?`: `string`; `role`: `"system"`; \} \| \{ `content?`: `string`; `encryptedValue?`: `string`; `id`: `string`; `name?`: `string`; `role`: `"assistant"`; `toolCalls?`: `object`[]; \} \| \{ `content`: `string` \| (\{ `text`: `string`; `type`: `"text"`; \} \| \{ `metadata?`: `unknown`; `source`: \{ `mimeType`: `string`; `type`: `"data"`; `value`: `string`; \} \| \{ `mimeType?`: ... \| ...; `type`: `"url"`; `value`: `string`; \}; `type`: `"image"`; \} \| \{ `metadata?`: `unknown`; `source`: \{ `mimeType`: `string`; `type`: `"data"`; `value`: `string`; \} \| \{ `mimeType?`: ... \| ...; `type`: `"url"`; `value`: `string`; \}; `type`: `"audio"`; \} \| \{ `metadata?`: `unknown`; `source`: \{ `mimeType`: `string`; `type`: `"data"`; `value`: `string`; \} \| \{ `mimeType?`: ... \| ...; `type`: `"url"`; `value`: `string`; \}; `type`: `"video"`; \} \| \{ `metadata?`: `unknown`; `source`: \{ `mimeType`: `string`; `type`: `"data"`; `value`: `string`; \} \| \{ `mimeType?`: ... \| ...; `type`: `"url"`; `value`: `string`; \}; `type`: `"document"`; \} \| \{ `data?`: `string`; `filename?`: `string`; `id?`: `string`; `mimeType`: `string`; `type`: `"binary"`; `url?`: `string`; \})[]; `encryptedValue?`: `string`; `id`: `string`; `name?`: `string`; `role`: `"user"`; \} \| \{ `content`: `string`; `encryptedValue?`: `string`; `error?`: `string`; `id`: `string`; `role`: `"tool"`; `toolCallId`: `string`; \} \| \{ `activityType`: `string`; `content`: `Record`\<`string`, `any`\>; `id`: `string`; `role`: `"activity"`; \} \| \{ `content`: `string`; `encryptedValue?`: `string`; `id`: `string`; `role`: `"reasoning"`; \})[]\>

***

### readState()

> **readState**(`threadId`): `Promise`\<`Record`\<`string`, `unknown`\> \| `null`\>

Defined in: [src/store.ts:31](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/store.ts#L31)

Read the latest agent state (from the last STATE_SNAPSHOT), or `null`.

#### Parameters

##### threadId

`string`

#### Returns

`Promise`\<`Record`\<`string`, `unknown`\> \| `null`\>

***

### saveMessages()

> **saveMessages**(`threadId`, `messages`): `Promise`\<`void`\>

Defined in: [src/store.ts:33](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/store.ts#L33)

Persist the derived message snapshot for a thread.

#### Parameters

##### threadId

`string`

##### messages

(\{ `content`: `string`; `encryptedValue?`: `string`; `id`: `string`; `name?`: `string`; `role`: `"developer"`; \} \| \{ `content`: `string`; `encryptedValue?`: `string`; `id`: `string`; `name?`: `string`; `role`: `"system"`; \} \| \{ `content?`: `string`; `encryptedValue?`: `string`; `id`: `string`; `name?`: `string`; `role`: `"assistant"`; `toolCalls?`: `object`[]; \} \| \{ `content`: `string` \| (\{ `text`: `string`; `type`: `"text"`; \} \| \{ `metadata?`: `unknown`; `source`: \{ `mimeType`: `string`; `type`: `"data"`; `value`: `string`; \} \| \{ `mimeType?`: `string`; `type`: `"url"`; `value`: `string`; \}; `type`: `"image"`; \} \| \{ `metadata?`: `unknown`; `source`: \{ `mimeType`: `string`; `type`: `"data"`; `value`: `string`; \} \| \{ `mimeType?`: `string`; `type`: `"url"`; `value`: `string`; \}; `type`: `"audio"`; \} \| \{ `metadata?`: `unknown`; `source`: \{ `mimeType`: `string`; `type`: `"data"`; `value`: `string`; \} \| \{ `mimeType?`: `string`; `type`: `"url"`; `value`: `string`; \}; `type`: `"video"`; \} \| \{ `metadata?`: `unknown`; `source`: \{ `mimeType`: `string`; `type`: `"data"`; `value`: `string`; \} \| \{ `mimeType?`: `string`; `type`: `"url"`; `value`: `string`; \}; `type`: `"document"`; \} \| \{ `data?`: `string`; `filename?`: `string`; `id?`: `string`; `mimeType`: `string`; `type`: `"binary"`; `url?`: `string`; \})[]; `encryptedValue?`: `string`; `id`: `string`; `name?`: `string`; `role`: `"user"`; \} \| \{ `content`: `string`; `encryptedValue?`: `string`; `error?`: `string`; `id`: `string`; `role`: `"tool"`; `toolCallId`: `string`; \} \| \{ `activityType`: `string`; `content`: `Record`\<`string`, `any`\>; `id`: `string`; `role`: `"activity"`; \} \| \{ `content`: `string`; `encryptedValue?`: `string`; `id`: `string`; `role`: `"reasoning"`; \})[]

#### Returns

`Promise`\<`void`\>
