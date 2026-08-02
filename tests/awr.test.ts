import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  AWR_MAX_GAP_WEEKS,
  AWR_TRIGGER_WEEKS,
  filterAwrByBasis,
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
