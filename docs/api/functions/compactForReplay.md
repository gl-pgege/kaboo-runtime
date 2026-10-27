[**@pgege/kaboo-runtime**](../README.md)

***

# Function: compactForReplay()

> **compactForReplay**(`events`): `BaseEvent`[]

Defined in: [src/store.ts:161](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/store.ts#L161)

What a reconnecting client needs from a thread's log: only the last messages
snapshot and the last state snapshot (with the deltas after it), without the
activity events of runtimes before 0.8, which nothing renders, and with
deltas joined.

## Parameters

### events

`BaseEvent`[]

## Returns

`BaseEvent`[]
