import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  PIPELINE_CONTRACTOR_STATUSES,
  SETTABLE_CONTRACTOR_STATUSES,
  VALID_CONTRACTOR_STATUSES,
  isValidContractorStatus,
} from "@/lib/contractor-statuses";
import { ASSIGNMENT_STATUSES } from "@/lib/assignment-statuses";

/**
 * The contractor vocabulary had five disagreeing copies: "On Hold" was offered
 * by the edit form, unreachable from the badge picker, rejected as invalid by
 * the PATCH route, and invisible to every filter.
 */

const settable: readonly string[] = SETTABLE_CONTRACTOR_STATUSES;
const pipeline: readonly string[] = PIPELINE_CONTRACTOR_STATUSES;
const valid: readonly string[] = VALID_CONTRACTOR_STATUSES;

describe("SETTABLE_CONTRACTOR_STATUSES", () => {
  test('includes "On Hold"', () => {
    // The whole reason this file exists. "On Hold" is a deliberate staff flag
    // that deactivateContractorIfNoLiveWork refuses to overwrite, so staff must
    // be able to set it — and to filter for it — from every status UI.
    assert.ok(settable.includes("On Hold"));
  });

  test('includes both statuses the compliance denominators exclude', () => {
    // Every compliance query is scoped `notIn ["Left","Inactive"]`. If either
    // became unsettable, staff could not move anyone out of the denominator.
    assert.ok(settable.includes("Left"));
    assert.ok(settable.includes("Inactive"));
  });

  test("includes Active, the status automation derives from live work", () => {
    assert.ok(settable.includes("Active"));
  });

  test("contains no duplicates", () => {
    assert.equal(new Set(settable).size, settable.length);
  });
});

describe("PIPELINE_CONTRACTOR_STATUSES", () => {
  test("is valid to write but never offered in a picker", () => {
    // Setting "Applied" on a working operative from a badge dropdown would drop
    // them back into the applicant funnel.
    for (const status of pipeline) {
      assert.ok(valid.includes(status), `"${status}" must remain writable`);
      assert.equal(
        settable.includes(status),
        false,
        `"${status}" must not be offered in the status pickers`
      );
    }
  });

  test("still covers the statuses stale-applicant matches on", () => {
    assert.ok(pipeline.includes("Applied"));
    assert.ok(pipeline.includes("Looking"));
  });
});

describe("VALID_CONTRACTOR_STATUSES", () => {
  test("is exactly the settable and pipeline vocabularies combined", () => {
    assert.deepEqual([...valid].sort(), [...settable, ...pipeline].sort());
  });

  test("contains no duplicates, so the two vocabularies do not overlap", () => {
    assert.equal(new Set(valid).size, valid.length);
  });
});

describe("isValidContractorStatus", () => {
  test("accepts every status in the vocabulary", () => {
    for (const status of valid) {
      assert.ok(isValidContractorStatus(status), `"${status}" should be accepted`);
    }
  });

  test('accepts "On Hold" — the case the PATCH route used to reject', () => {
    assert.ok(isValidContractorStatus("On Hold"));
  });

  test("rejects unknown, empty and wrongly-cased input", () => {
    assert.equal(isValidContractorStatus("Nonsense"), false);
    assert.equal(isValidContractorStatus(""), false);
    assert.equal(isValidContractorStatus("active"), false);
    assert.equal(isValidContractorStatus("on hold"), false);
  });

  test("rejects assignment statuses that are not also contractor statuses", () => {
    // The two vocabularies both contain "Active", which is exactly why they get
    // confused. Nothing else may leak across.
    const assignmentOnly = (ASSIGNMENT_STATUSES as readonly string[]).filter(
      (s) => s !== "Active"
    );
    for (const status of assignmentOnly) {
      assert.equal(
        isValidContractorStatus(status),
        false,
        `"${status}" is an assignment status and must not be a valid contractor status`
      );
    }
  });
});
