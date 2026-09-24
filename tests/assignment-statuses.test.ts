import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  ASSIGNMENT_STATUSES,
  ASSIGNMENT_STATUS_DESCRIPTIONS,
  COMPLIANCE_GATED_STATUSES,
  IN_PROGRESS_ASSIGNMENT_STATUSES,
  LIVE_ASSIGNMENT_STATUSES,
  isLiveAssignmentStatus,
  isEndingSoon,
  ENDING_SOON_DAYS,
} from "@/lib/assignment-statuses";

/**
 * "Which assignment statuses mean the contractor is still working?" was once
 * answered differently in ten files. These assertions pin the answer.
 *
 * They are deliberately written as properties of the vocabulary rather than a
 * copy of it, so that adding a legitimate new status does not fail the suite
 * for no reason — but dropping one out of the live set, or letting the subsets
 * drift apart, does.
 */

const live: readonly string[] = LIVE_ASSIGNMENT_STATUSES;
const all: readonly string[] = ASSIGNMENT_STATUSES;
const inProgress: readonly string[] = IN_PROGRESS_ASSIGNMENT_STATUSES;

describe("LIVE_ASSIGNMENT_STATUSES", () => {
  test("counts Ending as live work", () => {
    // 31 contractors on Ending assignments could not submit a timesheet because
    // eight portal filters used the pair ["Active","Placed"] instead of this set.
    assert.ok(live.includes("Ending"));
  });

  test("counts Holiday as live work", () => {
    // Holiday cover is someone on site for a short period: same duty of care,
    // same compliance risk, so the same denominator.
    assert.ok(live.includes("Holiday"));
  });

  test("counts Placed and Active as live work", () => {
    assert.ok(live.includes("Placed"));
    assert.ok(live.includes("Active"));
  });

  test("treats Completed as the ONLY status that is not live", () => {
    const notLive = all.filter((s) => !live.includes(s));
    assert.deepEqual(notLive, ["Completed"]);
  });

  test("is a subset of the full vocabulary", () => {
    for (const status of live) {
      assert.ok(all.includes(status), `"${status}" is live but not a valid status`);
    }
  });

  test("contains no duplicates", () => {
    assert.equal(new Set(live).size, live.length);
  });
});

describe("isLiveAssignmentStatus", () => {
  test("agrees with the constant for every valid status", () => {
    for (const status of all) {
      assert.equal(isLiveAssignmentStatus(status), live.includes(status), status);
    }
  });

  test("rejects unknown and empty input rather than throwing", () => {
    assert.equal(isLiveAssignmentStatus("Nonsense"), false);
    assert.equal(isLiveAssignmentStatus(""), false);
  });

  test("is case sensitive, matching how statuses are stored", () => {
    assert.equal(isLiveAssignmentStatus("active"), false);
  });
});

describe("IN_PROGRESS_ASSIGNMENT_STATUSES", () => {
  test("is exactly the live set minus Placed", () => {
    // A different question from "is this live?": these queries ask about work
    // running against an end date, and Placed work has not begun.
    assert.deepEqual([...inProgress].sort(), live.filter((s) => s !== "Placed").sort());
  });

  test("keeps Holiday, which is exactly the kind of work that overruns", () => {
    assert.ok(inProgress.includes("Holiday"));
  });

  test("is a subset of the live set", () => {
    for (const status of inProgress) {
      assert.ok(live.includes(status), `"${status}" is in progress but not live`);
    }
  });
});

describe("COMPLIANCE_GATED_STATUSES", () => {
  test("gates the statuses that put someone new onto a site", () => {
    assert.ok(COMPLIANCE_GATED_STATUSES.has("Placed"));
    assert.ok(COMPLIANCE_GATED_STATUSES.has("Active"));
    assert.ok(COMPLIANCE_GATED_STATUSES.has("Holiday"));
  });

  test("does NOT gate Ending", () => {
    // That work was checked when it started; gating a wind-down strands the
    // assignment with no way to save it.
    assert.equal(COMPLIANCE_GATED_STATUSES.has("Ending"), false);
  });

  test("does not gate Completed", () => {
    assert.equal(COMPLIANCE_GATED_STATUSES.has("Completed"), false);
  });

  test("is a subset of the live set", () => {
    for (const status of COMPLIANCE_GATED_STATUSES) {
      assert.ok(live.includes(status), `"${status}" is gated but not live`);
    }
  });
});

describe("ASSIGNMENT_STATUS_DESCRIPTIONS", () => {
  test("describes every status exactly once, and nothing else", () => {
    // The help text sits next to the pickers; a status with no description
    // renders a blank hint, and a description for a removed status is a lie.
    assert.deepEqual(Object.keys(ASSIGNMENT_STATUS_DESCRIPTIONS).sort(), [...all].sort());
  });

  test("has no empty descriptions", () => {
    for (const [status, text] of Object.entries(ASSIGNMENT_STATUS_DESCRIPTIONS)) {
      assert.ok(text.trim().length > 0, `"${status}" has an empty description`);
    }
  });
});

describe("isEndingSoon", () => {
  const now = new Date("2026-09-24T15:30:00Z");
  const inDays = (n: number) => new Date(Date.UTC(2026, 8, 24 + n));

  test("no end date is never ending soon", () => {
    assert.equal(isEndingSoon(null, now), false);
    assert.equal(isEndingSoon(undefined, now), false);
  });

  test("the window is inclusive of its last day and excludes the day after", () => {
    assert.equal(isEndingSoon(inDays(ENDING_SOON_DAYS), now), true);
    assert.equal(isEndingSoon(inDays(ENDING_SOON_DAYS + 1), now), false);
  });

  test("today, and an end date already passed, both count", () => {
    assert.equal(isEndingSoon(inDays(0), now), true);
    assert.equal(isEndingSoon(inDays(-30), now), true);
  });

  test("time of day does not move the boundary", () => {
    const lateNow = new Date("2026-09-24T23:59:00Z");
    const early = new Date("2026-09-24T00:01:00Z");
    assert.equal(
      isEndingSoon(inDays(ENDING_SOON_DAYS), lateNow),
      isEndingSoon(inDays(ENDING_SOON_DAYS), early)
    );
  });

  test("accepts ISO strings as they arrive from a server component", () => {
    assert.equal(isEndingSoon(inDays(3).toISOString(), now), true);
  });
});
