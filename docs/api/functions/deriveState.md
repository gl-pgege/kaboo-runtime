[**@pgege/kaboo-runtime**](../README.md)

***

# Function: deriveState()

> **deriveState**(`events`): [`ThreadState`](../type-aliases/ThreadState.md) \| `null`

Defined in: [src/state.ts:64](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/state.ts#L64)

Derive a thread's latest state from its event log: the last
`STATE_SNAPSHOT`, with every `STATE_DELTA` after it applied. Returns `null`
when the thread never emitted state.

## Parameters

### events

`BaseEvent`[]

A thread's event log, in order.

## Returns

[`ThreadState`](../type-aliases/ThreadState.md) \| `null`

The latest state, or `null` when there is none.

## Example

```ts
import { deriveState } from "@pgege/kaboo-runtime";
import type { BaseEvent } from "@ag-ui/client";

declare const events: BaseEvent[];
const state = deriveState(events); // Record<string, unknown> | null
```
