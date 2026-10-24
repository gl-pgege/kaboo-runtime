[**@pgege/kaboo-runtime**](../README.md)

***

# Interface: KabooStateKeys

Defined in: [src/keys.ts:16](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/keys.ts#L16)

Who owns each top-level key of a thread's shared state.

- `hidden` keys belong to the server and never reach the browser: the
  agents' sessions, which are large and must not be forged.
- `server` keys belong to the server and reach the browser read-only: the
  browser sees them, but a copy it sends back is ignored. The workspace the
  agents maintain is one.
- Every other key belongs to the browser and travels with each run.

A host vouches for a server key through [KabooRunnerOptions.enrich](KabooRunnerOptions.md#enrich).

## Properties

### hidden?

> `optional` **hidden?**: readonly `string`[]

Defined in: [src/keys.ts:18](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/keys.ts#L18)

Server keys the browser never sees.

***

### server?

> `optional` **server?**: readonly `string`[]

Defined in: [src/keys.ts:20](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/keys.ts#L20)

Server keys the browser sees but cannot write.
