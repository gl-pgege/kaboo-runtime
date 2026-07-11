[**kaboo-runtime**](../README.md)

***

# Interface: PostgresThreadStoreOptions

Defined in: [src/stores/postgres.ts:11](https://github.com/gl-pgege/kaboo-runtime/blob/2fe2db9351f526ac0d1f3c15be4de8aca6139964/src/stores/postgres.ts#L11)

Options for [PostgresThreadStore](../classes/PostgresThreadStore.md). Provide exactly one connection
source: either a `dsn` connection string (the store creates and owns its own
`pg.Pool`) or an existing `pool` to reuse. Passing neither throws.

## Properties

### dsn?

> `optional` **dsn?**: `string`

Defined in: [src/stores/postgres.ts:13](https://github.com/gl-pgege/kaboo-runtime/blob/2fe2db9351f526ac0d1f3c15be4de8aca6139964/src/stores/postgres.ts#L13)

Postgres connection string. Ignored when an existing `pool` is passed.

***

### pool?

> `optional` **pool?**: `Pool`

Defined in: [src/stores/postgres.ts:15](https://github.com/gl-pgege/kaboo-runtime/blob/2fe2db9351f526ac0d1f3c15be4de8aca6139964/src/stores/postgres.ts#L15)

Reuse an existing `pg.Pool` instead of creating one from `dsn`.
