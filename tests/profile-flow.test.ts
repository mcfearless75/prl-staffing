import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { missingForSubmit } from "@/lib/profile-flow";

/**
 * One "Submit and continue" covers the whole first-login profile. It must not
 * let a worker through with the health questions or waiver unanswered, which
 * is what the old mid-page Submit button allowed.
 */
const PROFILE = {
  title: "Mr", firstName: "Sam", lastName: "Jones", pronouns: "He/him", nationality: "British",
  email: "sam@example.com", phone: "07700900000", address: "1 High St", postcode: "M1 1AA",
  dateOfBirth: "1990-01-01", niNumber: "AB123456C", emergencyContactName: "Jo Jones",
  emergencyContactPhone: "07700900001", emergencyContactRelation: "Parent",
};
const DECLARATIONS = {
  hasMedicalCondition: "No", canTakeDaTest: "Yes", hasUnspentConviction: "No", declarationTrue: true,
};
const WAIVER = { signedBefore: false, decision: "opt-out", signature: "Sam Jones" };

describe("missingForSubmit", () => {
  test("a fully answered profile has nothing missing", () => {
    assert.deepEqual(missingForSubmit({ profile: PROFILE, declarations: DECLARATIONS, waiver: WAIVER }), []);
  });

  test("details done but health questions blank is NOT complete", () => {
    const missing = missingForSubmit({ profile: PROFILE, declarations: {}, waiver: WAIVER });
    assert.ok(missing.includes("Medical conditions"));
    assert.ok(missing.includes("Declaration"));
  });

  test("an unsigned waiver is missing, a previously signed one is not", () => {
    const blank = { signedBefore: false, decision: "", signature: "" };
    assert.deepEqual(
      missingForSubmit({ profile: PROFILE, declarations: DECLARATIONS, waiver: blank }),
      ["48 Hour Waiver choice", "48 Hour Waiver signature"]
    );
    assert.deepEqual(
      missingForSubmit({ profile: PROFILE, declarations: DECLARATIONS, waiver: { ...blank, signedBefore: true } }),
      []
    );
  });

  test("sections not shown to the worker don't block them", () => {
    assert.deepEqual(missingForSubmit({ profile: PROFILE, declarations: null, waiver: null }), []);
  });

  test("missing items come in page order: details, then health, then waiver", () => {
    const missing = missingForSubmit({
      profile: { ...PROFILE, phone: "" },
      declarations: { ...DECLARATIONS, declarationTrue: false },
      waiver: { signedBefore: false, decision: "", signature: "Sam Jones" },
    });
    assert.deepEqual(missing, ["Phone", "Declaration", "48 Hour Waiver choice"]);
  });
});
