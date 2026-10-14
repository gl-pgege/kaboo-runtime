[**@pgege/kaboo-runtime**](../README.md)

***

# Interface: GrantStore

Defined in: [src/approvals.ts:64](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/approvals.ts#L64)

Pluggable persistence for remembered approvals — the counterpart of
[ThreadStore](ThreadStore.md) for decisions. `kaboo-runtime` ships
`InMemoryGrantStore` and `PostgresGrantStore`; apps that must enforce
grants elsewhere (their own domain service) implement this against it.

## Methods

### list()

> **list**(`query`): `Promise`\<[`ToolGrant`](ToolGrant.md)[]\>

Defined in: [src/approvals.ts:66](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/approvals.ts#L66)

The grants a run may use: the owner's "always" grants and the thread's own.

#### Parameters

##### query

[`GrantQuery`](GrantQuery.md)

#### Returns

`Promise`\<[`ToolGrant`](ToolGrant.md)[]\>

***

### listForOwner()

> **listForOwner**(`ownerId`): `Promise`\<[`ToolGrant`](ToolGrant.md)[]\>

Defined in: [src/approvals.ts:72](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/approvals.ts#L72)

Every grant the owner holds, for a settings page.

#### Parameters

##### ownerId

`string`

#### Returns

`Promise`\<[`ToolGrant`](ToolGrant.md)[]\>

***

### revoke()

> **revoke**(`ownerId`, `id`): `Promise`\<`void`\>

Defined in: [src/approvals.ts:70](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/approvals.ts#L70)

Revoke one of the owner's grants. A grant owned by someone else is left alone.

#### Parameters

##### ownerId

`string`

##### id

`string`

#### Returns

`Promise`\<`void`\>

***

### save()

> **save**(`grant`): `Promise`\<[`ToolGrant`](ToolGrant.md)\>

Defined in: [src/approvals.ts:68](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/approvals.ts#L68)

Save a grant, replacing an identical one (same owner, agent, thread, tool, subject).

#### Parameters

##### grant

[`NewToolGrant`](../type-aliases/NewToolGrant.md)

#### Returns

`Promise`\<[`ToolGrant`](ToolGrant.md)\>
