[**kaboo-runtime**](../README.md)

***

# Function: deriveState()

> **deriveState**(`events`): `Record`\<`string`, `unknown`\> \| `null`

Defined in: [src/state.ts:22](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/state.ts#L22)

Derive the latest agent state from an event log by scanning backwards for the
last `STATE_SNAPSHOT`. Returns `null` when the thread never emitted one.

kaboo-workflows folds each turn's `kaboo_history` into its trailing
`STATE_SNAPSHOT`, so this is the authoritative per-thread state/history.

## Parameters

### events

`objectOutputType`\<\{ `rawEvent`: `ZodOptional`\<`ZodAny`\>; `timestamp`: `ZodOptional`\<`ZodNumber`\>; `type`: `ZodNativeEnum`\<*typeof* `EventType`\>; \}, `ZodTypeAny`, `"passthrough"`\>[]

A thread's event log, in order.

## Returns

`Record`\<`string`, `unknown`\> \| `null`

The last snapshot object, or `null` when there is none.

## Example

```ts
import { deriveState } from "kaboo-runtime";
import type { BaseEvent } from "@ag-ui/client";

declare const events: BaseEvent[];
const state = deriveState(events); // Record<string, unknown> | null
```
