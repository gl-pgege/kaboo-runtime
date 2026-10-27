[**@pgege/kaboo-runtime**](../README.md)

***

# Class: PostgresThreadStore

Defined in: [src/stores/postgres.ts:49](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/postgres.ts#L49)

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

Defined in: [src/stores/postgres.ts:54](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/postgres.ts#L54)

#### Parameters

##### options

[`PostgresThreadStoreOptions`](../interfaces/PostgresThreadStoreOptions.md)

#### Returns

`PostgresThreadStore`

## Methods

### appendEvents()

> **appendEvents**(`threadId`, `agentId`, `events`, `ownerId?`): `Promise`\<`void`\>

Defined in: [src/stores/postgres.ts:102](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/postgres.ts#L102)

Append events (in order) to the thread's log.

`ownerId` records the owning subject on the thread (the runner passes it
from [accessPolicy.ownerOf](../interfaces/KabooRunnerOptions.md#accesspolicy)). A
nullish value must preserve any owner already recorded.

#### Parameters

##### threadId

`string`

##### agentId

`string`

##### events

`BaseEvent`[]

##### ownerId?

`string` \| `null`

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`ThreadStore`](../interfaces/ThreadStore.md).[`appendEvents`](../interfaces/ThreadStore.md#appendevents)

***

### clear()

> **clear**(`threadId?`): `Promise`\<`void`\>

Defined in: [src/stores/postgres.ts:259](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/postgres.ts#L259)

Delete one thread's data, or all threads when `threadId` is omitted.

#### Parameters

##### threadId?

`string`

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`ThreadStore`](../interfaces/ThreadStore.md).[`clear`](../interfaces/ThreadStore.md#clear)

***

### compactRun()

> **compactRun**(`threadId`, `runId`): `Promise`\<`void`\>

Defined in: [src/stores/postgres.ts:138](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/postgres.ts#L138)

Replace a finished run's events with [compactRunEvents](../functions/compactRunEvents.md) of them, in
place: events appended after the run keep their position. A run that has
not finished, or is not in the log, is left alone.

#### Parameters

##### threadId

`string`

##### runId

`string`

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`ThreadStore`](../interfaces/ThreadStore.md).[`compactRun`](../interfaces/ThreadStore.md#compactrun)

***

### listThreads()

> **listThreads**(`filter?`): `Promise`\<[`StoredThread`](../interfaces/StoredThread.md)[]\>

Defined in: [src/stores/postgres.ts:233](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/postgres.ts#L233)

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

> **readEvents**(`threadId`): `Promise`\<`BaseEvent`[]\>

Defined in: [src/stores/postgres.ts:189](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/postgres.ts#L189)

Read the thread's full event log, in order.

#### Parameters

##### threadId

`string`

#### Returns

`Promise`\<`BaseEvent`[]\>

#### Implementation of

[`ThreadStore`](../interfaces/ThreadStore.md).[`readEvents`](../interfaces/ThreadStore.md#readevents)

***

### readMessages()

> **readMessages**(`threadId`): `Promise`\<`Message`[]\>

Defined in: [src/stores/postgres.ts:224](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/postgres.ts#L224)

Read the derived message snapshot for a thread.

#### Parameters

##### threadId

`string`

#### Returns

`Promise`\<`Message`[]\>

#### Implementation of

[`ThreadStore`](../interfaces/ThreadStore.md).[`readMessages`](../interfaces/ThreadStore.md#readmessages)

***

### readState()

> **readState**(`threadId`): `Promise`\<`Record`\<`string`, `unknown`\> \| `null`\>

Defined in: [src/stores/postgres.ts:198](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/postgres.ts#L198)

Read the latest agent state (see `deriveState`), or `null`.

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

Defined in: [src/stores/postgres.ts:214](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/postgres.ts#L214)

Persist the derived message snapshot for a thread.

#### Parameters

##### threadId

`string`

##### messages

`Message`[]

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`ThreadStore`](../interfaces/ThreadStore.md).[`saveMessages`](../interfaces/ThreadStore.md#savemessages)
