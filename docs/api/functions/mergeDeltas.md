[**@pgege/kaboo-runtime**](../README.md)

***

# Function: mergeDeltas()

> **mergeDeltas**(`events`): `BaseEvent`[]

Defined in: [src/store.ts:114](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/store.ts#L114)

Join neighbouring deltas of one message or tool call into one event, so a
batch of streamed tokens is stored as one row. The joined events replay the
same text and arguments.

## Parameters

### events

`BaseEvent`[]

## Returns

`BaseEvent`[]
