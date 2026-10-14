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

Defined in: [src/stores/memory.ts:90](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/memory.ts#L90)

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

Defined in: [src/stores/memory.ts:77](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/memory.ts#L77)

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

Defined in: [src/stores/memory.ts:56](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/memory.ts#L56)

Read the thread's full event log, verbatim and in order.

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

Defined in: [src/stores/memory.ts:73](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/memory.ts#L73)

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

Defined in: [src/stores/memory.ts:60](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/memory.ts#L60)

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

Defined in: [src/stores/memory.ts:65](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/memory.ts#L65)

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
