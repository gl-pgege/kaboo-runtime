[**@pgege/kaboo-runtime**](../README.md)

***

# Class: KabooHttpAgent

Defined in: [src/agent.ts:19](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/agent.ts#L19)

An `HttpAgent` for a kaboo-workflows service that also reports what the
service can do: its AG-UI `AgentCapabilities`, read once from
`<url>/capabilities`. CopilotKit includes them in its runtime info, where
`useCapabilities` reads them. A service that does not answer reports none.

## Example

```ts
import { CopilotRuntime } from "@copilotkit/runtime/v2";
import { KabooHttpAgent } from "@pgege/kaboo-runtime";

const runtime = new CopilotRuntime({
  agents: { kaboo: new KabooHttpAgent({ url: "http://localhost:8080/invocations" }) },
});
```

## Extends

- `HttpAgent`

## Constructors

### Constructor

> **new KabooHttpAgent**(`config`): `KabooHttpAgent`

Defined in: node\_modules/@ag-ui/client/dist/index.d.mts:317

#### Parameters

##### config

`HttpAgentConfig`

#### Returns

`KabooHttpAgent`

#### Inherited from

`HttpAgent.constructor`

## Properties

### abortController

> **abortController**: `AbortController`

Defined in: node\_modules/@ag-ui/client/dist/index.d.mts:307

#### Inherited from

`HttpAgent.abortController`

***

### agentId?

> `optional` **agentId?**: `string`

Defined in: node\_modules/@ag-ui/client/dist/index.d.mts:533

#### Inherited from

`HttpAgent.agentId`

***

### description

> **description**: `string`

Defined in: node\_modules/@ag-ui/client/dist/index.d.mts:534

#### Inherited from

`HttpAgent.description`

***

### fetch

> **fetch**: `HttpAgentFetchFn`

Defined in: node\_modules/@ag-ui/client/dist/index.d.mts:306

#### Inherited from

`HttpAgent.fetch`

***

### headers

> **headers**: `Record`\<`string`, `string`\>

Defined in: node\_modules/@ag-ui/client/dist/index.d.mts:305

#### Inherited from

`HttpAgent.headers`

***

### isRunning

> **isRunning**: `boolean`

Defined in: node\_modules/@ag-ui/client/dist/index.d.mts:541

#### Inherited from

`HttpAgent.isRunning`

***

### messages

> **messages**: `Message`[]

Defined in: node\_modules/@ag-ui/client/dist/index.d.mts:536

#### Inherited from

`HttpAgent.messages`

***

### pendingInterrupts

> **pendingInterrupts**: `Interrupt`[]

Defined in: node\_modules/@ag-ui/client/dist/index.d.mts:545

Interrupts emitted by the most recent run that have not yet been resolved.
 Populated when RUN_FINISHED arrives with outcome.type === "interrupt".
 Cleared when a subsequent run completes successfully.

#### Inherited from

`HttpAgent.pendingInterrupts`

***

### state

> **state**: `any`

Defined in: node\_modules/@ag-ui/client/dist/index.d.mts:537

#### Inherited from

`HttpAgent.state`

***

### subscribers

> **subscribers**: `AgentSubscriber`[]

Defined in: node\_modules/@ag-ui/client/dist/index.d.mts:540

#### Inherited from

`HttpAgent.subscribers`

***

### threadId

> **threadId**: `string`

Defined in: node\_modules/@ag-ui/client/dist/index.d.mts:535

#### Inherited from

`HttpAgent.threadId`

***

### url

> **url**: `string`

Defined in: node\_modules/@ag-ui/client/dist/index.d.mts:304

#### Inherited from

`HttpAgent.url`

## Accessors

### debug

#### Get Signature

> **get** **debug**(): `ResolvedAgentDebugConfig`

Defined in: node\_modules/@ag-ui/client/dist/index.d.mts:560

##### Returns

`ResolvedAgentDebugConfig`

#### Set Signature

> **set** **debug**(`value`): `void`

Defined in: node\_modules/@ag-ui/client/dist/index.d.mts:561

##### Parameters

###### value

`ResolvedAgentDebugConfig` \| `AgentDebugConfig`

##### Returns

`void`

#### Inherited from

`HttpAgent.debug`

***

### debugLogger

#### Get Signature

> **get** **debugLogger**(): `DebugLogger` \| `undefined`

Defined in: node\_modules/@ag-ui/client/dist/index.d.mts:562

##### Returns

`DebugLogger` \| `undefined`

#### Set Signature

> **set** **debugLogger**(`value`): `void`

Defined in: node\_modules/@ag-ui/client/dist/index.d.mts:563

##### Parameters

###### value

`boolean` \| `DebugLogger` \| `undefined`

##### Returns

`void`

#### Inherited from

`HttpAgent.debugLogger`

***

### maxProtocolVersion

#### Get Signature

> **get** **maxProtocolVersion**(): `string`

Defined in: node\_modules/@ag-ui/client/dist/index.d.mts:552

##### Returns

`string`

#### Inherited from

`HttpAgent.maxProtocolVersion`

***

### maxVersion

#### Get Signature

> **get** **maxVersion**(): `string`

Defined in: node\_modules/@ag-ui/client/dist/index.d.mts:559

##### Deprecated

Use [maxProtocolVersion](#maxprotocolversion). Same value, honest name: this
is the ceiling the PEER speaks, not which protocol this SDK implements —
that is the generated PROTOCOL_VERSION constant. Registered in the client
package's DEPRECATIONS.md; removal no earlier than 2.0.

##### Returns

`string`

#### Inherited from

`HttpAgent.maxVersion`

## Methods

### abortRun()

> **abortRun**(): `void`

Defined in: node\_modules/@ag-ui/client/dist/index.d.mts:316

#### Returns

`void`

#### Inherited from

`HttpAgent.abortRun`

***

### addMessage()

> **addMessage**(`message`): `void`

Defined in: node\_modules/@ag-ui/client/dist/index.d.mts:608

#### Parameters

##### message

`Message`

#### Returns

`void`

#### Inherited from

`HttpAgent.addMessage`

***

### addMessages()

> **addMessages**(`messages`): `void`

Defined in: node\_modules/@ag-ui/client/dist/index.d.mts:609

#### Parameters

##### messages

`Message`[]

#### Returns

`void`

#### Inherited from

`HttpAgent.addMessages`

***

### apply()

> `protected` **apply**(`input`, `events$`, `subscribers`): `Observable`\<`AgentStateMutation`\>

Defined in: node\_modules/@ag-ui/client/dist/index.d.mts:601

#### Parameters

##### input

`RunAgentInput`

##### events$

`Observable`\<`BaseEvent`\>

##### subscribers

`AgentSubscriber`[]

#### Returns

`Observable`\<`AgentStateMutation`\>

#### Inherited from

`HttpAgent.apply`

***

### clone()

> **clone**(): `HttpAgent`

Defined in: node\_modules/@ag-ui/client/dist/index.d.mts:319

#### Returns

`HttpAgent`

#### Inherited from

`HttpAgent.clone`

***

### connect()

> `protected` **connect**(`input`): `Observable`\<`BaseEvent`\>

Defined in: node\_modules/@ag-ui/client/dist/index.d.mts:591

#### Parameters

##### input

`RunAgentInput`

#### Returns

`Observable`\<`BaseEvent`\>

#### Inherited from

`HttpAgent.connect`

***

### connectAgent()

> **connectAgent**(`parameters?`, `subscriber?`): `Promise`\<`RunAgentResult`\>

Defined in: node\_modules/@ag-ui/client/dist/index.d.mts:592

#### Parameters

##### parameters?

`RunAgentParameters`

##### subscriber?

`AgentSubscriber`

#### Returns

`Promise`\<`RunAgentResult`\>

#### Inherited from

`HttpAgent.connectAgent`

***

### detachActiveRun()

> **detachActiveRun**(): `Promise`\<`void`\>

Defined in: node\_modules/@ag-ui/client/dist/index.d.mts:594

#### Returns

`Promise`\<`void`\>

#### Inherited from

`HttpAgent.detachActiveRun`

***

### getCapabilities()

> **getCapabilities**(): `Promise`\<`AgentCapabilities`\>

Defined in: [src/agent.ts:22](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/agent.ts#L22)

Returns the agent's current capabilities.
Optional — subclasses implement this to advertise what they support.

#### Returns

`Promise`\<`AgentCapabilities`\>

#### Overrides

`HttpAgent.getCapabilities`

***

### legacy\_to\_be\_removed\_runAgentBridged()

> **legacy\_to\_be\_removed\_runAgentBridged**(`config?`): `Observable`\<`LegacyRuntimeProtocolEvent`\>

Defined in: node\_modules/@ag-ui/client/dist/index.d.mts:612

#### Parameters

##### config?

`RunAgentParameters`

#### Returns

`Observable`\<`LegacyRuntimeProtocolEvent`\>

#### Inherited from

`HttpAgent.legacy_to_be_removed_runAgentBridged`

***

### onError()

> `protected` **onError**(`input`, `error`, `subscribers`): `Observable`\<`AgentStateMutation`\>

Defined in: node\_modules/@ag-ui/client/dist/index.d.mts:605

#### Parameters

##### input

`RunAgentInput`

##### error

`Error`

##### subscribers

`AgentSubscriber`[]

#### Returns

`Observable`\<`AgentStateMutation`\>

#### Inherited from

`HttpAgent.onError`

***

### onFinalize()

> `protected` **onFinalize**(`input`, `subscribers`): `Promise`\<`void`\>

Defined in: node\_modules/@ag-ui/client/dist/index.d.mts:606

#### Parameters

##### input

`RunAgentInput`

##### subscribers

`AgentSubscriber`[]

#### Returns

`Promise`\<`void`\>

#### Inherited from

`HttpAgent.onFinalize`

***

### onInitialize()

> `protected` **onInitialize**(`input`, `subscribers`): `Promise`\<`void`\>

Defined in: node\_modules/@ag-ui/client/dist/index.d.mts:604

#### Parameters

##### input

`RunAgentInput`

##### subscribers

`AgentSubscriber`[]

#### Returns

`Promise`\<`void`\>

#### Inherited from

`HttpAgent.onInitialize`

***

### prepareRunAgentInput()

> `protected` **prepareRunAgentInput**(`parameters?`): `RunAgentInput`

Defined in: node\_modules/@ag-ui/client/dist/index.d.mts:603

#### Parameters

##### parameters?

`RunAgentParameters`

#### Returns

`RunAgentInput`

#### Inherited from

`HttpAgent.prepareRunAgentInput`

***

### processApplyEvents()

> `protected` **processApplyEvents**(`input`, `events$`, `subscribers`): `Observable`\<`AgentStateMutation`\>

Defined in: node\_modules/@ag-ui/client/dist/index.d.mts:602

#### Parameters

##### input

`RunAgentInput`

##### events$

`Observable`\<`AgentStateMutation`\>

##### subscribers

`AgentSubscriber`[]

#### Returns

`Observable`\<`AgentStateMutation`\>

#### Inherited from

`HttpAgent.processApplyEvents`

***

### requestInit()

> `protected` **requestInit**(`input`): `RequestInit`

Defined in: node\_modules/@ag-ui/client/dist/index.d.mts:314

Returns the fetch config for the http request.
Override this to customize the request.

#### Parameters

##### input

`RunAgentInput`

#### Returns

`RequestInit`

The fetch config for the http request.

#### Inherited from

`HttpAgent.requestInit`

***

### run()

> **run**(`input`): `Observable`\<`BaseEvent`\>

Defined in: node\_modules/@ag-ui/client/dist/index.d.mts:318

#### Parameters

##### input

`RunAgentInput`

#### Returns

`Observable`\<`BaseEvent`\>

#### Inherited from

`HttpAgent.run`

***

### runAgent()

> **runAgent**(`parameters?`, `subscriber?`): `Promise`\<`RunAgentResult`\>

Defined in: node\_modules/@ag-ui/client/dist/index.d.mts:315

#### Parameters

##### parameters?

`RunHttpAgentConfig`

##### subscriber?

`AgentSubscriber`

#### Returns

`Promise`\<`RunAgentResult`\>

#### Inherited from

`HttpAgent.runAgent`

***

### setMessages()

> **setMessages**(`messages`): `void`

Defined in: node\_modules/@ag-ui/client/dist/index.d.mts:610

#### Parameters

##### messages

`Message`[]

#### Returns

`void`

#### Inherited from

`HttpAgent.setMessages`

***

### setState()

> **setState**(`state`): `void`

Defined in: node\_modules/@ag-ui/client/dist/index.d.mts:611

#### Parameters

##### state

`any`

#### Returns

`void`

#### Inherited from

`HttpAgent.setState`

***

### subscribe()

> **subscribe**(`subscriber`): `object`

Defined in: node\_modules/@ag-ui/client/dist/index.d.mts:580

#### Parameters

##### subscriber

`AgentSubscriber`

#### Returns

`object`

##### unsubscribe

> **unsubscribe**: () => `void`

###### Returns

`void`

#### Inherited from

`HttpAgent.subscribe`

***

### use()

> **use**(...`middlewares`): `this`

Defined in: node\_modules/@ag-ui/client/dist/index.d.mts:589

#### Parameters

##### middlewares

...(`Middleware` \| `MiddlewareFunction`)[]

#### Returns

`this`

#### Inherited from

`HttpAgent.use`
