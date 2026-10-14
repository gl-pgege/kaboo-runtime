[**@pgege/kaboo-runtime**](../README.md)

***

# Class: PostgresGrantStore

Defined in: src/stores/postgres-grants.ts:62

Durable [GrantStore](../interfaces/GrantStore.md) backed by Postgres, in its own `kaboo_tool_grants`
table (created on first use, independent of any application schema). `pg`
is an optional peer dependency — install it in the host app to use this
store.

## Example

```ts
import { Pool } from "pg";
import { createKabooRunner, PostgresGrantStore, PostgresThreadStore } from "@pgege/kaboo-runtime";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const runner = createKabooRunner(new PostgresThreadStore({ pool }), {
  accessPolicy: { ownerOf: (threadId) => threadId.split(":")[0] ?? null },
  approvals: { grants: new PostgresGrantStore({ pool }) },
});
```

## Implements

- [`GrantStore`](../interfaces/GrantStore.md)

## Constructors

### Constructor

> **new PostgresGrantStore**(`options`): `PostgresGrantStore`

Defined in: src/stores/postgres-grants.ts:67

#### Parameters

##### options

[`PostgresGrantStoreOptions`](../interfaces/PostgresGrantStoreOptions.md)

#### Returns

`PostgresGrantStore`

## Methods

### list()

> **list**(`query`): `Promise`\<[`ToolGrant`](../interfaces/ToolGrant.md)[]\>

Defined in: src/stores/postgres-grants.ts:110

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

Defined in: src/stores/postgres-grants.ts:147

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

Defined in: src/stores/postgres-grants.ts:142

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

Defined in: src/stores/postgres-grants.ts:120

Save a grant, replacing an identical one (same owner, agent, thread, tool, subject).

#### Parameters

##### grant

[`NewToolGrant`](../type-aliases/NewToolGrant.md)

#### Returns

`Promise`\<[`ToolGrant`](../interfaces/ToolGrant.md)\>

#### Implementation of

[`GrantStore`](../interfaces/GrantStore.md).[`save`](../interfaces/GrantStore.md#save)
