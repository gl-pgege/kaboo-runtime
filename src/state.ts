import { EventType, type BaseEvent } from "@ag-ui/client";

/**
 * Derive the latest agent state from an event log by scanning backwards for the
 * last `STATE_SNAPSHOT`. Returns `null` when the thread never emitted one.
 *
 * kaboo-workflows folds each turn's `kaboo_history` into its trailing
 * `STATE_SNAPSHOT`, so this is the authoritative per-thread state/history.
 *
 * @param events - A thread's event log, in order.
 * @returns The last snapshot object, or `null` when there is none.
 *
 * @example
 * ```ts
 * import { deriveState } from "kaboo-runtime";
 * import type { BaseEvent } from "@ag-ui/client";
 *
 * declare const events: BaseEvent[];
 * const state = deriveState(events); // Record<string, unknown> | null
 * ```
 */
export function deriveState(events: BaseEvent[]): Record<string, unknown> | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i];
    if (event.type === EventType.STATE_SNAPSHOT) {
      const snapshot = (event as { snapshot?: unknown }).snapshot;
      if (snapshot && typeof snapshot === "object") {
        return snapshot as Record<string, unknown>;
      }
      return null;
    }
  }
  return null;
}
