[**@pgege/kaboo-runtime**](../README.md)

***

# Interface: KabooRunnerOptions

Defined in: [src/runner.ts:215](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L215)

Options for [KabooAgentRunner](../classes/KabooAgentRunner.md) / [createKabooRunner](../functions/createKabooRunner.md).

## Properties

### accessPolicy?

> `optional` **accessPolicy?**: [`KabooAccessPolicy`](KabooAccessPolicy.md)

Defined in: [src/runner.ts:219](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L219)

Ownership hooks — see [KabooAccessPolicy](KabooAccessPolicy.md).

***

### onStoreError?

> `optional` **onStoreError?**: (`error`, `context`) => `void`

Defined in: [src/runner.ts:217](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L217)

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
