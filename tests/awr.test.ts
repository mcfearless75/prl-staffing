import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  AWR_MAX_GAP_WEEKS,
  AWR_TRIGGER_WEEKS,
  filterAwrByBasis,
  runClock,
  type AwrBasis,
  type AwrClockResult,
} from "@/lib/awr";

/**
 * The AWR report filters.
 *
 * Agency Workers Regulations equal-treatment rights begin only once the 12-week
 * qualifying clock has been reached. "Below comparable" is therefore a report of
 * people PRL is underpaying against their comparator RIGHT NOW — it must never
 * include someone still counting up, whose pay is not yet compared to anything.
 * Widening that filter would overstate the liability; narrowing "reached" would
 * hide it. These are the exports the /awr tabs and the CSV endpoint both use.
 */

function clock(overrides: Partial<AwrClockResult> = {}): AwrClockResult {
  return {
    contractorId: "c1",
    contractorName: "A Worker",
    contractorRef: "PRL-001",
    companyId: "co1",
    companyName: "A Company",
    qualifyingWeeks: 0,
    triggerReached: false,
    triggerDate: null,
    projectedTriggerDate: null,
    comparatorBelow: false,
    comparatorRate: null,
    currentPayRate: null,
    status: "Not started",
    ...overrides,
  };
}

/** The four states a pair can be in, across the two axes the filters read. */
const triggeredBelow = clock({
  contractorId: "triggered-below",
  qualifyingWeeks: AWR_TRIGGER_WEEKS,
  triggerReached: true,
  comparatorBelow: true,
  currentPayRate: 18,
  comparatorRate: 21,
  status: "Triggered",
});
const triggeredPaidFairly = clock({
  contractorId: "triggered-fair",
  qualifyingWeeks: AWR_TRIGGER_WEEKS,
  triggerReached: true,
  comparatorBelow: false,
  currentPayRate: 22,
  comparatorRate: 21,
  status: "Triggered",
});
const countingUpBelow = clock({
  contractorId: "counting-below",
  qualifyingWeeks: 7,
  triggerReached: false,
  comparatorBelow: true,
  currentPayRate: 18,
  comparatorRate: 21,
  status: "In progress",
});
const notStarted = clock({ contractorId: "not-started", qualifyingWeeks: 0 });

const ALL = [triggeredBelow, triggeredPaidFairly, countingUpBelow, notStarted];

const ids = (rows: AwrClockResult[]) => rows.map((r) => r.contractorId);

describe("filterAwrByBasis", () => {
  test("'reached' is everyone past the 12-week clock, however they are paid", () => {
    assert.deepEqual(ids(filterAwrByBasis(ALL, "reached")), ["triggered-below", "triggered-fair"]);
  });

  test("'below-comparable' is the underpaid subset of those who have qualified", () => {
    assert.deepEqual(ids(filterAwrByBasis(ALL, "below-comparable")), ["triggered-below"]);
  });

  test("someone below their comparator but NOT yet qualified is excluded", () => {
    // The load-bearing case. Equal-treatment rights have not begun for them, so
    // reporting them as below-comparable overstates PRL's exposure. Dropping
    // the triggerReached half of that filter is what this pins down.
    const filtered = filterAwrByBasis(ALL, "below-comparable");
    assert.ok(!ids(filtered).includes("counting-below"));
    assert.ok(ids(filterAwrByBasis(ALL, "future")).includes("counting-below"));
  });

  test("'future' is everyone who has not qualified, started or not", () => {
    assert.deepEqual(ids(filterAwrByBasis(ALL, "future")), ["counting-below", "not-started"]);
  });
});

describe("the filters as a set", () => {
  test("below-comparable is always a subset of reached", () => {
    const reached = new Set(ids(filterAwrByBasis(ALL, "reached")));
    for (const id of ids(filterAwrByBasis(ALL, "below-comparable"))) {
      assert.ok(reached.has(id), `${id} is below-comparable but not reached`);
    }
  });

  test("reached and future partition the whole list — nobody is lost or double-counted", () => {
    const reached = ids(filterAwrByBasis(ALL, "reached"));
    const future = ids(filterAwrByBasis(ALL, "future"));
    assert.equal(reached.length + future.length, ALL.length);
    assert.equal(new Set([...reached, ...future]).size, ALL.length);
  });

  test("an empty input gives an empty result for every basis", () => {
    for (const basis of ["reached", "below-comparable", "future"] as AwrBasis[]) {
      assert.deepEqual(filterAwrByBasis([], basis), [], basis);
    }
  });

  test("preserves the incoming order, which is the report's ranking", () => {
    // computeAwrClocks sorts triggered-first then by weeks desc; the tabs and
    // the CSV both rely on the filter not reshuffling that.
    const reversed = [...ALL].reverse();
    assert.deepEqual(ids(filterAwrByBasis(reversed, "reached")), ["triggered-fair", "triggered-below"]);
  });

  test("does not mutate the list it was given", () => {
    const input = [...ALL];
    filterAwrByBasis(input, "reached");
    filterAwrByBasis(input, "below-comparable");
    assert.deepEqual(ids(input), ids(ALL));
  });

  test("an unrecognised basis returns everything rather than nothing", () => {
    // Only reachable if a caller skips validation — the CSV route rejects a bad
    // basis with a 400 and the page falls back to an "all" tab. Returning the
    // full list is the safe direction: an over-inclusive report is visibly
    // wrong, an empty one reads as "no AWR exposure".
    assert.deepEqual(ids(filterAwrByBasis(ALL, "everyone" as AwrBasis)), ids(ALL));
  });
});

/**
 * The 12-week qualifying clock itself.
 *
 * This decides the single most consequential fact in the AWR report: whether a
 * contractor has earned equal-treatment rights. Overcounting creates a pay
 * liability that isn't owed; undercounting misses one that is. The pause/reset
 * rule is the subtle part — a break of six weeks or less holds the running
 * total, a longer one destroys it.
 *
 * Weeks are built as real local Monday midnights, the way production's
 * startOfDay() produces them, so the arithmetic is exercised against the actual
 * calendar rather than against tidy multiples of 7 x 24h.
 */

const DAY = 24 * 60 * 60 * 1000;

/** Monday midnights at the given week offsets from a real starting Monday. */
function mondays(year: number, month: number, day: number, weekOffsets: number[]): number[] {
  return weekOffsets
    .map((offset) => {
      const d = new Date(year, month - 1, day + offset * 7);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })
    .sort((a, b) => a - b);
}

/** Week offsets 0..n-1 — an unbroken run of n worked weeks. */
const unbroken = (n: number) => Array.from({ length: n }, (_, i) => i);

describe("runClock — the 12-week qualifying clock", () => {
  test("no qualifying weeks is a clock that never started", () => {
    assert.deepEqual(runClock([]), { count: 0, triggerDate: null, lastWeek: null });
  });

  test("one worked week counts as one and triggers nothing", () => {
    const weeks = mondays(2026, 5, 4, [0]);
    const result = runClock(weeks);
    assert.equal(result.count, 1);
    assert.equal(result.triggerDate, null);
    assert.equal(result.lastWeek, weeks[0]);
  });

  test("eleven unbroken weeks do not trigger", () => {
    // The off-by-one that would hand out equal treatment a week early.
    const result = runClock(mondays(2026, 5, 4, unbroken(11)));
    assert.equal(result.count, 11);
    assert.equal(result.triggerDate, null);
  });

  test("twelve unbroken weeks trigger", () => {
    const result = runClock(mondays(2026, 5, 4, unbroken(12)));
    assert.equal(result.count, 12);
    assert.ok(result.triggerDate);
  });

  test("the trigger date is the END of the twelfth week, not its start", () => {
    // Rights begin once the qualifying week is COMPLETED. Starting from Monday
    // 4 May 2026, the twelfth qualifying week starts Monday 20 July and the
    // clock trips on Sunday 26 July.
    const weeks = mondays(2026, 5, 4, unbroken(12));
    const { triggerDate } = runClock(weeks);
    assert.ok(triggerDate);
    assert.equal(triggerDate.getTime(), weeks[11] + 6 * DAY);
    assert.equal(triggerDate.getFullYear(), 2026);
    assert.equal(triggerDate.getMonth(), 6, "July");
    assert.equal(triggerDate.getDate(), 26);
  });

  test("a break of six weeks pauses the clock — the total survives", () => {
    // Eleven weeks, six weeks off, then one more. The missed weeks do not count
    // but nothing is lost, so the twelfth worked week still trips it.
    const result = runClock(mondays(2026, 5, 4, [...unbroken(11), 17]));
    assert.equal(result.count, 12);
    assert.ok(result.triggerDate);
  });

  test("a break of SEVEN weeks resets the clock to zero", () => {
    // One week further apart than the case above, and eleven weeks of accrued
    // qualification are gone.
    const result = runClock(mondays(2026, 5, 4, [...unbroken(11), 18]));
    assert.equal(result.count, 1);
    assert.equal(result.triggerDate, null);
  });

  test("six weeks off is the boundary — five and six pause, seven resets", () => {
    const at = (gap: number) => runClock(mondays(2026, 5, 4, [0, gap + 1])).count;
    assert.equal(at(5), 2, "5 weeks missed");
    assert.equal(at(AWR_MAX_GAP_WEEKS), 2, "6 weeks missed");
    assert.equal(at(AWR_MAX_GAP_WEEKS + 1), 1, "7 weeks missed");
  });

  test("consecutive weeks have no gap at all", () => {
    assert.equal(runClock(mondays(2026, 5, 4, [0, 1])).count, 2);
  });

  test("after a reset the clock can still reach twelve", () => {
    // Five weeks, a long break, then a full twelve.
    const result = runClock(mondays(2026, 1, 5, [...unbroken(5), ...unbroken(12).map((i) => i + 20)]));
    assert.equal(result.count, 12);
    assert.ok(result.triggerDate);
  });

  test("the trigger date is the FIRST crossing, not the last week worked", () => {
    // Someone fifteen weeks in triggered three weeks ago. Backdating equal
    // treatment to the wrong week is a real pay question.
    const weeks = mondays(2026, 5, 4, unbroken(15));
    const { triggerDate } = runClock(weeks);
    assert.ok(triggerDate);
    assert.equal(triggerDate.getTime(), weeks[11] + 6 * DAY);
  });

  test("the raw count is not capped — capping is the report's job", () => {
    const result = runClock(mondays(2026, 5, 4, unbroken(15)));
    assert.equal(result.count, 15);
    assert.equal(Math.min(result.count, AWR_TRIGGER_WEEKS), AWR_TRIGGER_WEEKS);
  });

  test("lastWeek is the final qualifying week, which the projection runs from", () => {
    const weeks = mondays(2026, 5, 4, unbroken(5));
    assert.equal(runClock(weeks).lastWeek, weeks[4]);
  });

  test("counts correctly across the spring clock change", () => {
    // Local midnights either side of 29 March 2026 are 7 days MINUS an hour
    // apart. A clock that compared raw milliseconds instead of rounding to
    // whole weeks would see a gap here and reset a qualifying run.
    const result = runClock(mondays(2026, 2, 2, unbroken(12)));
    assert.equal(result.count, 12);
    assert.ok(result.triggerDate);
  });

  test("counts correctly across the autumn clock change", () => {
    // 25 October 2026, in the other direction: 7 days PLUS an hour.
    const result = runClock(mondays(2026, 9, 7, unbroken(12)));
    assert.equal(result.count, 12);
    assert.ok(result.triggerDate);
  });
});

describe("the clock constants", () => {
  test("the trigger is 12 qualifying weeks", () => {
    // AWR s.7: the qualifying period is 12 calendar weeks.
    assert.equal(AWR_TRIGGER_WEEKS, 12);
  });

  test("a break of more than 6 weeks resets the clock", () => {
    // AWR reg. 8: breaks of 6 weeks or less pause the clock; longer resets it.
    assert.equal(AWR_MAX_GAP_WEEKS, 6);
    assert.ok(AWR_MAX_GAP_WEEKS < AWR_TRIGGER_WEEKS);
  });
});
