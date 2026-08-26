[**@pgege/kaboo-runtime**](../README.md)

***

# Class: KabooAgentRunner

Defined in: [src/runner.ts:306](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L306)

A CopilotKit `AgentRunner` that persists the full AG-UI event log to a
pluggable [ThreadStore](../interfaces/ThreadStore.md) and replays it verbatim on reconnect. Drop it
into `new CopilotRuntime({ agents, runner })` — it ships no HTTP layer, so it
works under any framework the host already mounts CopilotKit with.

Events are persisted *incrementally* while a run streams (write-behind
batches) and dropped from memory once committed, so memory stays bounded on
long, snapshot-heavy runs and a crash preserves the log up to the last
committed batch. On replay of a thread whose final run has no terminal event
(e.g. the host crashed mid-run), the runner synthesizes the missing
`TEXT_MESSAGE_END` / `TOOL_CALL_*` / `RUN_ERROR` events so clients never
hang on a dangling run.

On each run it injects the thread's persisted state into the run, so anything
kaboo-workflows keeps there is seeded from the store rather than the browser:
`kaboo_history` for multi-agent transcripts, and `kaboo_session` for pending
interrupts — which is what lets an approval survive a restart of the agent
service. Unlike the stock in-memory runner, events are NOT compacted, so
`ACTIVITY_SNAPSHOT` / `CUSTOM` events survive for a full UI replay.

## Example

```ts
import { CopilotRuntime } from "@copilotkit/runtime/v2";
import { KabooAgentRunner, InMemoryThreadStore } from "@pgege/kaboo-runtime";

const runtime = new CopilotRuntime({
  agents: {},
  runner: new KabooAgentRunner(new InMemoryThreadStore()),
});
```

## Extends

- `AgentRunner`

## Constructors

### Constructor

> **new KabooAgentRunner**(`store`, `options?`): `KabooAgentRunner`

Defined in: [src/runner.ts:317](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L317)

#### Parameters

##### store

[`ThreadStore`](../interfaces/ThreadStore.md)

Where to persist and read each thread's event log.

##### options?

[`KabooRunnerOptions`](../interfaces/KabooRunnerOptions.md) = `{}`

Optional hooks (e.g. [KabooRunnerOptions.onStoreError](../interfaces/KabooRunnerOptions.md#onstoreerror)).

#### Returns

`KabooAgentRunner`

#### Overrides

`AgentRunner.constructor`

## Methods

### clearThreads()

> **clearThreads**(): `void`

Defined in: [src/runner.ts:775](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L775)

Clear the in-memory index and the backing store (all threads). Store errors
are routed to [KabooRunnerOptions.onStoreError](../interfaces/KabooRunnerOptions.md#onstoreerror). Throws when the
access policy sets `allowClearAll: false`.

#### Returns

`void`

***

### connect()

> **connect**(`request`): `Observable`\<`objectOutputType`\<\{ `rawEvent`: `ZodOptional`\<`ZodAny`\>; `timestamp`: `ZodOptional`\<`ZodNumber`\>; `type`: `ZodNativeEnum`\<*typeof* `EventType`\>; \}, `ZodTypeAny`, `"passthrough"`\>\>

Defined in: [src/runner.ts:543](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L543)

Replay a thread's stored event log, then tee any in-flight run so a
reconnecting client sees prior turns followed by live events, without
gaps or duplicates (flushing is paused while the split is taken).

When the thread is idle but its log ends in a run with no terminal event —
the host crashed mid-run — the missing `TEXT_MESSAGE_END` / `TOOL_CALL_*` /
`RUN_ERROR` events are synthesized (and persisted, best-effort) so the
client's stream closes cleanly instead of hanging. Completes immediately
(after replay) when nothing is running.

#### Parameters

##### request

`AgentRunnerConnectRequest`

The connect request (`threadId`).

#### Returns

`Observable`\<`objectOutputType`\<\{ `rawEvent`: `ZodOptional`\<`ZodAny`\>; `timestamp`: `ZodOptional`\<`ZodNumber`\>; `type`: `ZodNativeEnum`\<*typeof* `EventType`\>; \}, `ZodTypeAny`, `"passthrough"`\>\>

An observable that emits the stored log and, if running, live events.

#### Overrides

`AgentRunner.connect`

***

### getThreadEvents()

> **getThreadEvents**(`threadId`): `objectOutputType`\<\{ `rawEvent`: `ZodOptional`\<`ZodAny`\>; `timestamp`: `ZodOptional`\<`ZodNumber`\>; `type`: `ZodNativeEnum`\<*typeof* `EventType`\>; \}, `ZodTypeAny`, `"passthrough"`\>[]

Defined in: [src/runner.ts:754](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L754)

Get the not-yet-persisted tail of a thread's in-flight run.

Full event logs are no longer retained in memory (they are persisted
incrementally and dropped once committed), so this synchronous accessor
only sees what is still buffered. For the full log, read the store:
`await store.readEvents(threadId)` — or replay via `connect`.

#### Parameters

##### threadId

`string`

The thread to read.

#### Returns

`objectOutputType`\<\{ `rawEvent`: `ZodOptional`\<`ZodAny`\>; `timestamp`: `ZodOptional`\<`ZodNumber`\>; `type`: `ZodNativeEnum`\<*typeof* `EventType`\>; \}, `ZodTypeAny`, `"passthrough"`\>[]

A copy of the in-flight run's unpersisted events (empty when idle).

***

### getThreadMessages()

> **getThreadMessages**(`threadId`): (\{ `content`: `string`; `encryptedValue?`: `string`; `id`: `string`; `name?`: `string`; `role`: `"developer"`; \} \| \{ `content`: `string`; `encryptedValue?`: `string`; `id`: `string`; `name?`: `string`; `role`: `"system"`; \} \| \{ `content?`: `string`; `encryptedValue?`: `string`; `id`: `string`; `name?`: `string`; `role`: `"assistant"`; `toolCalls?`: `object`[]; \} \| \{ `content`: `string` \| (\{ `text`: `string`; `type`: `"text"`; \} \| \{ `metadata?`: `unknown`; `source`: \{ `mimeType`: `string`; `type`: `"data"`; `value`: `string`; \} \| \{ `mimeType?`: `string`; `type`: `"url"`; `value`: `string`; \}; `type`: `"image"`; \} \| \{ `metadata?`: `unknown`; `source`: \{ `mimeType`: `string`; `type`: `"data"`; `value`: `string`; \} \| \{ `mimeType?`: `string`; `type`: `"url"`; `value`: `string`; \}; `type`: `"audio"`; \} \| \{ `metadata?`: `unknown`; `source`: \{ `mimeType`: `string`; `type`: `"data"`; `value`: `string`; \} \| \{ `mimeType?`: `string`; `type`: `"url"`; `value`: `string`; \}; `type`: `"video"`; \} \| \{ `metadata?`: `unknown`; `source`: \{ `mimeType`: `string`; `type`: `"data"`; `value`: `string`; \} \| \{ `mimeType?`: `string`; `type`: `"url"`; `value`: `string`; \}; `type`: `"document"`; \} \| \{ `data?`: `string`; `filename?`: `string`; `id?`: `string`; `mimeType`: `string`; `type`: `"binary"`; `url?`: `string`; \})[]; `encryptedValue?`: `string`; `id`: `string`; `name?`: `string`; `role`: `"user"`; \} \| \{ `content`: `string`; `encryptedValue?`: `string`; `error?`: `string`; `id`: `string`; `role`: `"tool"`; `toolCallId`: `string`; \} \| \{ `activityType`: `string`; `content`: `Record`\<`string`, `any`\>; `id`: `string`; `role`: `"activity"`; \} \| \{ `content`: `string`; `encryptedValue?`: `string`; `id`: `string`; `role`: `"reasoning"`; \})[]

Defined in: [src/runner.ts:739](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L739)

Get a thread's derived message snapshot from the in-memory index.

#### Parameters

##### threadId

`string`

The thread to read.

#### Returns

(\{ `content`: `string`; `encryptedValue?`: `string`; `id`: `string`; `name?`: `string`; `role`: `"developer"`; \} \| \{ `content`: `string`; `encryptedValue?`: `string`; `id`: `string`; `name?`: `string`; `role`: `"system"`; \} \| \{ `content?`: `string`; `encryptedValue?`: `string`; `id`: `string`; `name?`: `string`; `role`: `"assistant"`; `toolCalls?`: `object`[]; \} \| \{ `content`: `string` \| (\{ `text`: `string`; `type`: `"text"`; \} \| \{ `metadata?`: `unknown`; `source`: \{ `mimeType`: `string`; `type`: `"data"`; `value`: `string`; \} \| \{ `mimeType?`: `string`; `type`: `"url"`; `value`: `string`; \}; `type`: `"image"`; \} \| \{ `metadata?`: `unknown`; `source`: \{ `mimeType`: `string`; `type`: `"data"`; `value`: `string`; \} \| \{ `mimeType?`: `string`; `type`: `"url"`; `value`: `string`; \}; `type`: `"audio"`; \} \| \{ `metadata?`: `unknown`; `source`: \{ `mimeType`: `string`; `type`: `"data"`; `value`: `string`; \} \| \{ `mimeType?`: `string`; `type`: `"url"`; `value`: `string`; \}; `type`: `"video"`; \} \| \{ `metadata?`: `unknown`; `source`: \{ `mimeType`: `string`; `type`: `"data"`; `value`: `string`; \} \| \{ `mimeType?`: `string`; `type`: `"url"`; `value`: `string`; \}; `type`: `"document"`; \} \| \{ `data?`: `string`; `filename?`: `string`; `id?`: `string`; `mimeType`: `string`; `type`: `"binary"`; `url?`: `string`; \})[]; `encryptedValue?`: `string`; `id`: `string`; `name?`: `string`; `role`: `"user"`; \} \| \{ `content`: `string`; `encryptedValue?`: `string`; `error?`: `string`; `id`: `string`; `role`: `"tool"`; `toolCallId`: `string`; \} \| \{ `activityType`: `string`; `content`: `Record`\<`string`, `any`\>; `id`: `string`; `role`: `"activity"`; \} \| \{ `content`: `string`; `encryptedValue?`: `string`; `id`: `string`; `role`: `"reasoning"`; \})[]

A copy of the thread's messages (empty when unknown).

***

### getThreadState()

> **getThreadState**(`threadId`): `Record`\<`string`, `unknown`\> \| `null`

Defined in: [src/runner.ts:766](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L766)

Get a thread's latest state (from its last `STATE_SNAPSHOT`), folded
incrementally as runs stream and hydrated from the store on cold start.

#### Parameters

##### threadId

`string`

The thread to read.

#### Returns

`Record`\<`string`, `unknown`\> \| `null`

The latest state, or `null` when unknown or never emitted.

***

### hydrate()

> **hydrate**(): `Promise`\<`void`\>

Defined in: [src/runner.ts:330](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L330)

Warm the in-memory index from the store so the synchronous thread-query
methods (`listThreads`, `getThreadMessages`, ...) work after a cold start.
Loads each thread's metadata, message snapshot, and latest state — not its
event log. Optional: `run`/`connect` also hydrate their own thread lazily.

#### Returns

`Promise`\<`void`\>

***

### isRunning()

> **isRunning**(`request`): `Promise`\<`boolean`\>

Defined in: [src/runner.ts:674](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L674)

Report whether a thread currently has a run in flight.

#### Parameters

##### request

`AgentRunnerIsRunningRequest`

The is-running request (`threadId`).

#### Returns

`Promise`\<`boolean`\>

`true` while a run is active, otherwise `false`.

#### Overrides

`AgentRunner.isRunning`

***

### listThreads()

> **listThreads**(): `LocalThreadEndpointRecord`[]

Defined in: [src/runner.ts:717](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L717)

List threads that have at least one event, most recently updated first, as
CopilotKit `LocalThreadEndpointRecord`s. Served synchronously from the
in-memory index (call [KabooAgentRunner.hydrate](#hydrate) after a cold start).

`createdById` carries the thread's owner (from the store record or
[KabooAccessPolicy.ownerOf](../interfaces/KabooAccessPolicy.md#ownerof); empty string when unknown), so hosts can
scope the list per caller. Note: CopilotKit's thread-list handler does not
pass the caller subject down to the runner, so per-caller filtering itself
still happens in the host (e.g. an `onResponse` filter comparing
`createdById`).

#### Returns

`LocalThreadEndpointRecord`[]

The thread records for CopilotKit's thread-list endpoint.

***

### run()

> **run**(`request`): `Observable`\<`objectOutputType`\<\{ `rawEvent`: `ZodOptional`\<`ZodAny`\>; `timestamp`: `ZodOptional`\<`ZodNumber`\>; `type`: `ZodNativeEnum`\<*typeof* `EventType`\>; \}, `ZodTypeAny`, `"passthrough"`\>\>

Defined in: [src/runner.ts:415](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L415)

Run an agent for a thread, streaming its AG-UI events. The thread's
persisted state is injected into `input.state` first. Events are persisted
incrementally as the run streams (and dropped from memory once committed);
the derived message snapshot is persisted on completion. Throws if the
thread is already running.

#### Parameters

##### request

`AgentRunnerRunRequest`

The CopilotKit run request (`threadId`, `agent`, `input`).

#### Returns

`Observable`\<`objectOutputType`\<\{ `rawEvent`: `ZodOptional`\<`ZodAny`\>; `timestamp`: `ZodOptional`\<`ZodNumber`\>; `type`: `ZodNativeEnum`\<*typeof* `EventType`\>; \}, `ZodTypeAny`, `"passthrough"`\>\>

An observable of the run's events (also mirrored to `connect`).

#### Overrides

`AgentRunner.run`

***

### stop()

> **stop**(`request`): `Promise`\<`boolean` \| `undefined`\>

Defined in: [src/runner.ts:685](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L685)

Request cancellation of a thread's in-flight run by aborting its agent.

#### Parameters

##### request

`AgentRunnerStopRequest`

The stop request (`threadId`).

#### Returns

`Promise`\<`boolean` \| `undefined`\>

`true` if a stop was initiated; `false` when nothing is running, a
stop was already requested, or the abort threw.

#### Overrides

`AgentRunner.stop`
