# NestJS integration

kaboo-runtime has no HTTP layer, so it works with a Nest app the same way it
works anywhere: build a `CopilotRuntime` with `createKabooRunner(store)` and mount
CopilotKit's Express handler on the Nest platform adapter. This is exactly the
pattern the [demo backend](https://github.com/gl-pgege/kaboo-workflows-demo)
uses.

```ts no-verify
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { CopilotRuntime } from "@copilotkit/runtime/v2";
import { createCopilotExpressHandler } from "@copilotkit/runtime/v2/express";
import { HttpAgent } from "@ag-ui/client";
import {
  createKabooRunner,
  InMemoryThreadStore,
  PostgresThreadStore,
  type ThreadStore,
} from "kaboo-runtime";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const dsn = process.env.DATABASE_URL;
  const store: ThreadStore = dsn
    ? new PostgresThreadStore({ dsn })
    : new InMemoryThreadStore();

  const runtime = new CopilotRuntime({
    agents: {
      research_pipeline: new HttpAgent({
        url: process.env.PIPELINE_SERVICE_URL ?? "http://localhost:8080/invocations",
      }),
    },
    runner: createKabooRunner(store),
  });

  app.use(createCopilotExpressHandler({ runtime, basePath: "/api/copilotkit" }));
  app.enableCors();

  await app.listen(process.env.PORT ?? 4000);
}

bootstrap();
```

Notes:

- Store selection by `DATABASE_URL` gives you zero-config in-memory locally and
  durable Postgres in production without code changes.
- Because the runner is transport-agnostic, the same wiring works with any Nest
  HTTP adapter that can mount an Express-style handler.
