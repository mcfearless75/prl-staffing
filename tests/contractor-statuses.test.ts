import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  NO_LONGER_WORKING_STATUSES,
  isNoLongerWorking,
  PIPELINE_CONTRACTOR_STATUSES,
  RETIRED_CONTRACTOR_STATUSES,
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
  test("is exactly Active and Inactive — the two statuses automation moves between", () => {
    // 2026-09-27 clean-up: anything else settable would be a state automation
    // can neither enter nor leave (as On Hold and Left were).
    assert.deepEqual([...settable].sort(), ["Active", "Inactive"]);
  });

  test("still lets staff move someone out of the compliance denominator", () => {
    // Every compliance query is scoped `notIn ["Left","Inactive"]`.
    assert.ok(settable.includes("Inactive"));
  });
});

describe("RETIRED_CONTRACTOR_STATUSES", () => {
  test("can no longer be written through any path", () => {
    for (const status of RETIRED_CONTRACTOR_STATUSES) {
      assert.equal(isValidContractorStatus(status), false, `"${status}" was retired`);
      assert.equal(settable.includes(status), false, `"${status}" must not be offered`);
    }
  });

  test("covers every status the clean-up removed", () => {
    for (const s of ["New", "On Hold", "Suspended", "Left"]) {
      assert.ok((RETIRED_CONTRACTOR_STATUSES as readonly string[]).includes(s), s);
    }
  });
});

describe("SETTABLE_CONTRACTOR_STATUSES (shape)", () => {

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

describe("NO_LONGER_WORKING_STATUSES", () => {
  test("covers the settable leaver status and the retired one old rows may hold", () => {
    assert.ok(isNoLongerWorking("Inactive"));
    assert.ok(isNoLongerWorking("Left"));
  });

  // Getting this wrong stops PRL chasing people who ARE working.
  test("never includes a working or pipeline status", () => {
    for (const s of ["Active", ...PIPELINE_CONTRACTOR_STATUSES]) {
      assert.equal(isNoLongerWorking(s), false, s);
    }
    assert.equal(isNoLongerWorking(null), false);
  });

  test("every member is the leaver status or a retired one", () => {
    const known: readonly string[] = ["Inactive", ...RETIRED_CONTRACTOR_STATUSES];
    for (const s of NO_LONGER_WORKING_STATUSES) assert.ok(known.includes(s), s);
  });
});
