[**@pgege/kaboo-runtime**](../README.md)

***

# Function: finishedRunBounds()

> **finishedRunBounds**(`events`, `runId`): \[`number`, `number`\] \| `null`

Defined in: [src/store.ts:77](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/store.ts#L77)

The bounds of a finished run in a log: the index of its `RUN_STARTED` and of
the terminal event that closes it, or `null`.

## Parameters

### events

readonly `BaseEvent`[]

### runId

`string`

## Returns

\[`number`, `number`\] \| `null`
