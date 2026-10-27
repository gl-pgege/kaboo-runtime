[**@pgege/kaboo-runtime**](../README.md)

***

# Interface: KabooRunEnd

Defined in: [src/runner.ts:327](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L327)

How a run ended, for [KabooRunnerOptions.onRunEnd](KabooRunnerOptions.md#onrunend).

## Properties

### outcome

> **outcome**: `"finished"` \| `"failed"` \| `"stopped"`

Defined in: [src/runner.ts:333](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L333)

`finished`, `failed` (an error or a `RUN_ERROR`) or `stopped` (a stop request).

***

### runId

> **runId**: `string`

Defined in: [src/runner.ts:331](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L331)

The run's id, as the client sent it.

***

### threadId

> **threadId**: `string`

Defined in: [src/runner.ts:329](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L329)

The thread the run belonged to.
