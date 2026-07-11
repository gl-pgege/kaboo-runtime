# Express integration

On a plain Express app, build a `CopilotRuntime` with `createKabooRunner(store)`
and mount CopilotKit's Express handler. The runner ships no HTTP layer, so this is
the whole integration:

<!-- source: examples/express-inmemory/src/server.ts#quickstart -->
```ts
import express from "express";
import { CopilotRuntime } from "@copilotkit/runtime/v2";
import { createCopilotExpressHandler } from "@copilotkit/runtime/v2/express";
import { createKabooRunner, InMemoryThreadStore } from "@pgege/kaboo-runtime";

const runtime = new CopilotRuntime({
  agents: {},
  runner: createKabooRunner(new InMemoryThreadStore()),
});

const app = express();
app.use(createCopilotExpressHandler({ runtime, basePath: "/api/copilotkit" }));

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`CopilotKit runtime on http://localhost:${port}/api/copilotkit`);
  console.log("kaboo-runtime persistence: InMemoryThreadStore");
});
```

For durable persistence, swap in `new PostgresThreadStore({ dsn })` — see
[`examples/express-postgres`](https://github.com/gl-pgege/@pgege/kaboo-runtime/tree/main/examples/express-postgres).
Add your real agents to the `agents` map (e.g. an `HttpAgent` pointing at a
kaboo-workflows pipeline).
