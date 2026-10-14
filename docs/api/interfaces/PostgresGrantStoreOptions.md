[**@pgege/kaboo-runtime**](../README.md)

***

# Interface: PostgresGrantStoreOptions

Defined in: [src/stores/postgres-grants.ts:11](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/postgres-grants.ts#L11)

Options for [PostgresGrantStore](../classes/PostgresGrantStore.md). Provide exactly one connection
source: a `dsn` connection string (the store creates and owns its own
`pg.Pool`) or an existing `pool` to reuse — typically the one your
`PostgresThreadStore` uses. Passing neither throws.

## Properties

### dsn?

> `optional` **dsn?**: `string`

Defined in: [src/stores/postgres-grants.ts:13](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/postgres-grants.ts#L13)

Postgres connection string. Ignored when an existing `pool` is passed.

***

### pool?

> `optional` **pool?**: `Pool`

Defined in: [src/stores/postgres-grants.ts:15](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/postgres-grants.ts#L15)

Reuse an existing `pg.Pool` instead of creating one from `dsn`.
