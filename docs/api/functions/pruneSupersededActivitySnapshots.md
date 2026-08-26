[**@pgege/kaboo-runtime**](../README.md)

***

# Function: pruneSupersededActivitySnapshots()

> **pruneSupersededActivitySnapshots**(`events`): `objectOutputType`\<\{ `rawEvent`: `ZodOptional`\<`ZodAny`\>; `timestamp`: `ZodOptional`\<`ZodNumber`\>; `type`: `ZodNativeEnum`\<*typeof* `EventType`\>; \}, `ZodTypeAny`, `"passthrough"`\>[]

Defined in: [src/store.ts:76](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/store.ts#L76)

Drop `ACTIVITY_SNAPSHOT` events that a later snapshot for the same message
fully replaces, preserving order. A replay produces the identical final UI
because each snapshot carries the complete activity state for its message.
All other events pass through untouched.

## Parameters

### events

`objectOutputType`\<\{ `rawEvent`: `ZodOptional`\<`ZodAny`\>; `timestamp`: `ZodOptional`\<`ZodNumber`\>; `type`: `ZodNativeEnum`\<*typeof* `EventType`\>; \}, `ZodTypeAny`, `"passthrough"`\>[]

## Returns

`objectOutputType`\<\{ `rawEvent`: `ZodOptional`\<`ZodAny`\>; `timestamp`: `ZodOptional`\<`ZodNumber`\>; `type`: `ZodNativeEnum`\<*typeof* `EventType`\>; \}, `ZodTypeAny`, `"passthrough"`\>[]
