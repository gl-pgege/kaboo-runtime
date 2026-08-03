# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0]

### Added

- **Thread ownership.** `StoredThread` gains `ownerId`; the Postgres store adds
  an additive `owner_id` column (`ADD COLUMN IF NOT EXISTS`, no migration step)
  written on upsert and preserved when later runs pass no owner.
- `ThreadStore.appendEvents` accepts an optional trailing `ownerId` and
  `listThreads({ ownerId })` scopes the list to one subject (both stores).
- `KabooRunnerOptions.accessPolicy` — `ownerOf(threadId)` resolves the owning
  subject (recorded on persist, surfaced as `createdById` in
  `runner.listThreads()` instead of the previous hard-coded `""`), and
  `allowClearAll: false` makes `clearThreads()` throw instead of wiping the
  store.
- New [Access control](https://gl-pgege.github.io/kaboo-runtime/access-control/)
  docs page covering the pattern and its honest limits (CopilotKit's list
  handler never passes the caller subject, so per-caller filtering stays in the
  host).

## [0.1.1]

### Fixed

- Corrected `homepage`, `bugs`, badge, and documentation URLs that were
  accidentally rewritten to include the package scope during the `@pgege`
  rename (e.g. `github.io/@pgege/kaboo-runtime` → `github.io/kaboo-runtime`).

## [0.1.0]

Initial release.

### Added

- `KabooAgentRunner` — a CopilotKit `AgentRunner` that persists the full AG-UI
  event log verbatim (no compaction) and replays it on reconnect, injecting each
  thread's persisted state (including kaboo-workflows' `kaboo_history`) into runs.
- `createKabooRunner(store, options?)` — factory for wiring the runner into
  `new CopilotRuntime({ agents, runner })`.
- `ThreadStore` — the pluggable persistence contract (7 methods).
- `InMemoryThreadStore` — process-lifetime store for local dev, tests, and demos.
- `PostgresThreadStore` — durable store backed by its own `kaboo_*` tables.
- `deriveState(events)` — derive the latest agent state from an event log.

[Unreleased]: https://github.com/gl-pgege/kaboo-runtime/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/gl-pgege/kaboo-runtime/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/gl-pgege/kaboo-runtime/releases/tag/v0.1.0
