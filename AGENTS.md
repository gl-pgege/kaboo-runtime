# AGENTS.md

Guidance for AI agents contributing to **kaboo-runtime**. Humans: see
[CONTRIBUTING.md](./CONTRIBUTING.md).

## Commands

```bash
corepack enable            # once; Yarn 4 is pinned via packageManager
yarn install --immutable   # install
yarn build                 # tsup -> dist/ (single barrel, ESM + CJS + d.ts)
yarn test                  # vitest run
yarn typecheck             # tsc --noEmit
yarn docs:api              # typedoc + regenerate docs/api-inventory.md (completeness gate)
yarn docs:verify           # type-check every ts snippet in README + docs
yarn docs:llms             # regenerate llms.txt + llms-full.txt
yarn examples:typecheck    # type-check examples/ against built types
```

`prepack` runs build + docs:api + docs:llms + docs:verify + test (fires on
`yarn pack` and `yarn npm publish`).

## Architecture & conventions

- **Single `.` barrel.** Everything public is re-exported from `src/index.ts`:
  `KabooAgentRunner`, `createKabooRunner`, `InMemoryThreadStore`,
  `PostgresThreadStore`, `deriveState`, and the `ThreadStore` / `StoredThread` /
  `KabooRunnerOptions` / `PostgresThreadStoreOptions` types.
- **No HTTP layer.** The runner is a CopilotKit `AgentRunner` only; hosts mount
  the runtime themselves. Never add Express/Nest coupling to `src/`.
- **Peers.** `@ag-ui/client`, `@copilotkit/runtime`, `rxjs` are required peers;
  `pg` is optional (only `PostgresThreadStore` uses it, via a dynamic import).
- **Events are verbatim.** Never compact or drop events in a store; the full UI
  is reconstructed from them. Derive state with `deriveState`, never a bespoke
  scan.

## Playbooks

### Add a store

1. Implement `ThreadStore` (all 7 methods) under `src/stores/`.
2. Export it from `src/index.ts` with a TSDoc description **and an `@example`**
   (the completeness gate fails on any undocumented export).
3. Add a test (gate external services on an env var, like the Postgres test).
4. Add a runnable `examples/<name>/` and, if a guide shows the code, wrap the
   region with `// #region <name>` and reference it from the doc.
5. Run `yarn docs:api` (regenerates `docs/api` + `docs/api-inventory.md`).

### Add a guide

1. Create `docs/<name>.md`. Every `ts` fence must type-check under `docs:verify`
   (tag illustrative fragments ```` ```ts no-verify ````).
2. Add it to `mkdocs.yml` nav **and** the `NAV` list in
   `scripts/generate-llms.mjs` (same order).
3. Run `yarn docs:verify` and `yarn docs:llms`.

### Add an example

1. Create `examples/<name>/` with `package.json`, `tsconfig.json` (map
   `kaboo-runtime` → `../../dist/index.d.ts`), `README.md`, and `src/`.
2. If a guide/README snippet copies from it, wrap the region with
   `// #region <name>` / `// #endregion` and reference it with
   `<!-- source: examples/<name>/src/File.ts#<name> -->` above the fence.
3. Run `yarn build && yarn examples:typecheck`.

## Definition of done

- `yarn test` green.
- `yarn docs:api` passes the TypeDoc completeness gate (no undocumented exports)
  and produces no `docs/api` / `docs/api-inventory.md` drift.
- `yarn docs:verify` green.
- `yarn docs:llms` produces no `llms.txt` / `llms-full.txt` drift.
- `yarn examples:typecheck` green.
- `mkdocs build --strict` green.
- `yarn pack --dry-run` clean (`dist` + root metadata only; no `src/`, tests,
  `docs/`, or `examples/`).

## Guardrails

- Never add an undocumented public export.
- Never add an unverified `ts` snippet to the docs.
- Never point URLs at the old `kaboo/kaboo-workflows` monorepo path — use
  `gl-pgege/kaboo-runtime`.
- Never plan or run a live publish; the deliverable is a dry run + the publish
  command for a human to run.

## Related

- [kaboo-workflows](https://github.com/gl-pgege/kaboo-workflows)
- [kaboo-react](https://github.com/gl-pgege/kaboo-react)
- [kaboo-workflows-demo](https://github.com/gl-pgege/kaboo-workflows-demo) — the
  runnable, end-to-end reference that consumes this library.
- [The kaboo stack](https://gl-pgege.github.io/kaboo-docs/) — umbrella landing.
