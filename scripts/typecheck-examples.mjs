#!/usr/bin/env node
/**
 * Smoke type-checks every example under examples/ against the BUILT package
 * types (dist/index.d.ts), mirroring how a consumer imports `kaboo-runtime`.
 *
 * Each example's tsconfig maps `kaboo-runtime` to ../../dist/index.d.ts, so this
 * fails if the public types drift from what the docs and examples claim. Run
 * `yarn build` first.
 */
import { readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const EXAMPLES = join(ROOT, "examples");
const TSC = join(ROOT, "node_modules", ".bin", "tsc");

if (!existsSync(join(ROOT, "dist", "index.d.ts"))) {
  console.error("dist/index.d.ts not found — run `yarn build` first.");
  process.exit(1);
}

const examples = existsSync(EXAMPLES)
  ? readdirSync(EXAMPLES, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => join(EXAMPLES, d.name))
      .filter((p) => existsSync(join(p, "tsconfig.json")))
  : [];

if (examples.length === 0) {
  console.log("No examples to type-check.");
  process.exit(0);
}

let failed = false;
for (const dir of examples) {
  console.log(`\n> typecheck ${dir.replace(ROOT + "/", "")}`);
  const res = spawnSync(TSC, ["--noEmit", "-p", join(dir, "tsconfig.json")], {
    stdio: "inherit",
  });
  if (res.status !== 0) failed = true;
}

if (failed) {
  console.error("\nExample type-check failed.");
  process.exit(1);
}
console.log("\nAll examples type-check against the built types.");
