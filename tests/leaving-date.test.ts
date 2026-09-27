import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { leavingDateDecision, parseLeavingDate } from "@/lib/leaving-date";

/**
 * "Add end date on profile and it automatically makes them inactive" (PRL,
 * 2026-09-27). The rule must never fight the assignment automation: someone
 * with live work is left alone, or tomorrow's run would undo today's placement.
 */

const NOW = new Date("2026-09-27T10:00:00Z");
const base = { status: "Active", hasLiveWork: false };

describe("leavingDateDecision", () => {
  test("no leaving date: nothing happens", () => {
    assert.equal(leavingDateDecision({ ...base, leavingDate: null }, NOW), "none");
  });

  test("a date in the future: not yet", () => {
    assert.equal(leavingDateDecision({ ...base, leavingDate: new Date("2026-09-28") }, NOW), "none");
  });

  test("today or earlier: deactivate", () => {
    assert.equal(leavingDateDecision({ ...base, leavingDate: new Date("2026-09-27") }, NOW), "deactivate");
    assert.equal(leavingDateDecision({ ...base, leavingDate: new Date("2026-01-01") }, NOW), "deactivate");
  });

  test("still on live work: held back, never deactivated", () => {
    assert.equal(
      leavingDateDecision({ ...base, hasLiveWork: true, leavingDate: new Date("2026-09-01") }, NOW),
      "blocked-live-work"
    );
  });

  test("only ever moves Active — applicants and the already-Inactive are untouched", () => {
    const past = new Date("2026-09-01");
    for (const status of ["Inactive", "Applied", "Looking"]) {
      assert.equal(leavingDateDecision({ ...base, status, leavingDate: past }, NOW), "none", status);
    }
  });
});

describe("parseLeavingDate", () => {
  test("a date input value becomes UTC midnight", () => {
    assert.equal(parseLeavingDate("2026-10-31")?.toISOString(), "2026-10-31T00:00:00.000Z");
  });

  test("blank or junk clears it", () => {
    assert.equal(parseLeavingDate(""), null);
    assert.equal(parseLeavingDate(null), null);
    assert.equal(parseLeavingDate("31/10/2026"), null);
    assert.equal(parseLeavingDate("2026-13-45"), null);
  });
});
