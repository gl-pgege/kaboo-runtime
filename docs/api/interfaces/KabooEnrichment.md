[**@pgege/kaboo-runtime**](../README.md)

***

# Interface: KabooEnrichment

Defined in: [src/runner.ts:337](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L337)

What [KabooRunnerOptions.enrich](KabooRunnerOptions.md#enrich) adds to a run.

## Properties

### forwardedProps?

> `optional` **forwardedProps?**: `Record`\<`string`, `unknown`\>

Defined in: [src/runner.ts:344](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L344)

Replaces the client's `forwardedProps`, so a client cannot smuggle in what
only the host may set (start from `context.input.forwardedProps` to keep
client values). Omit to keep the client's. `kaboo_grants` is always set by
the runner.

***

### state?

> `optional` **state?**: `Record`\<`string`, `unknown`\>

Defined in: [src/runner.ts:349](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L349)

State values set for this run over the merged state, server-owned keys
included. This is the only way a server key changes outside the agent.
