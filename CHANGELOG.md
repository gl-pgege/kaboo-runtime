# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.2]

### Fixed

- **Conversations no longer appear empty after a run that failed at startup.**
  A run that errors before its agent emits anything (bad config, unreachable
  backend) leaves only `RUN_STARTED` / `RUN_ERROR` in the event log, so a
  replay rendered the conversation without the user's message — even though
  the derived message snapshot (persisted even on failure) still had it.
  `connect` now reconciles the replayed log against the message snapshot and
  closes the stream with a `MESSAGES_SNAPSHOT` when messages would otherwise
  be lost. No-op for healthy logs.

## [0.5.1]

### Fixed

- **Reconnecting to a long conversation no longer replays hundreds of MB.**
  Stores now prune superseded `ACTIVITY_SNAPSHOT` events on append: each
  snapshot fully replaces the previous one for its message, so only the latest
  per message is kept. Long agent runs previously accumulated thousands of
  snapshots at hundreds of KB each, making `connect` replay (and the stored
  log) grow into the hundreds of MB per conversation. Replay output is
  visually identical. The shared helper is exported as
  `pruneSupersededActivitySnapshots` for custom stores.

## [0.5.0]

### Fixed

- **A single store-rejected event no longer loses the whole run's log.** When a
  write-behind batch fails, the runner now retries its events one at a time:
  events the store deterministically rejects ("poison" events) are dropped and
  reported via `onStoreError`, and the rest of the log keeps persisting. Before,
  every retry resent the poison in an ever-growing batch, so nothing after it
  was ever persisted and the retry buffer grew for the run's lifetime —
  long runs could OOM the host. A store that rejects *everything* is still
  treated as down: the batch stays buffered and flushes on recovery.
- **Postgres store sanitizes `jsonb`-hostile strings.** `jsonb` rejects strings
  containing `\u0000` or lone UTF-16 surrogates, which agent tool output (raw
  command output, binary-ish file content) can legitimately contain. The
  Postgres store now strips `\u0000` and repairs lone surrogates on
  `appendEvents` and `saveMessages`, turning a formerly poisonous event into a
  persistable one.

## [0.2.1]

### Added

- **"Server-side forwarded props" guide** — where to stamp the props only the
  server can vouch for (a run's workflow config, a scoped token, the tenant) by
  wrapping the runner, and why conversation state does not belong there.

### Fixed

- **Persisted state now reaches the agent.** The merge of a thread's stored state
  with the caller's was computed and then dropped, so `input.state` was whatever
  the caller sent. It is now set on the agent, making state replay the guarantee
  the docs describe: `kaboo_history` is seeded from the server, and a pending
  human-in-the-loop approval (`kaboo_session`, kaboo-workflows 0.14) survives a
  workflows restart instead of failing with `No agent session found for resume`.

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
