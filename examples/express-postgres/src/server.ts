// #region quickstart
import express from "express";
import { CopilotRuntime } from "@copilotkit/runtime/v2";
import { createCopilotExpressHandler } from "@copilotkit/runtime/v2/express";
import { createKabooRunner, PostgresThreadStore } from "@pgege/kaboo-runtime";

const dsn = process.env.DATABASE_URL;
if (!dsn) throw new Error("Set DATABASE_URL to a Postgres connection string.");

const runtime = new CopilotRuntime({
  agents: {},
  runner: createKabooRunner(new PostgresThreadStore({ dsn })),
});

const app = express();
app.use(createCopilotExpressHandler({ runtime, basePath: "/api/copilotkit" }));

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`CopilotKit runtime on http://localhost:${port}/api/copilotkit`);
  console.log("kaboo-runtime persistence: PostgresThreadStore");
});
// #endregion quickstart
