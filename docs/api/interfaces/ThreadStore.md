[**@pgege/kaboo-runtime**](../README.md)

***

# Interface: ThreadStore

Defined in: [src/store.ts:36](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/store.ts#L36)

Pluggable persistence for a thread's full AG-UI event log.

This is the extension point: implement it against your own database to
control where conversations live. `kaboo-runtime` ships `InMemoryThreadStore`
and `PostgresThreadStore` out of the box.

Events are appended as a run streams, so a crash keeps everything up to the
last write. Once a run ends, the runner asks the store to compact it
([ThreadStore.compactRun](#compactrun)): streamed deltas become single events and
the run's state changes become one snapshot, with the order of everything
else kept.

## Methods

### appendEvents()

> **appendEvents**(`threadId`, `agentId`, `events`, `ownerId?`): `Promise`\<`void`\>

Defined in: [src/store.ts:44](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/store.ts#L44)

Append events (in order) to the thread's log.

`ownerId` records the owning subject on the thread (the runner passes it
from [accessPolicy.ownerOf](KabooRunnerOptions.md#accesspolicy)). A
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

***

### clear()

> **clear**(`threadId?`): `Promise`\<`void`\>

Defined in: [src/store.ts:70](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/store.ts#L70)

Delete one thread's data, or all threads when `threadId` is omitted.

#### Parameters

##### threadId?

`string`

#### Returns

`Promise`\<`void`\>

***

### compactRun()

> **compactRun**(`threadId`, `runId`): `Promise`\<`void`\>

Defined in: [src/store.ts:55](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/store.ts#L55)

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

***

### listThreads()

> **listThreads**(`filter?`): `Promise`\<[`StoredThread`](StoredThread.md)[]\>

Defined in: [src/store.ts:68](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/store.ts#L68)

List persisted threads, most recently updated first. With
`filter.ownerId`, only that subject's threads are returned.

#### Parameters

##### filter?

[`ListThreadsFilter`](ListThreadsFilter.md)

#### Returns

`Promise`\<[`StoredThread`](StoredThread.md)[]\>

***

### readEvents()

> **readEvents**(`threadId`): `Promise`\<`BaseEvent`[]\>

Defined in: [src/store.ts:57](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/store.ts#L57)

Read the thread's full event log, in order.

#### Parameters

##### threadId

`string`

#### Returns

`Promise`\<`BaseEvent`[]\>

***

### readMessages()

> **readMessages**(`threadId`): `Promise`\<`Message`[]\>

Defined in: [src/store.ts:63](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/store.ts#L63)

Read the derived message snapshot for a thread.

#### Parameters

##### threadId

`string`

#### Returns

`Promise`\<`Message`[]\>

***

### readState()

> **readState**(`threadId`): `Promise`\<`Record`\<`string`, `unknown`\> \| `null`\>

Defined in: [src/store.ts:59](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/store.ts#L59)

Read the latest agent state (see `deriveState`), or `null`.

#### Parameters

##### threadId

`string`

#### Returns

`Promise`\<`Record`\<`string`, `unknown`\> \| `null`\>

***

### saveMessages()

> **saveMessages**(`threadId`, `messages`): `Promise`\<`void`\>

Defined in: [src/store.ts:61](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/store.ts#L61)

Persist the derived message snapshot for a thread.

#### Parameters

##### threadId

`string`

##### messages

`Message`[]

#### Returns

`Promise`\<`void`\>
