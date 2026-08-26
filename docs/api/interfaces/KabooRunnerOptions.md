[**@pgege/kaboo-runtime**](../README.md)

***

# Interface: KabooRunnerOptions

Defined in: [src/runner.ts:250](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L250)

Options for [KabooAgentRunner](../classes/KabooAgentRunner.md) / [createKabooRunner](../functions/createKabooRunner.md).

## Properties

### accessPolicy?

> `optional` **accessPolicy?**: [`KabooAccessPolicy`](KabooAccessPolicy.md)

Defined in: [src/runner.ts:254](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L254)

Ownership hooks — see [KabooAccessPolicy](KabooAccessPolicy.md).

***

### onStoreError?

> `optional` **onStoreError?**: (`error`, `context`) => `void`

Defined in: [src/runner.ts:252](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L252)

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
