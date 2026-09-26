import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { missingProfileFields, nameChange, REQUIRED_PROFILE_FIELDS } from "@/lib/profile-completion";
import { NATIONALITY_OPTIONS, PREFER_NOT_TO_SAY, TITLE_OPTIONS, pickOption } from "@/lib/profile-options";

/**
 * The App Invite Form's Submit rule and name-change flag. A field missing from
 * the rule lets people "submit" without an emergency contact; a too-loose name
 * check lets a changed legal name slip past the RTW check unseen.
 */

const complete = {
  title: "Mr", firstName: "Robert", lastName: "Smith", pronouns: "He/him",
  nationality: "United Kingdom", email: "bob@example.com", phone: "07700 900000",
  address: "1 High St", postcode: "M1 1AA", dateOfBirth: "1990-01-01", niNumber: "AB123456C",
  emergencyContactName: "Jane Smith", emergencyContactPhone: "07700 900001",
  emergencyContactRelation: "Spouse/Partner",
};

describe("missingProfileFields", () => {
  test("a complete profile is missing nothing", () => {
    assert.deepEqual(missingProfileFields(complete), []);
  });

  test("blank or whitespace counts as missing", () => {
    assert.deepEqual(missingProfileFields({ ...complete, emergencyContactPhone: "  " }), ["Emergency contact phone"]);
  });

  test("lists labels in form order", () => {
    const missing = missingProfileFields({ ...complete, niNumber: "", title: null });
    assert.deepEqual(missing, ["Title", "NI number"]);
  });

  test("every emergency contact field is required (PRL: all mandatory)", () => {
    const keys = REQUIRED_PROFILE_FIELDS.map((f) => f.key as string);
    for (const k of ["emergencyContactName", "emergencyContactPhone", "emergencyContactRelation"]) {
      assert.ok(keys.includes(k), k);
    }
  });

  test("Known as is optional", () => {
    assert.ok(!REQUIRED_PROFILE_FIELDS.some((f) => (f.key as string) === "knownAs"));
  });
});

describe("nameChange", () => {
  test("whitespace-only edits are not a change", () => {
    assert.equal(nameChange({ firstName: "Robert", lastName: "Smith" }, { firstName: " Robert ", lastName: "Smith  " }).changed, false);
  });

  test("a spelling fix is a change, reporting the old name", () => {
    assert.deepEqual(
      nameChange({ firstName: "Robert", lastName: "Smyth" }, { firstName: "Robert", lastName: "Smith" }),
      { changed: true, from: "Robert Smyth" }
    );
  });

  test("a capitalisation fix is a change", () => {
    assert.equal(nameChange({ firstName: "robert", lastName: "smith" }, { firstName: "Robert", lastName: "Smith" }).changed, true);
  });
});

describe("pickOption", () => {
  test("returns the canonical option, case-insensitively", () => {
    assert.equal(pickOption("mx", TITLE_OPTIONS), "Mx");
  });

  test("rejects anything not offered", () => {
    assert.equal(pickOption("Lord", TITLE_OPTIONS), null);
    assert.equal(pickOption(42, TITLE_OPTIONS), null);
  });

  test("nationality offers the UK first and 'Prefer not to say'", () => {
    assert.equal(NATIONALITY_OPTIONS[0], "United Kingdom");
    assert.ok(NATIONALITY_OPTIONS.includes(PREFER_NOT_TO_SAY));
    assert.equal(new Set(NATIONALITY_OPTIONS).size, NATIONALITY_OPTIONS.length, "no duplicates");
  });
});
