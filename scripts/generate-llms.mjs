#!/usr/bin/env node
/**
 * docs:llms — generates the AI-native docs index at the repo root:
 *
 * - llms.txt      — an llmstxt.org index: title, summary, and curated link
 *                   sections pointing at the published docs site.
 * - llms-full.txt — README.md + every guide (in mkdocs nav order) concatenated,
 *                   each prefixed with a `# <path>` header and separated by
 *                   `---`, so an LLM can ingest the whole doc set in one file.
 *
 * Zero dependencies and deterministic, so CI can diff for drift. Keep NAV in
 * sync with mkdocs.yml.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PAGES = "https://gl-pgege.github.io/kaboo-runtime/";
const REPO = "https://github.com/gl-pgege/kaboo-runtime";

const SUMMARY =
  "A persistence plugin for the CopilotKit runtime: a custom AgentRunner + " +
  "pluggable ThreadStore that persists the full AG-UI event log and replays it " +
  "on reload. Framework-agnostic, no HTTP layer.";

// Mirrors mkdocs.yml nav (excluding the generated api/ tree).
const NAV = [
  { title: "Home", path: "docs/index.md", url: PAGES },
  { title: "Getting started", path: "docs/getting-started.md", url: `${PAGES}getting-started/` },
  { title: "Thread stores", path: "docs/thread-stores.md", url: `${PAGES}thread-stores/` },
  { title: "Custom store", path: "docs/custom-store.md", url: `${PAGES}custom-store/` },
  { title: "Replay & state", path: "docs/replay-and-state.md", url: `${PAGES}replay-and-state/` },
  { title: "NestJS integration", path: "docs/integrations/nestjs.md", url: `${PAGES}integrations/nestjs/` },
  { title: "Express integration", path: "docs/integrations/express.md", url: `${PAGES}integrations/express/` },
  { title: "API inventory", path: "docs/api-inventory.md", url: `${PAGES}api-inventory/` },
];

const read = (p) => readFileSync(join(ROOT, p), "utf8");

// ---- llms.txt -------------------------------------------------------------
let llms = `# kaboo-runtime\n\n> ${SUMMARY}\n\n`;
llms +=
  "kaboo-runtime drops a custom AgentRunner into a CopilotKit runtime that " +
  "records every AG-UI event verbatim to a pluggable ThreadStore and replays it " +
  "on reconnect, so a reload rebuilds the full transcript (messages, tools, " +
  "state, activity). It ships `InMemoryThreadStore` and `PostgresThreadStore`, " +
  "and has no HTTP layer of its own.\n\n";

llms += "## Docs\n\n";
for (const n of NAV) llms += `- [${n.title}](${n.url})\n`;

llms += "\n## API\n\n";
llms += `- [API reference](${PAGES}api/): auto-generated TypeDoc.\n`;
llms += `- [API inventory](${PAGES}api-inventory/): every public export.\n`;

llms += "\n## Examples\n\n";
llms += `- [examples/express-inmemory](${REPO}/tree/main/examples/express-inmemory): smallest end-to-end wiring.\n`;
llms += `- [examples/express-postgres](${REPO}/tree/main/examples/express-postgres): durable Postgres persistence.\n`;
llms += `- [examples/custom-store](${REPO}/tree/main/examples/custom-store): implement ThreadStore yourself.\n`;
llms += `- [kaboo-workflows-demo](https://github.com/gl-pgege/kaboo-docs/tree/main/examples/kaboo-workflows-demo): full demo app.\n`;

llms += "\n## Related\n\n";
llms += "- [kaboo-workflows](https://github.com/gl-pgege/kaboo-workflows): Python multi-agent orchestration.\n";
llms += "- [kaboo-react](https://github.com/gl-pgege/kaboo-react): React UI for kaboo activity in a CopilotKit app.\n";

writeFileSync(join(ROOT, "llms.txt"), llms);

// ---- llms-full.txt --------------------------------------------------------
const files = ["README.md", ...NAV.map((n) => n.path)];
const full = files
  .map((p) => `# ${p}\n\n${read(p).trim()}\n`)
  .join("\n---\n\n");

writeFileSync(join(ROOT, "llms-full.txt"), full);

console.log("Wrote llms.txt and llms-full.txt");
