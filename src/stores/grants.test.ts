import { describe, it, expect, afterAll } from "vitest";
import type { GrantStore, NewToolGrant } from "../approvals";
import { InMemoryGrantStore } from "./memory-grants";
import { PostgresGrantStore } from "./postgres-grants";

const grant = (extra: Partial<NewToolGrant> = {}): NewToolGrant => ({
  ownerId: "ann",
  agentId: "merchant",
  threadId: "t1",
  tool: "submit_report",
  subject: "submit_report",
  label: "Submit report",
  ...extra,
});

function contract(name: string, make: () => GrantStore, owner: () => string) {
  describe(name, () => {
    it("lists a thread's grants and the owner's always grants for a run", async () => {
      const store = make();
      const ownerId = owner();
      await store.save(grant({ ownerId, threadId: "t1" }));
      await store.save(grant({ ownerId, threadId: null, tool: "publish" }));
      await store.save(grant({ ownerId, threadId: "t2", tool: "archive" }));
      await store.save(grant({ ownerId, agentId: "shopper", threadId: null, tool: "checkout" }));

      const tools = (await store.list({ ownerId, agentId: "merchant", threadId: "t1" }))
        .map((g) => g.tool)
        .sort();

      expect(tools).toEqual(["publish", "submit_report"]);
    });

    it("replaces an identical grant instead of duplicating it", async () => {
      const store = make();
      const ownerId = owner();
      await store.save(grant({ ownerId, threadId: null }));
      await store.save(grant({ ownerId, threadId: null, label: "Submit reports" }));

      const held = await store.listForOwner(ownerId);
      expect(held).toHaveLength(1);
      expect(held[0].label).toBe("Submit reports");
    });

    it("revokes only the owner's own grant", async () => {
      const store = make();
      const ownerId = owner();
      const saved = await store.save(grant({ ownerId }));

      await store.revoke("someone-else", saved.id);
      expect(await store.listForOwner(ownerId)).toHaveLength(1);

      await store.revoke(ownerId, saved.id);
      expect(await store.listForOwner(ownerId)).toHaveLength(0);
    });
  });
}

contract("InMemoryGrantStore", () => new InMemoryGrantStore(), () => "ann");

describe("PostgresGrantStore (no DB required)", () => {
  it("throws when neither dsn nor pool is provided", () => {
    expect(() => new PostgresGrantStore({})).toThrow(/dsn.*pool/i);
  });
});

const dsn = process.env.DATABASE_URL;
const owners: string[] = [];

describe.skipIf(!dsn)("PostgresGrantStore (DATABASE_URL)", () => {
  const store = dsn ? new PostgresGrantStore({ dsn }) : null;
  contract(
    "contract",
    () => store!,
    () => {
      const ownerId = `test-${Date.now()}-${owners.length}`;
      owners.push(ownerId);
      return ownerId;
    },
  );

  afterAll(async () => {
    for (const ownerId of owners) {
      for (const g of await store!.listForOwner(ownerId)) await store!.revoke(ownerId, g.id);
    }
  });
});
