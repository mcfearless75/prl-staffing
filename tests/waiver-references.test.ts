import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { parseWaiver, waiverDecisionLabel } from "@/lib/working-time-waiver";
import { parseReferences, parseIsoDate, MAX_REFERENCES, EMPTY_REFERENCE } from "@/lib/contractor-references";
import { normaliseUkPhone, formatSignOffHtml } from "@/lib/staff-contact";

describe("parseWaiver", () => {
  test("accepts both decisions with a typed name", () => {
    assert.deepEqual(parseWaiver({ decision: "opt-out", signature: "  Joe   Bloggs " }), {
      ok: true,
      value: { decision: "opt-out", signature: "Joe Bloggs" },
    });
    assert.equal(parseWaiver({ decision: "no-opt-out", signature: "Joe Bloggs" }).ok, true);
  });

  test("rejects the old /apply wording and anything else", () => {
    for (const decision of ["I agree", "I disagree", "", undefined, "OPT-OUT"]) {
      assert.equal(parseWaiver({ decision, signature: "Joe Bloggs" }).ok, false);
    }
  });

  test("a signature is required and must contain letters", () => {
    assert.equal(parseWaiver({ decision: "opt-out", signature: "" }).ok, false);
    assert.equal(parseWaiver({ decision: "opt-out", signature: "   " }).ok, false);
    assert.equal(parseWaiver({ decision: "opt-out", signature: "123" }).ok, false);
  });

  test("staff label never shows an unsigned worker as opted out", () => {
    assert.equal(waiverDecisionLabel(null), "Not signed");
    assert.doesNotMatch(waiverDecisionLabel("no-opt-out"), /^Opted out/);
  });
});

describe("parseReferences", () => {
  const full = {
    companyName: "Acme Ltd",
    contactName: "Sam",
    email: "Sam@Acme.co.uk",
    phone: "020 7946 0000",
    jobRole: "Labourer",
    startDate: "2024-01-01",
    endDate: "2025-06-30",
  };

  test("an entry with every field blank is dropped, not saved", () => {
    const r = parseReferences([{ ...EMPTY_REFERENCE }, { companyName: "  " }, full]);
    assert.ok(r.ok);
    assert.equal(r.value.length, 1);
    assert.equal(r.value[0].email, "sam@acme.co.uk");
  });

  test("a single field is enough — everything is optional", () => {
    const r = parseReferences([{ ...EMPTY_REFERENCE, contactName: "Sam" }]);
    assert.ok(r.ok);
    assert.equal(r.value[0].companyName, null);
    assert.equal(r.value[0].startDate, null);
  });

  test("end date before start date is rejected; the same day is fine", () => {
    assert.equal(parseReferences([{ ...full, endDate: "2023-12-31" }]).ok, false);
    assert.equal(parseReferences([{ ...full, endDate: "2024-01-01" }]).ok, true);
  });

  test("bad email or impossible date is rejected", () => {
    assert.equal(parseReferences([{ ...full, email: "not-an-email" }]).ok, false);
    assert.equal(parseReferences([{ ...full, startDate: "2024-02-30" }]).ok, false);
  });

  test(`more than ${MAX_REFERENCES} non-blank entries is rejected`, () => {
    assert.equal(parseReferences(Array(MAX_REFERENCES).fill(full)).ok, true);
    assert.equal(parseReferences(Array(MAX_REFERENCES + 1).fill(full)).ok, false);
  });

  test("the same id twice is rejected", () => {
    assert.equal(parseReferences([{ ...full, id: "a" }, { ...full, id: "a" }]).ok, false);
  });

  test("parseIsoDate rejects rollover dates", () => {
    assert.equal(parseIsoDate("2025-02-29"), null);
    assert.equal(parseIsoDate("2024-02-29")?.toISOString(), "2024-02-29T00:00:00.000Z");
  });
});

describe("normaliseUkPhone", () => {
  test("accepts common UK formats", () => {
    for (const p of ["07700 900123", "07700900123", "+44 7700 900123", "+44 (0)20 7946 0000", "0161-496-0000", "0044 7700 900123"]) {
      assert.ok(normaliseUkPhone(p), p);
    }
  });

  test("rejects junk, short numbers and non-UK formats", () => {
    for (const p of ["hello", "12345", "+1 202 555 0123", "07700 9001234567", "0770+0900123"]) {
      assert.equal(normaliseUkPhone(p), null, p);
    }
  });
});

describe("formatSignOffHtml", () => {
  test("escapes every value", () => {
    const html = formatSignOffHtml({ name: "<b>Jen</b>", email: "j@x.co.uk", phone: null, jobTitle: "Ops & HR" });
    assert.doesNotMatch(html, /<b>Jen/);
    assert.match(html, /Ops &amp; HR/);
  });
});
