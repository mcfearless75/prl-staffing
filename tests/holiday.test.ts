import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { HOLIDAY_ACCRUAL_RATE, isPayeContractor } from "@/lib/holiday";
import { EMPLOYMENT_TYPES } from "@/app/(dashboard)/rates/constants";

/**
 * The PAYE gate on holiday accrual.
 *
 * Holiday is accrued by PAYE contractors only. This one predicate guards the
 * staff holiday page, the contractor portal's holiday page, and both payment
 * actions — so a false positive hands statutory holiday pay to someone who is
 * not entitled to it, and a false negative silently withholds it from someone
 * who is. It is a strict equality against a free-text column, which is exactly
 * the kind of thing that breaks when a new employment type is added.
 */

describe("isPayeContractor", () => {
  test("PAYE accrues", () => {
    assert.equal(isPayeContractor("PAYE"), true);
  });

  test("the other employment types PRL actually offers do not", () => {
    // Ground truth: the values in the employment-type dropdown.
    const nonPaye = EMPLOYMENT_TYPES.filter((t) => t !== "PAYE");
    assert.ok(nonPaye.length > 0, "expected employment types other than PAYE");
    for (const type of nonPaye) {
      assert.equal(isPayeContractor(type), false, type);
    }
  });

  test("exactly one of the offered employment types accrues holiday", () => {
    // If a second PAYE-like type is ever added to the dropdown, this fails and
    // forces the accrual rule to be revisited rather than silently excluding it.
    const accruing = EMPLOYMENT_TYPES.filter(isPayeContractor);
    assert.deepEqual(accruing, ["PAYE"]);
  });

  test("an unset employment type does not accrue", () => {
    // The column is nullable. Absent entitlement is not entitlement.
    for (const value of [null, undefined, ""]) {
      assert.equal(isPayeContractor(value), false, JSON.stringify(value));
    }
  });

  test("DOCUMENTED: the match is exact — case and whitespace both defeat it", () => {
    // A contractor stored as "paye" or " PAYE " accrues nothing. Pinned so the
    // sharp edge is visible; if imported data ever arrives in another casing,
    // the fix belongs at the import boundary or here, deliberately.
    for (const value of ["paye", "Paye", " PAYE", "PAYE ", "PAYE (weekly)"]) {
      assert.equal(isPayeContractor(value), false, JSON.stringify(value));
    }
  });
});

describe("the accrual rate", () => {
  test("is the statutory 12.07%", () => {
    // 5.6 weeks statutory leave / (52 - 5.6) working weeks = 0.1207.
    assert.equal(HOLIDAY_ACCRUAL_RATE, 0.1207);
    assert.equal(Math.round((5.6 / (52 - 5.6)) * 10000) / 10000, HOLIDAY_ACCRUAL_RATE);
  });
});
