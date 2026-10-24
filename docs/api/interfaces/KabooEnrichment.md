[**@pgege/kaboo-runtime**](../README.md)

***

# Interface: KabooEnrichment

Defined in: [src/runner.ts:315](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L315)

What [KabooRunnerOptions.enrich](KabooRunnerOptions.md#enrich) adds to a run.

## Properties

### forwardedProps?

> `optional` **forwardedProps?**: `Record`\<`string`, `unknown`\>

Defined in: [src/runner.ts:322](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L322)

Replaces the client's `forwardedProps`, so a client cannot smuggle in what
only the host may set (start from `context.input.forwardedProps` to keep
client values). Omit to keep the client's. `kaboo_grants` is always set by
the runner.

***

### state?

> `optional` **state?**: `Record`\<`string`, `unknown`\>

Defined in: [src/runner.ts:327](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L327)

State values set for this run over the merged state, server-owned keys
included. This is the only way a server key changes outside the agent.
