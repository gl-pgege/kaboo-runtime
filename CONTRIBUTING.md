# Contributing to kaboo-runtime

Thanks for contributing! This guide is for human contributors. AI agents should
also read [AGENTS.md](./AGENTS.md).

## Prerequisites

- Node.js >= 18
- Yarn 4 (Berry). The repo pins it via the `packageManager` field; run
  `corepack enable` once and Yarn resolves the right version automatically.

## Install

```bash
yarn install --immutable
```

## Dev loop

```bash
yarn build          # tsup -> dist/ (single barrel, ESM + CJS + d.ts)
yarn test           # vitest run
yarn test:watch     # vitest watch
yarn typecheck      # tsc --noEmit
yarn docs:api       # typedoc completeness gate + regenerate api inventory
yarn docs:verify    # type-check every doc snippet
yarn docs:llms      # regenerate llms.txt / llms-full.txt
yarn examples:typecheck
```

The Postgres store tests are gated on `DATABASE_URL` and skip when it is unset.
Set it to a reachable Postgres instance to run them locally.

## Conventions

- **Single `.` barrel.** Everything public is re-exported from `src/index.ts`.
- **No HTTP layer.** The runner is a CopilotKit `AgentRunner`; hosts mount the
  runtime themselves. Don't add Express/Nest coupling to `src/`.
- **Peer dependencies** are `@ag-ui/client`, `@copilotkit/runtime`, and `rxjs`;
  `pg` is an optional peer used only by `PostgresThreadStore`. Avoid adding
  runtime dependencies.
- **Events are verbatim.** Never compact events in a store; derive state with
  `deriveState`.
- **Every public export needs TSDoc + an `@example`** — the `docs:api`
  completeness gate fails otherwise.

## Prove your docs

Every `ts` snippet in `README.md` and `docs/**` must type-check via
`yarn docs:verify`. Canonical, runnable usage lives in `examples/` (and the
tests); when a doc snippet copies from an example, wrap the source in a
`// #region <name>` / `// #endregion` block and reference it above the fence:

```md
<!-- source: examples/express-inmemory/src/server.ts#quickstart -->
```

Illustrative fragments that can't compile standalone use ```` ```ts no-verify ````.

## Commit & PR conventions

- Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`,
  `fix:`, `docs:`, `chore:`, …).
- PRs must be green on CI: build, typecheck, test, `docs:api` (no drift),
  `docs:verify`, `docs:llms` (no drift), `examples:typecheck`, and
  `yarn pack --dry-run`.
- Add/adjust tests for behavior changes and a `CHANGELOG.md` entry under
  `Unreleased`.

## Release flow

1. Bump `version` and add a `CHANGELOG.md` entry.
2. `yarn build && yarn test && yarn pack --dry-run` (the `prepack` gate runs the
   full docs + tests suite).
3. Publish only after review: `yarn npm publish` (respects
   `publishConfig.access: public`).

## Docs site

- The docs site is built with MkDocs Material and deployed by
  `.github/workflows/pages.yml`. Enable it once under **Settings → Pages →
  Source: GitHub Actions**.

## Code of conduct

By participating you agree to the [Code of Conduct](./CODE_OF_CONDUCT.md).
