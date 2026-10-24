[**@pgege/kaboo-runtime**](../README.md)

***

# Class: InMemoryThreadStore

Defined in: [src/stores/memory.ts:27](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/memory.ts#L27)

In-memory [ThreadStore](../interfaces/ThreadStore.md). Data lives for the life of the process — ideal
for local development, tests, and the demo. Use `PostgresThreadStore` (or a
custom store) for durable persistence.

## Example

```ts
import { createKabooRunner, InMemoryThreadStore } from "@pgege/kaboo-runtime";

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

> **appendEvents**(`threadId`, `agentId`, `events`, `ownerId?`): `Promise`\<`void`\>

Defined in: [src/stores/memory.ts:40](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/memory.ts#L40)

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

Defined in: [src/stores/memory.ts:97](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/memory.ts#L97)

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

Defined in: [src/stores/memory.ts:53](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/memory.ts#L53)

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

Defined in: [src/stores/memory.ts:84](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/memory.ts#L84)

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

Defined in: [src/stores/memory.ts:63](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/memory.ts#L63)

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

Defined in: [src/stores/memory.ts:80](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/memory.ts#L80)

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

Defined in: [src/stores/memory.ts:67](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/memory.ts#L67)

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

Defined in: [src/stores/memory.ts:72](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/memory.ts#L72)

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
