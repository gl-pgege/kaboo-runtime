# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/gl-pgege/kaboo-runtime/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/gl-pgege/kaboo-runtime/releases/tag/v0.1.0
