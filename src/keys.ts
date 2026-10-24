import { EventType, type BaseEvent } from "@ag-ui/client";
import type { ThreadState } from "./state";

/**
 * Who owns each top-level key of a thread's shared state.
 *
 * - `hidden` keys belong to the server and never reach the browser: the
 *   agents' sessions, which are large and must not be forged.
 * - `server` keys belong to the server and reach the browser read-only: the
 *   browser sees them, but a copy it sends back is ignored. The workspace the
 *   agents maintain is one.
 * - Every other key belongs to the browser and travels with each run.
 *
 * A host vouches for a server key through {@link KabooRunnerOptions.enrich}.
 */
export interface KabooStateKeys {
  /** Server keys the browser never sees. */
  hidden?: readonly string[];
  /** Server keys the browser sees but cannot write. */
  server?: readonly string[];
}

/** The keys kaboo-workflows keeps: its sessions hidden, its workspace visible. */
export const DEFAULT_STATE_KEYS: Required<KabooStateKeys> = {
  hidden: ["kaboo_sessions"],
  server: ["kaboo_workspace"],
};

interface PatchOperation {
  op: string;
  path: string;
  from?: string;
  value?: unknown;
}

function isRecord(value: unknown): value is ThreadState {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function topKey(pointer: string | undefined): string | null {
  if (!pointer) return null;
  const segment = pointer.split("/")[1];
  return segment === undefined ? null : segment.replaceAll("~1", "/").replaceAll("~0", "~");
}

/** Applies a {@link KabooStateKeys} split to the state a run starts with and to what the browser sees. */
export class StateOwnership {
  private readonly hidden: ReadonlySet<string>;
  private readonly server: ReadonlySet<string>;

  constructor(keys: KabooStateKeys = DEFAULT_STATE_KEYS) {
    this.hidden = new Set(keys.hidden ?? []);
    this.server = new Set([...(keys.hidden ?? []), ...(keys.server ?? [])]);
  }

  /**
   * The state a run starts with: the browser's keys from the client (the
   * stored value when the client sent none), the server's keys from the store
   * only, then whatever the host set for this run.
   */
  merge(persisted: ThreadState | null, client: unknown, host: ThreadState = {}): ThreadState {
    const merged: ThreadState = {};
    for (const [key, value] of Object.entries(persisted ?? {})) merged[key] = value;
    if (isRecord(client)) {
      for (const [key, value] of Object.entries(client)) {
        if (!this.server.has(key)) merged[key] = value;
      }
    }
    return { ...merged, ...host };
  }

  /** Strip the hidden keys from a state value. */
  visibleState(state: ThreadState | null): ThreadState | null {
    if (!state || this.hidden.size === 0) return state;
    if (!Object.keys(state).some((key) => this.hidden.has(key))) return state;
    return Object.fromEntries(Object.entries(state).filter(([key]) => !this.hidden.has(key)));
  }

  /**
   * The copy of an event the browser may see, or `null` when none of it is
   * visible. Only state events can carry hidden keys.
   */
  visible(event: BaseEvent): BaseEvent | null {
    if (this.hidden.size === 0) return event;
    if (event.type === EventType.STATE_SNAPSHOT) {
      const snapshot = (event as { snapshot?: unknown }).snapshot;
      if (!isRecord(snapshot)) return event;
      const visible = this.visibleState(snapshot);
      return visible === snapshot ? event : ({ ...event, snapshot: visible } as BaseEvent);
    }
    if (event.type === EventType.STATE_DELTA) {
      const delta = (event as { delta?: unknown }).delta;
      if (!Array.isArray(delta)) return event;
      const kept = (delta as PatchOperation[]).flatMap((operation) => this.visibleOperation(operation));
      if (kept.length === delta.length && kept.every((operation, index) => operation === delta[index])) return event;
      return kept.length > 0 ? ({ ...event, delta: kept } as BaseEvent) : null;
    }
    return event;
  }

  private visibleOperation(operation: PatchOperation): PatchOperation[] {
    if (operation.path === "" && isRecord(operation.value)) {
      return [{ ...operation, value: this.visibleState(operation.value) }];
    }
    const key = topKey(operation.path);
    const from = topKey(operation.from);
    if ((key !== null && this.hidden.has(key)) || (from !== null && this.hidden.has(from))) return [];
    return [operation];
  }
}
