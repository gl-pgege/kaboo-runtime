[**@pgege/kaboo-runtime**](../README.md)

***

# Interface: KabooRunnerOptions

Defined in: [src/runner.ts:267](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L267)

Options for [KabooAgentRunner](../classes/KabooAgentRunner.md) / [createKabooRunner](../functions/createKabooRunner.md).

## Properties

### accessPolicy?

> `optional` **accessPolicy?**: [`KabooAccessPolicy`](KabooAccessPolicy.md)

Defined in: [src/runner.ts:271](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L271)

Ownership hooks — see [KabooAccessPolicy](KabooAccessPolicy.md).

***

### approvals?

> `optional` **approvals?**: [`KabooApprovalOptions`](KabooApprovalOptions.md)

Defined in: [src/runner.ts:283](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L283)

Remembered tool approvals — see [KabooApprovalOptions](KabooApprovalOptions.md).

***

### enrich?

> `optional` **enrich?**: (`context`) => `Record`\<`string`, `unknown`\> \| `Promise`\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/runner.ts:281](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L281)

Build the run's `forwardedProps` from values the host vouches for —
run-scoped credentials, the tenant, a composed workflow. The returned
object replaces the client's `forwardedProps` (start from
`context.input.forwardedProps` to keep client values), so a client cannot
smuggle in what only the host may set. Awaited before the run starts; if
it throws, the run ends with an error. `kaboo_grants` is always set by the
runner, never taken from here or the client.

#### Parameters

##### context

[`KabooRunContext`](KabooRunContext.md)

#### Returns

`Record`\<`string`, `unknown`\> \| `Promise`\<`Record`\<`string`, `unknown`\>\>

***

### onStoreError?

> `optional` **onStoreError?**: (`error`, `context`) => `void`

Defined in: [src/runner.ts:269](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L269)

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
