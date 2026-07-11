import express from "express";
import { CopilotRuntime } from "@copilotkit/runtime/v2";
import { createCopilotExpressHandler } from "@copilotkit/runtime/v2/express";
import { createKabooRunner } from "@kaboo/runtime";
import { JsonFileThreadStore } from "./store";

const runtime = new CopilotRuntime({
  agents: {},
  runner: createKabooRunner(new JsonFileThreadStore("./threads.json")),
});

const app = express();
app.use(createCopilotExpressHandler({ runtime, basePath: "/api/copilotkit" }));

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`CopilotKit runtime on http://localhost:${port}/api/copilotkit`);
  console.log("kaboo-runtime persistence: JsonFileThreadStore (./threads.json)");
});
