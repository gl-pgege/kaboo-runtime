[**@pgege/kaboo-runtime**](../README.md)

***

# Interface: PostgresThreadStoreOptions

Defined in: [src/stores/postgres.ts:27](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/postgres.ts#L27)

Options for [PostgresThreadStore](../classes/PostgresThreadStore.md). Provide exactly one connection
source: either a `dsn` connection string (the store creates and owns its own
`pg.Pool`) or an existing `pool` to reuse. Passing neither throws.

## Properties

### dsn?

> `optional` **dsn?**: `string`

Defined in: [src/stores/postgres.ts:29](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/postgres.ts#L29)

Postgres connection string. Ignored when an existing `pool` is passed.

***

### pool?

> `optional` **pool?**: `Pool`

Defined in: [src/stores/postgres.ts:31](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/stores/postgres.ts#L31)

Reuse an existing `pg.Pool` instead of creating one from `dsn`.
