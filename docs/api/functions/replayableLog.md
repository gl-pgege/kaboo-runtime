[**@pgege/kaboo-runtime**](../README.md)

***

# Function: replayableLog()

> **replayableLog**(`events`): `BaseEvent`[]

Defined in: [src/replay.ts:27](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/replay.ts#L27)

Make a stored event log safe to replay through an AG-UI client.

The AG-UI client accepts nothing after a `RUN_ERROR`, so replaying a log that
holds one verbatim would cut the conversation off at the first failed turn.
Each historical error becomes a [RUN\_ERROR\_EVENT](../variables/RUN_ERROR_EVENT.md) followed by the
closers a stopped run gets: whatever reasoning, text, tool calls and
sub-agents the failure left open, then a cancelled `RUN_FINISHED`.

A log can also hold a terminal event outside any open run (e.g. a transport
error persisted after the run already finished). Passing it on would close a
run twice, which the client rejects, so it is dropped.

## Parameters

### events

`BaseEvent`[]

The stored log, in order.

## Returns

`BaseEvent`[]

The log to replay.
