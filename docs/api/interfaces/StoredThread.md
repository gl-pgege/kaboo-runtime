[**kaboo-runtime**](../README.md)

***

# Interface: StoredThread

Defined in: [src/store.ts:4](https://github.com/gl-pgege/kaboo-runtime/blob/2fe2db9351f526ac0d1f3c15be4de8aca6139964/src/store.ts#L4)

Lightweight per-thread summary returned by [ThreadStore.listThreads](ThreadStore.md#listthreads).

## Properties

### agentId

> **agentId**: `string`

Defined in: [src/store.ts:8](https://github.com/gl-pgege/kaboo-runtime/blob/2fe2db9351f526ac0d1f3c15be4de8aca6139964/src/store.ts#L8)

Id of the agent that produced the thread's most recent run.

***

### createdAt

> **createdAt**: `number`

Defined in: [src/store.ts:10](https://github.com/gl-pgege/kaboo-runtime/blob/2fe2db9351f526ac0d1f3c15be4de8aca6139964/src/store.ts#L10)

Creation time, epoch milliseconds.

***

### id

> **id**: `string`

Defined in: [src/store.ts:6](https://github.com/gl-pgege/kaboo-runtime/blob/2fe2db9351f526ac0d1f3c15be4de8aca6139964/src/store.ts#L6)

Unique thread id (the CopilotKit `threadId`).

***

### updatedAt

> **updatedAt**: `number`

Defined in: [src/store.ts:12](https://github.com/gl-pgege/kaboo-runtime/blob/2fe2db9351f526ac0d1f3c15be4de8aca6139964/src/store.ts#L12)

Last-updated time, epoch milliseconds (bumped on every persisted run).
