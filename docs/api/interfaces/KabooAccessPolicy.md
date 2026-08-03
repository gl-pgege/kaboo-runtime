[**@pgege/kaboo-runtime**](../README.md)

***

# Interface: KabooAccessPolicy

Defined in: [src/runner.ts:26](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L26)

Access-control hooks for [KabooAgentRunner](../classes/KabooAgentRunner.md).

kaboo-runtime ships no HTTP layer, so *authentication* stays in the host —
but ownership is real data the runner records and serves. `ownerOf` tells
the runner which subject owns a thread (typically parsed from the host's
thread-id convention or session); the owner is persisted on the thread
record and surfaced as `createdById` in [KabooAgentRunner.listThreads](../classes/KabooAgentRunner.md#listthreads),
so host request filters can compare against a real field instead of
re-deriving ownership.

## Properties

### allowClearAll?

> `optional` **allowClearAll?**: `boolean`

Defined in: [src/runner.ts:37](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L37)

Whether [KabooAgentRunner.clearThreads](../classes/KabooAgentRunner.md#clearthreads) (which wipes the whole
store) is allowed. Defaults to `true` for compatibility; multi-tenant
hosts should set `false`.

***

### ownerOf?

> `optional` **ownerOf?**: (`threadId`) => `string` \| `null`

Defined in: [src/runner.ts:31](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L31)

Resolve the owning subject for a thread (or `null` when unknown). Called
when a run persists and when listing threads that have no recorded owner.

#### Parameters

##### threadId

`string`

#### Returns

`string` \| `null`
