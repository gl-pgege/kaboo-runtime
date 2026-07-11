[**kaboo-runtime**](../README.md)

***

# Class: KabooAgentRunner

Defined in: [src/runner.ts:57](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L57)

A CopilotKit `AgentRunner` that persists the full AG-UI event log to a
pluggable [ThreadStore](../interfaces/ThreadStore.md) and replays it verbatim on reconnect. Drop it
into `new CopilotRuntime({ agents, runner })` — it ships no HTTP layer, so it
works under any framework the host already mounts CopilotKit with.

On each run it injects the thread's persisted state (including kaboo-workflows'
`kaboo_history`) into `input.state`, so multi-agent history is seeded from the
store rather than the browser. Unlike the stock in-memory runner, events are
NOT compacted, so `ACTIVITY_SNAPSHOT` / `CUSTOM` events survive for a full UI
replay.

## Example

```ts
import { CopilotRuntime } from "@copilotkit/runtime/v2";
import { KabooAgentRunner, InMemoryThreadStore } from "kaboo-runtime";

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

Defined in: [src/runner.ts:67](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L67)

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

Defined in: [src/runner.ts:340](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L340)

Clear the in-memory index and the backing store (all threads). Store errors
are routed to [KabooRunnerOptions.onStoreError](../interfaces/KabooRunnerOptions.md#onstoreerror).

#### Returns

`void`

***

### connect()

> **connect**(`request`): `Observable`\<`objectOutputType`\<\{ `rawEvent`: `ZodOptional`\<`ZodAny`\>; `timestamp`: `ZodOptional`\<`ZodNumber`\>; `type`: `ZodNativeEnum`\<*typeof* `EventType`\>; \}, `ZodTypeAny`, `"passthrough"`\>\>

Defined in: [src/runner.ts:217](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L217)

Replay a thread's stored event log, then tee any in-flight run so a
reconnecting client sees prior turns followed by live events. Completes
immediately (after replay) when nothing is running.

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

Defined in: [src/runner.ts:321](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L321)

Get a thread's full event log from the in-memory index.

#### Parameters

##### threadId

`string`

The thread to read.

#### Returns

`objectOutputType`\<\{ `rawEvent`: `ZodOptional`\<`ZodAny`\>; `timestamp`: `ZodOptional`\<`ZodNumber`\>; `type`: `ZodNativeEnum`\<*typeof* `EventType`\>; \}, `ZodTypeAny`, `"passthrough"`\>[]

A copy of the thread's events (empty when unknown).

***

### getThreadMessages()

> **getThreadMessages**(`threadId`): (\{ `content`: `string`; `encryptedValue?`: `string`; `id`: `string`; `name?`: `string`; `role`: `"developer"`; \} \| \{ `content`: `string`; `encryptedValue?`: `string`; `id`: `string`; `name?`: `string`; `role`: `"system"`; \} \| \{ `content?`: `string`; `encryptedValue?`: `string`; `id`: `string`; `name?`: `string`; `role`: `"assistant"`; `toolCalls?`: `object`[]; \} \| \{ `content`: `string` \| (\{ `text`: `string`; `type`: `"text"`; \} \| \{ `metadata?`: `unknown`; `source`: \{ `mimeType`: `string`; `type`: `"data"`; `value`: `string`; \} \| \{ `mimeType?`: `string`; `type`: `"url"`; `value`: `string`; \}; `type`: `"image"`; \} \| \{ `metadata?`: `unknown`; `source`: \{ `mimeType`: `string`; `type`: `"data"`; `value`: `string`; \} \| \{ `mimeType?`: `string`; `type`: `"url"`; `value`: `string`; \}; `type`: `"audio"`; \} \| \{ `metadata?`: `unknown`; `source`: \{ `mimeType`: `string`; `type`: `"data"`; `value`: `string`; \} \| \{ `mimeType?`: `string`; `type`: `"url"`; `value`: `string`; \}; `type`: `"video"`; \} \| \{ `metadata?`: `unknown`; `source`: \{ `mimeType`: `string`; `type`: `"data"`; `value`: `string`; \} \| \{ `mimeType?`: `string`; `type`: `"url"`; `value`: `string`; \}; `type`: `"document"`; \} \| \{ `data?`: `string`; `filename?`: `string`; `id?`: `string`; `mimeType`: `string`; `type`: `"binary"`; `url?`: `string`; \})[]; `encryptedValue?`: `string`; `id`: `string`; `name?`: `string`; `role`: `"user"`; \} \| \{ `content`: `string`; `encryptedValue?`: `string`; `error?`: `string`; `id`: `string`; `role`: `"tool"`; `toolCallId`: `string`; \} \| \{ `activityType`: `string`; `content`: `Record`\<`string`, `any`\>; `id`: `string`; `role`: `"activity"`; \} \| \{ `content`: `string`; `encryptedValue?`: `string`; `id`: `string`; `role`: `"reasoning"`; \})[]

Defined in: [src/runner.ts:311](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L311)

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

Defined in: [src/runner.ts:331](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L331)

Get a thread's latest derived state (from its last `STATE_SNAPSHOT`).

#### Parameters

##### threadId

`string`

The thread to read.

#### Returns

`Record`\<`string`, `unknown`\> \| `null`

The derived state, or `null` when unknown or never emitted.

***

### hydrate()

> **hydrate**(): `Promise`\<`void`\>

Defined in: [src/runner.ts:79](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L79)

Warm the in-memory index from the store so the synchronous thread-query
methods (`listThreads`, `getThreadEvents`, ...) work after a cold start.
Optional: `run`/`connect` also hydrate their own thread lazily.

#### Returns

`Promise`\<`void`\>

***

### isRunning()

> **isRunning**(`request`): `Promise`\<`boolean`\>

Defined in: [src/runner.ts:253](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L253)

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

Defined in: [src/runner.ts:289](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L289)

List threads that have at least one persisted event, most recently updated
first, as CopilotKit `LocalThreadEndpointRecord`s. Served synchronously from
the in-memory index (call [KabooAgentRunner.hydrate](#hydrate) after a cold start).

#### Returns

`LocalThreadEndpointRecord`[]

The thread records for CopilotKit's thread-list endpoint.

***

### run()

> **run**(`request`): `Observable`\<`objectOutputType`\<\{ `rawEvent`: `ZodOptional`\<`ZodAny`\>; `timestamp`: `ZodOptional`\<`ZodNumber`\>; `type`: `ZodNativeEnum`\<*typeof* `EventType`\>; \}, `ZodTypeAny`, `"passthrough"`\>\>

Defined in: [src/runner.ts:138](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L138)

Run an agent for a thread, streaming its AG-UI events. The thread's
persisted state is injected into `input.state` first; on completion the run's
events and derived messages are persisted to the store. Throws if the thread
is already running.

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

Defined in: [src/runner.ts:264](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L264)

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
