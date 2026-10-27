import { EventType, type BaseEvent } from "@ag-ui/client";
import { applyPatch, type Operation } from "fast-json-patch";

/** A thread's shared state: its top-level keys and their values. */
export type ThreadState = Record<string, unknown>;

/**
 * Apply a `STATE_DELTA`'s JSON Patch to a state value without mutating it. A
 * patch that does not apply leaves the state as it was.
 *
 * @param state - The state before the delta.
 * @param delta - The delta's JSON Patch operations.
 * @returns The state after the delta.
 */
export function applyStateDelta(state: ThreadState | null, delta: unknown): ThreadState | null {
  if (!Array.isArray(delta) || delta.length === 0) return state;
  try {
    const operations = delta as Operation[];
    const result = applyPatch(touchedCopy(state ?? {}, operations), operations, false, true).newDocument;
    return result && typeof result === "object" && !Array.isArray(result) ? (result as ThreadState) : state;
  } catch {
    return state;
  }
}

function topKey(path: unknown): string | null {
  if (typeof path !== "string" || !path.startsWith("/")) return null;
  const segment = path.slice(1).split("/")[0];
  return segment ? segment.replaceAll("~1", "/").replaceAll("~0", "~") : null;
}

/**
 * A copy of the state the patch can change in place: the top-level values it
 * touches are cloned, the rest shared, so a delta to one key does not copy
 * every agent's transcript.
 */
function touchedCopy(state: ThreadState, operations: Operation[]): ThreadState {
  const keys = operations.flatMap((op) => [op.path, (op as { from?: string }).from].map(topKey));
  if (keys.some((key, index) => key === null && index % 2 === 0)) return structuredClone(state);
  const copy: ThreadState = { ...state };
  for (const key of new Set(keys)) {
    if (key !== null && key in copy) copy[key] = structuredClone(copy[key]);
  }
  return copy;
}

/**
 * Derive a thread's latest state from its event log: the last
 * `STATE_SNAPSHOT`, with every `STATE_DELTA` after it applied. Returns `null`
 * when the thread never emitted state.
 *
 * @param events - A thread's event log, in order.
 * @returns The latest state, or `null` when there is none.
 *
 * @example
 * ```ts
 * import { deriveState } from "@pgege/kaboo-runtime";
 * import type { BaseEvent } from "@ag-ui/client";
 *
 * declare const events: BaseEvent[];
 * const state = deriveState(events); // Record<string, unknown> | null
 * ```
 */
export function deriveState(events: BaseEvent[]): ThreadState | null {
  let start = -1;
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].type === EventType.STATE_SNAPSHOT) {
      start = i;
      break;
    }
  }
  let state: ThreadState | null = null;
  if (start >= 0) {
    const snapshot = (events[start] as { snapshot?: unknown }).snapshot;
    state = snapshot && typeof snapshot === "object" && !Array.isArray(snapshot) ? (snapshot as ThreadState) : null;
  }
  for (let i = start + 1; i < events.length; i++) {
    if (events[i].type === EventType.STATE_DELTA) {
      state = applyStateDelta(state, (events[i] as { delta?: unknown }).delta);
    }
  }
  return state;
}
