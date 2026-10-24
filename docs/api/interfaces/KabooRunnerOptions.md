[**@pgege/kaboo-runtime**](../README.md)

***

# Interface: KabooRunnerOptions

Defined in: [src/runner.ts:294](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L294)

Options for [KabooAgentRunner](../classes/KabooAgentRunner.md) / [createKabooRunner](../functions/createKabooRunner.md).

## Properties

### accessPolicy?

> `optional` **accessPolicy?**: [`KabooAccessPolicy`](KabooAccessPolicy.md)

Defined in: [src/runner.ts:298](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L298)

Ownership hooks — see [KabooAccessPolicy](KabooAccessPolicy.md).

***

### approvals?

> `optional` **approvals?**: [`KabooApprovalOptions`](KabooApprovalOptions.md)

Defined in: [src/runner.ts:306](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L306)

Remembered tool approvals — see [KabooApprovalOptions](KabooApprovalOptions.md).

***

### enrich?

> `optional` **enrich?**: (`context`) => [`KabooEnrichment`](KabooEnrichment.md) \| `Promise`\<[`KabooEnrichment`](KabooEnrichment.md)\>

Defined in: [src/runner.ts:304](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L304)

Add what the host vouches for to a run — run-scoped credentials, the
tenant, a composed workflow, a server-owned state value. Awaited before
the run starts; if it throws, the run ends with an error.

#### Parameters

##### context

[`KabooRunContext`](KabooRunContext.md)

#### Returns

[`KabooEnrichment`](KabooEnrichment.md) \| `Promise`\<[`KabooEnrichment`](KabooEnrichment.md)\>

***

### onStoreError?

> `optional` **onStoreError?**: (`error`, `context`) => `void`

Defined in: [src/runner.ts:296](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L296)

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

***

### stateKeys?

> `optional` **stateKeys?**: [`KabooStateKeys`](KabooStateKeys.md)

Defined in: [src/runner.ts:311](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L311)

Which state keys the server owns. Defaults to [DEFAULT\_STATE\_KEYS](../variables/DEFAULT_STATE_KEYS.md):
kaboo-workflows' sessions hidden, its workspace visible.
