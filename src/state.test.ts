import { describe, it, expect } from "vitest";
import { EventType, type BaseEvent } from "@ag-ui/client";
import { deriveState } from "./state";

const snap = (snapshot: unknown): BaseEvent =>
  ({ type: EventType.STATE_SNAPSHOT, snapshot }) as unknown as BaseEvent;
const other = (): BaseEvent => ({ type: EventType.RUN_STARTED }) as BaseEvent;

describe("deriveState", () => {
  it("returns the snapshot of the last STATE_SNAPSHOT", () => {
    expect(deriveState([snap({ a: 1 }), other(), snap({ a: 2 })])).toEqual({ a: 2 });
  });

  it("ignores earlier snapshots", () => {
    expect(deriveState([snap({ a: 1 }), snap({ b: 2 })])).toEqual({ b: 2 });
  });

  it("returns null when there is no snapshot", () => {
    expect(deriveState([other(), other()])).toBeNull();
  });

  it("returns null when the last snapshot is a non-object", () => {
    expect(deriveState([snap({ a: 1 }), snap("nope")])).toBeNull();
  });

  it("returns null for an empty log", () => {
    expect(deriveState([])).toBeNull();
  });
});
