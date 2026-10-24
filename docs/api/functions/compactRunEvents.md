[**@pgege/kaboo-runtime**](../README.md)

***

# Function: compactRunEvents()

> **compactRunEvents**(`events`): `BaseEvent`[]

Defined in: [src/store.ts:96](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/store.ts#L96)

Compact one finished run's events with AG-UI's `compactEvents`: text and
tool-argument deltas joined, state changes folded into one snapshot.
Returns the input when compaction would not shrink it.

## Parameters

### events

`BaseEvent`[]

## Returns

`BaseEvent`[]
