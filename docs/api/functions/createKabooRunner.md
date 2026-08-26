[**@pgege/kaboo-runtime**](../README.md)

***

# Function: createKabooRunner()

> **createKabooRunner**(`store`, `options?`): [`KabooAgentRunner`](../classes/KabooAgentRunner.md)

Defined in: [src/runner.ts:795](https://github.com/gl-pgege/kaboo-runtime/blob/main/src/runner.ts#L795)

Create a [KabooAgentRunner](../classes/KabooAgentRunner.md) bound to a [ThreadStore](../interfaces/ThreadStore.md). Pass the
result to `new CopilotRuntime({ agents, runner })`.

```ts
const runtime = new CopilotRuntime({
  agents: { research_pipeline: new HttpAgent({ url: pipelineUrl }) },
  runner: createKabooRunner(new PostgresThreadStore({ dsn })),
});
```

## Parameters

### store

[`ThreadStore`](../interfaces/ThreadStore.md)

### options?

[`KabooRunnerOptions`](../interfaces/KabooRunnerOptions.md)

## Returns

[`KabooAgentRunner`](../classes/KabooAgentRunner.md)
