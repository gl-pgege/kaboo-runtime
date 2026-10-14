[**@pgege/kaboo-runtime**](../README.md)

***

# Class: InMemoryGrantStore

Defined in: src/stores/memory-grants.ts:29

Process-memory [GrantStore](../interfaces/GrantStore.md): remembered approvals last until the
process restarts. Suited to local development and tests; use
`PostgresGrantStore` (or your own store) when decisions must survive.

## Example

```ts
import { createKabooRunner, InMemoryGrantStore, InMemoryThreadStore } from "@pgege/kaboo-runtime";

const runner = createKabooRunner(new InMemoryThreadStore(), {
  accessPolicy: { ownerOf: (threadId) => threadId.split(":")[0] ?? null },
  approvals: { grants: new InMemoryGrantStore() },
});
```

## Implements

- [`GrantStore`](../interfaces/GrantStore.md)

## Constructors

### Constructor

> **new InMemoryGrantStore**(): `InMemoryGrantStore`

#### Returns

`InMemoryGrantStore`

## Methods

### list()

> **list**(`query`): `Promise`\<[`ToolGrant`](../interfaces/ToolGrant.md)[]\>

Defined in: src/stores/memory-grants.ts:32

The grants a run may use: the owner's "always" grants and the thread's own.

#### Parameters

##### query

[`GrantQuery`](../interfaces/GrantQuery.md)

#### Returns

`Promise`\<[`ToolGrant`](../interfaces/ToolGrant.md)[]\>

#### Implementation of

[`GrantStore`](../interfaces/GrantStore.md).[`list`](../interfaces/GrantStore.md#list)

***

### listForOwner()

> **listForOwner**(`ownerId`): `Promise`\<[`ToolGrant`](../interfaces/ToolGrant.md)[]\>

Defined in: src/stores/memory-grants.ts:54

Every grant the owner holds, for a settings page.

#### Parameters

##### ownerId

`string`

#### Returns

`Promise`\<[`ToolGrant`](../interfaces/ToolGrant.md)[]\>

#### Implementation of

[`GrantStore`](../interfaces/GrantStore.md).[`listForOwner`](../interfaces/GrantStore.md#listforowner)

***

### revoke()

> **revoke**(`ownerId`, `id`): `Promise`\<`void`\>

Defined in: src/stores/memory-grants.ts:50

Revoke one of the owner's grants. A grant owned by someone else is left alone.

#### Parameters

##### ownerId

`string`

##### id

`string`

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`GrantStore`](../interfaces/GrantStore.md).[`revoke`](../interfaces/GrantStore.md#revoke)

***

### save()

> **save**(`grant`): `Promise`\<[`ToolGrant`](../interfaces/ToolGrant.md)\>

Defined in: src/stores/memory-grants.ts:41

Save a grant, replacing an identical one (same owner, agent, thread, tool, subject).

#### Parameters

##### grant

[`NewToolGrant`](../type-aliases/NewToolGrant.md)

#### Returns

`Promise`\<[`ToolGrant`](../interfaces/ToolGrant.md)\>

#### Implementation of

[`GrantStore`](../interfaces/GrantStore.md).[`save`](../interfaces/GrantStore.md#save)
