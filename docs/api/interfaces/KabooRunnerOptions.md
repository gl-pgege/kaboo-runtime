[**@kaboo/runtime**](../README.md)

***

# Interface: KabooRunnerOptions

Defined in: [src/runner.ts:16](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L16)

Options for [KabooAgentRunner](../classes/KabooAgentRunner.md) / [createKabooRunner](../functions/createKabooRunner.md).

## Properties

### onStoreError?

> `optional` **onStoreError?**: (`error`, `context`) => `void`

Defined in: [src/runner.ts:18](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L18)

Called when a store write fails, so hosts can log/observe.

#### Parameters

##### error

`unknown`

##### context

###### op

`string`

###### threadId

`string`

#### Returns

`void`
