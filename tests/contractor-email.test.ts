import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { emailMatches, normaliseStoredEmail } from "@/lib/contractor-email";

/**
 * Case-insensitive lookup of a person by email.
 *
 * `Contractor.email @unique` is case-SENSITIVE in Postgres, so an exact-match
 * lookup silently fails to find somebody whose stored address is capitalised
 * differently. The consequences were real: four duplicate contractor records,
 * and the people behind them unable to get into the portal with no error to
 * explain why.
 */

describe("emailMatches", () => {
  test("always asks Postgres for an insensitive comparison", () => {
    // The whole point. Losing this property reintroduces the bug silently,
    // because an exact match is correct for almost every row.
    assert.equal(emailMatches("a@b.com").mode, "insensitive");
  });

  test("normalises case and surrounding whitespace before comparing", () => {
    assert.equal(emailMatches("  Dannystuart12@GMAIL.com ").equals, "dannystuart12@gmail.com");
  });

  test("two spellings of one address produce the same filter", () => {
    assert.deepEqual(emailMatches("Jamie23Woods@gmail.com"), emailMatches("jamie23woods@gmail.com"));
  });
});

describe("normaliseStoredEmail", () => {
  test("is the form every write path should store", () => {
    assert.equal(normaliseStoredEmail(" Connor.Woods@ICloud.com "), "connor.woods@icloud.com");
  });

  test("agrees with what emailMatches looks for", () => {
    // If these ever disagree, rows get written that lookups cannot find.
    const raw = "  Indersandhu4013@Gmail.com ";
    assert.equal(normaliseStoredEmail(raw), emailMatches(raw).equals);
  });
});
