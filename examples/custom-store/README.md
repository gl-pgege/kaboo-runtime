# custom-store

Implements the `ThreadStore` contract against a single JSON file
(`JsonFileThreadStore`) to demonstrate the extension point. The store class is
the canonical source for the [Custom store](https://gl-pgege.github.io/@pgege/kaboo-runtime/custom-store/)
guide (kept in sync via a drift check).

## What it shows

- All seven `ThreadStore` methods implemented from scratch.
- Storing events **verbatim** and deriving state with `deriveState`.
- Wiring a custom store into `createKabooRunner(store)` (`src/server.ts`).

## Prerequisites

- Node.js >= 18.

## Run

```bash
yarn install
yarn start
```

Threads are written to `./threads.json`. Swap the file path (or reimplement the
class against your own datastore) to persist wherever you like.
