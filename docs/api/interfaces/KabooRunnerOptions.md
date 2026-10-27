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

### maxCachedThreads?

> `optional` **maxCachedThreads?**: `number`

Defined in: [src/runner.ts:323](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L323)

How many idle threads keep their messages and state in memory; the least
recently used beyond it are dropped and read from the store again when a
run or connect needs them. Unlimited by default.

***

### onRunEnd?

> `optional` **onRunEnd?**: (`end`) => `void` \| `Promise`\<`void`\>

Defined in: [src/runner.ts:317](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L317)

Called once a run has ended, however it ended, when the agent is done
rather than when the client's stream closes. Errors are reported to
[KabooRunnerOptions.onStoreError](#onstoreerror) and never reach the run.

#### Parameters

##### end

[`KabooRunEnd`](KabooRunEnd.md)

#### Returns

`void` \| `Promise`\<`void`\>

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
