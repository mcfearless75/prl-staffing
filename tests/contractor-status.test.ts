import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  activateContractorForAssignment,
  activateContractorIfInactive,
  deactivateContractorIfNoLiveWork,
  deactivateContractorsWithNoLiveWork,
  type ContractorStatusDb,
} from "@/lib/contractor-status";
import { ASSIGNMENT_STATUSES } from "@/lib/assignment-statuses";

/**
 * The activate/deactivate rules, exercised against an in-memory double.
 *
 * The double implements the small slice of Prisma these functions use, with the
 * same semantics: `updateMany` only touches rows matching BOTH id and status,
 * which is precisely how "On Hold" and "Left" are protected from automation.
 * Testing through it means the protection is verified by behaviour rather than
 * by re-stating the where clause.
 */

type ContractorRow = { id: string; status: string };
type AssignmentRow = { contractorId: string; status: string };

function fakeDb(contractors: ContractorRow[], assignments: AssignmentRow[] = []) {
  const rows = contractors.map((c) => ({ ...c }));
  let updateManyCalls = 0;

  const db: ContractorStatusDb = {
    contractor: {
      updateMany({ where, data }) {
        updateManyCalls++;
        let count = 0;
        for (const row of rows) {
          if (row.id === where.id && row.status === where.status) {
            row.status = data.status;
            count++;
          }
        }
        return Promise.resolve({ count });
      },
      findUnique({ where }) {
        const row = rows.find((r) => r.id === where.id);
        return Promise.resolve(row ? { status: row.status } : null);
      },
    },
    assignment: {
      count({ where }) {
        return Promise.resolve(
          assignments.filter(
            (a) => a.contractorId === where.contractorId && where.status.in.includes(a.status)
          ).length
        );
      },
    },
  };

  return {
    db,
    statusOf: (id: string) => rows.find((r) => r.id === id)?.status,
    updateManyCalls: () => updateManyCalls,
  };
}

describe("the in-memory double itself", () => {
  test("only updates rows matching both id and status", async () => {
    const { db, statusOf } = fakeDb([{ id: "a", status: "On Hold" }]);
    const result = await db.contractor.updateMany({
      where: { id: "a", status: "Active" },
      data: { status: "Inactive" },
    });
    assert.equal(result.count, 0);
    assert.equal(statusOf("a"), "On Hold");
  });
});

describe("deactivateContractorIfNoLiveWork", () => {
  test("moves an Active contractor with no live work to Inactive", async () => {
    const { db, statusOf } = fakeDb([{ id: "a", status: "Active" }], []);
    await deactivateContractorIfNoLiveWork("a", db);
    assert.equal(statusOf("a"), "Inactive");
  });

  test('never touches "On Hold", even with no live work at all', async () => {
    // On Hold means "keep them, but they are not available right now".
    // Automation must not overwrite that.
    const { db, statusOf } = fakeDb([{ id: "a", status: "On Hold" }], []);
    await deactivateContractorIfNoLiveWork("a", db);
    assert.equal(statusOf("a"), "On Hold");
  });

  test('never touches "Left"', async () => {
    const { db, statusOf } = fakeDb([{ id: "a", status: "Left" }], []);
    await deactivateContractorIfNoLiveWork("a", db);
    assert.equal(statusOf("a"), "Left");
  });

  test("leaves New and Suspended alone", async () => {
    const { db, statusOf } = fakeDb(
      [
        { id: "n", status: "New" },
        { id: "s", status: "Suspended" },
      ],
      []
    );
    await deactivateContractorIfNoLiveWork("n", db);
    await deactivateContractorIfNoLiveWork("s", db);
    assert.equal(statusOf("n"), "New");
    assert.equal(statusOf("s"), "Suspended");
  });

  test("keeps someone Active while ANY live status remains", async () => {
    // The original bug: the "still working?" test counted only {Placed, Active}
    // while every headcount counted Ending too, so a contractor winding down
    // was marked Inactive and simultaneously counted in the assigned workforce.
    for (const status of ASSIGNMENT_STATUSES.filter((s) => s !== "Completed")) {
      const { db, statusOf } = fakeDb(
        [{ id: "a", status: "Active" }],
        [{ contractorId: "a", status }]
      );
      await deactivateContractorIfNoLiveWork("a", db);
      assert.equal(statusOf("a"), "Active", `should stay Active while on "${status}"`);
    }
  });

  test("deactivates once the last assignment is Completed", async () => {
    const { db, statusOf } = fakeDb(
      [{ id: "a", status: "Active" }],
      [{ contractorId: "a", status: "Completed" }]
    );
    await deactivateContractorIfNoLiveWork("a", db);
    assert.equal(statusOf("a"), "Inactive");
  });

  test("does not deactivate someone placed with a second client", async () => {
    const { db, statusOf } = fakeDb(
      [{ id: "a", status: "Active" }],
      [
        { contractorId: "a", status: "Completed" },
        { contractorId: "a", status: "Active" },
      ]
    );
    await deactivateContractorIfNoLiveWork("a", db);
    assert.equal(statusOf("a"), "Active");
  });

  test("ignores other contractors' live work", async () => {
    const { db, statusOf } = fakeDb(
      [{ id: "a", status: "Active" }],
      [{ contractorId: "b", status: "Active" }]
    );
    await deactivateContractorIfNoLiveWork("a", db);
    assert.equal(statusOf("a"), "Inactive");
  });

  test("skips the write entirely when live work remains", async () => {
    const { db, updateManyCalls } = fakeDb(
      [{ id: "a", status: "Active" }],
      [{ contractorId: "a", status: "Ending" }]
    );
    await deactivateContractorIfNoLiveWork("a", db);
    assert.equal(updateManyCalls(), 0);
  });
});

describe("activateContractorIfInactive", () => {
  test("moves Inactive to Active", async () => {
    const { db, statusOf } = fakeDb([{ id: "a", status: "Inactive" }]);
    await activateContractorIfInactive("a", db);
    assert.equal(statusOf("a"), "Active");
  });

  test('does not rescue "Left" — that contradiction is for staff to resolve', async () => {
    const { db, statusOf } = fakeDb([{ id: "a", status: "Left" }]);
    await activateContractorIfInactive("a", db);
    assert.equal(statusOf("a"), "Left");
  });

  test('does not override "On Hold"', async () => {
    const { db, statusOf } = fakeDb([{ id: "a", status: "On Hold" }]);
    await activateContractorIfInactive("a", db);
    assert.equal(statusOf("a"), "On Hold");
  });

  test("leaves an already-Active contractor untouched", async () => {
    const { db, statusOf } = fakeDb([{ id: "a", status: "Active" }]);
    await activateContractorIfInactive("a", db);
    assert.equal(statusOf("a"), "Active");
  });
});

describe("activateContractorForAssignment", () => {
  test("activates for every live assignment status", async () => {
    // Gated on the LIVE set, not the compliance-gated set. Saving an assignment
    // as "Ending" still means the contractor is on site; gating on the narrower
    // set left such a contractor Inactive while working, and so excluded from
    // every compliance denominator.
    for (const status of ASSIGNMENT_STATUSES.filter((s) => s !== "Completed")) {
      const { db, statusOf } = fakeDb([{ id: "a", status: "Inactive" }]);
      await activateContractorForAssignment("a", status, db);
      assert.equal(statusOf("a"), "Active", `saving as "${status}" should activate`);
    }
  });

  test("does nothing for a Completed assignment", async () => {
    const { db, statusOf } = fakeDb([{ id: "a", status: "Inactive" }]);
    await activateContractorForAssignment("a", "Completed", db);
    assert.equal(statusOf("a"), "Inactive");
  });

  test("does nothing for an unrecognised status", async () => {
    const { db, statusOf, updateManyCalls } = fakeDb([{ id: "a", status: "Inactive" }]);
    await activateContractorForAssignment("a", "Nonsense", db);
    assert.equal(statusOf("a"), "Inactive");
    assert.equal(updateManyCalls(), 0);
  });

  test("still refuses to overturn Left, whatever the assignment status", async () => {
    const { db, statusOf } = fakeDb([{ id: "a", status: "Left" }]);
    await activateContractorForAssignment("a", "Active", db);
    assert.equal(statusOf("a"), "Left");
  });
});

describe("deactivateContractorsWithNoLiveWork", () => {
  test("counts only the contractors whose status actually changed", async () => {
    const { db } = fakeDb(
      [
        { id: "a", status: "Active" }, // no work -> changes
        { id: "b", status: "Active" }, // still working -> unchanged
        { id: "c", status: "On Hold" }, // protected -> unchanged
      ],
      [{ contractorId: "b", status: "Active" }]
    );
    const changed = await deactivateContractorsWithNoLiveWork(["a", "b", "c"], db);
    assert.equal(changed, 1);
  });

  test("de-duplicates repeated ids so one person is counted once", async () => {
    const { db, statusOf } = fakeDb([{ id: "a", status: "Active" }], []);
    const changed = await deactivateContractorsWithNoLiveWork(["a", "a", "a"], db);
    assert.equal(changed, 1);
    assert.equal(statusOf("a"), "Inactive");
  });

  test("returns 0 for an empty list", async () => {
    const { db } = fakeDb([{ id: "a", status: "Active" }]);
    assert.equal(await deactivateContractorsWithNoLiveWork([], db), 0);
  });

  test("tolerates ids that no longer exist", async () => {
    const { db } = fakeDb([{ id: "a", status: "Active" }]);
    assert.equal(await deactivateContractorsWithNoLiveWork(["ghost"], db), 0);
  });
});
