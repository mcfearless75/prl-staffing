import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  normaliseNI,
  normalisePhone,
  normaliseName,
  normaliseDob,
  matchReasons,
  confidenceOf,
  findPotentialDuplicates,
} from "@/lib/duplicate-check";

/**
 * Applicant-to-existing-contractor matching.
 *
 * These rules decide whether a person filling in /apply is told "you are
 * already registered" and sent to the portal, and whether the office gets a
 * duplicate warning on the notification email. Both directions are expensive to
 * get wrong: a false negative is the bug this was written for (a second record
 * for someone already in PRISM), a false positive locks a genuine new applicant
 * out of the only way in.
 *
 * The assertions below are about the INVARIANT — placeholders are never
 * identifiers, a weak signal never reads as exact — not about the current
 * literal shape of any one normaliser.
 */

describe("NI numbers", () => {
  test("normalises spacing and case to one comparable form", () => {
    assert.equal(normaliseNI("ab 12 34 56 c"), "AB123456C");
    assert.equal(normaliseNI("AB123456C"), "AB123456C");
    // The suffix letter is optional on a real NI number.
    assert.equal(normaliseNI("AB123456"), "AB123456");
  });

  test("rejects the placeholders that fill this column", () => {
    // Each of these appears against many contractors. Treating any of them as
    // an identifier merges all of those people into one.
    for (const junk of ["N/A", "NA", "TBC", "none", "pending", "", "   ", "123456"]) {
      assert.equal(normaliseNI(junk), null, `${JSON.stringify(junk)} is not an NI number`);
    }
  });

  test("a rejected value never matches another rejected value", () => {
    assert.deepEqual(matchReasons({ niNumber: "N/A" }, { niNumber: "N/A" }), []);
  });
});

describe("phone numbers", () => {
  test("treats the three ways of writing one UK mobile as equal", () => {
    const forms = ["+44 7700 900123", "07700 900123", "447700900123"];
    const normalised = forms.map(normalisePhone);
    assert.equal(new Set(normalised).size, 1, "all three forms should reduce to one value");
    assert.equal(normalised[0], "07700900123");
  });

  test("rejects repdigit placeholders and numbers too short to be real", () => {
    for (const junk of ["0000000000", "1111111111", "12345", ""]) {
      assert.equal(normalisePhone(junk), null);
    }
  });
});

describe("names and dates of birth", () => {
  test("ignores case, punctuation and spacing", () => {
    assert.equal(normaliseName("  JAMES ", "O'Neill"), normaliseName("james", "oneill"));
  });

  test("requires both halves — a surname alone is far too weak to match on", () => {
    assert.equal(normaliseName("", "Nye"), null);
    assert.equal(normaliseName("James", ""), null);
    assert.deepEqual(matchReasons({ lastName: "Nye" }, { lastName: "Nye" }), []);
  });

  test("rejects out-of-range dates rather than reading them as a shared birthday", () => {
    assert.equal(normaliseDob("not a date"), null);
    assert.equal(normaliseDob(new Date(Date.now() + 86_400_000)), null, "nobody is born tomorrow");
    assert.equal(normaliseDob("1850-01-01"), null);
    // Accepted on purpose: the Unix epoch is also a real birthday, and someone
    // born that day must still be able to apply.
    assert.equal(normaliseDob(new Date(0)), "1970-01-01");
    assert.equal(normaliseDob(null), null);
    assert.equal(normaliseDob(new Date(Date.UTC(1988, 2, 14))), "1988-03-14");
  });
});

describe("email case", () => {
  test("two addresses differing only in case are the same person", () => {
    // Not hypothetical. `Contractor.email @unique` is a case-SENSITIVE index in
    // Postgres, so the live book contains pairs like these as separate records
    // — four of the six real duplicates found in the first audit were exactly
    // this. Any lookup that is case-sensitive misses all of them.
    assert.deepEqual(
      matchReasons(
        { firstName: "Daniel", lastName: "Stuart", email: "dannystuart12@example.com" },
        { firstName: "Daniel", lastName: "Stuart", email: "Dannystuart12@example.com" }
      ),
      ["email", "name"]
    );
  });

  test("surrounding whitespace does not hide a match either", () => {
    assert.deepEqual(matchReasons({ email: "  a@b.com " }, { email: "A@B.com" }), ["email"]);
  });
});

describe("confidence", () => {
  test("email and NI are exact; name alone is only possible", () => {
    assert.equal(confidenceOf(["email"]), "exact");
    assert.equal(confidenceOf(["ni"]), "exact");
    assert.equal(confidenceOf(["name-dob"]), "strong");
    assert.equal(confidenceOf(["phone"]), "strong");
    assert.equal(confidenceOf(["name"]), "possible");
  });

  test("a mixed set takes the strongest reason, not the last one seen", () => {
    assert.equal(confidenceOf(["name", "ni"]), "exact");
    assert.equal(confidenceOf(["name", "phone"]), "strong");
  });

  test("two people who share only a name are never treated as exact", () => {
    // Common surnames mean this happens for real. It must warn, never block.
    const reasons = matchReasons(
      { firstName: "John", lastName: "Smith", email: "john.smith1@example.com" },
      { firstName: "John", lastName: "Smith", email: "jsmith@example.com" }
    );
    assert.deepEqual(reasons, ["name"]);
    assert.notEqual(confidenceOf(reasons), "exact");
  });
});

describe("finding duplicates", () => {
  const book = [
    {
      id: "c1",
      firstName: "James",
      lastName: "Nye",
      email: "james.nye@example.com",
      phone: "07700 900123",
      niNumber: "AB123456C",
      dateOfBirth: new Date(Date.UTC(1988, 2, 14)),
    },
    {
      id: "c2",
      firstName: "Sarah",
      lastName: "Jones",
      email: "sarah@example.com",
      phone: "07700 900999",
      niNumber: "CD654321A",
      dateOfBirth: new Date(Date.UTC(1990, 5, 2)),
    },
  ];

  test("catches the bug this exists for: same person, brand new email address", () => {
    // Contractor.email is unique, so the database happily accepts this row.
    // Nothing but these rules stands between it and a second record.
    const matches = findPotentialDuplicates(
      {
        firstName: "James",
        lastName: "Nye",
        email: "jnye@newaddress.example.com",
        phone: "+44 7700 900123",
        niNumber: "ab 12 34 56 c",
        dateOfBirth: "1988-03-14",
      },
      book
    );
    assert.equal(matches.length, 1);
    assert.equal(matches[0].record.id, "c1");
    assert.equal(matches[0].confidence, "exact");
    assert.deepEqual(matches[0].reasons, ["ni", "name-dob", "phone"]);
  });

  test("a genuinely new applicant matches nobody", () => {
    const matches = findPotentialDuplicates(
      {
        firstName: "Priya",
        lastName: "Patel",
        email: "priya.patel@example.com",
        phone: "07700 900555",
        niNumber: "EF112233B",
        dateOfBirth: "1995-11-20",
      },
      book
    );
    assert.deepEqual(matches, []);
  });

  test("an applicant carrying only placeholders matches nobody", () => {
    // The failure mode that makes a duplicate check worse than none: everyone
    // who left the optional fields blank collapsing into one person.
    const matches = findPotentialDuplicates(
      { firstName: "New", lastName: "Person", niNumber: "N/A", phone: "0000000000" },
      [...book, { id: "c3", firstName: "Other", lastName: "Person", niNumber: "N/A", phone: "0000000000" }]
    );
    assert.deepEqual(matches, []);
  });

  test("orders exact matches ahead of weaker ones", () => {
    const matches = findPotentialDuplicates(
      { firstName: "Sarah", lastName: "Jones", email: "james.nye@example.com" },
      book
    );
    assert.equal(matches[0].confidence, "exact");
    assert.equal(matches[0].record.id, "c1");
    assert.equal(matches[1].record.id, "c2");
  });
});
