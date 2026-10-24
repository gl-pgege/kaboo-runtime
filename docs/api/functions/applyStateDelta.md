[**@pgege/kaboo-runtime**](../README.md)

***

# Function: applyStateDelta()

> **applyStateDelta**(`state`, `delta`): [`ThreadState`](../type-aliases/ThreadState.md) \| `null`

Defined in: [src/state.ts:15](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/state.ts#L15)

Apply a `STATE_DELTA`'s JSON Patch to a state value without mutating it. A
patch that does not apply leaves the state as it was.

## Parameters

### state

[`ThreadState`](../type-aliases/ThreadState.md) \| `null`

The state before the delta.

### delta

`unknown`

The delta's JSON Patch operations.

## Returns

[`ThreadState`](../type-aliases/ThreadState.md) \| `null`

The state after the delta.
