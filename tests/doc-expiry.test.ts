import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { COMPLIANCE_TYPE_GROUPS, type ComplianceCategory } from "@/lib/compliance-types";
import { expiryRule, validateWorkerExpiry } from "@/lib/doc-expiry";

/**
 * Mandatory expiry dates on worker uploads. Asserted over the whole taxonomy
 * rather than a copied list, so a card type added later is covered by its
 * category instead of silently skipping the date.
 */

const typesIn = (c: ComplianceCategory) => COMPLIANCE_TYPE_GROUPS.find((g) => g.category === c)!.types;

describe("expiryRule", () => {
  test("every card and certificate category requires an expiry date", () => {
    const cats: ComplianceCategory[] = ["CSCS", "CPCS", "NPORS", "CCNSG", "Plant & Lifting", "Medical", "Rail", "Driving", "DBS"];
    for (const c of cats) for (const t of typesIn(c)) assert.equal(expiryRule(t), "required", t);
  });

  test("passports require one", () => {
    assert.equal(expiryRule("Passport — UK or Ireland"), "required");
    assert.equal(expiryRule("Passport — Other Nationality"), "required");
  });

  test("identity and payroll paperwork never asks", () => {
    for (const t of typesIn("Identity & Payroll")) assert.equal(expiryRule(t), "none", t);
  });

  test("birth certificates and CVs never ask", () => {
    assert.equal(expiryRule("Birth Certificate"), "none");
    assert.equal(expiryRule("CV"), "none");
  });
});

describe("validateWorkerExpiry", () => {
  const today = new Date(2026, 8, 26); // 26 Sep 2026
  const card = { type: "CSCS", expiryDate: null, noExpiry: false };

  test("a card with no date and no tick is refused", () => {
    const r = validateWorkerExpiry(card, today);
    assert.equal(r.ok, false);
  });

  test("ticking 'no expiry' is accepted as indefinite", () => {
    assert.deepEqual(validateWorkerExpiry({ ...card, noExpiry: true }, today), { ok: true, expiryDate: null, indefinite: true });
  });

  test("an in-date card is accepted; today counts as in date", () => {
    const r = validateWorkerExpiry({ ...card, expiryDate: "2026-09-26" }, today);
    assert.ok(r.ok && r.expiryDate?.getDate() === 26);
  });

  test("an expired card is refused", () => {
    const r = validateWorkerExpiry({ ...card, expiryDate: "2026-09-25" }, today);
    assert.ok(!r.ok && /expired/.test(r.error));
  });

  test("an impossible date is refused, not rolled over", () => {
    assert.equal(validateWorkerExpiry({ ...card, expiryDate: "2027-02-30" }, today).ok, false);
    assert.equal(validateWorkerExpiry({ ...card, expiryDate: "30/09/2027" }, today).ok, false);
  });

  test("types that never expire pass with no date", () => {
    assert.deepEqual(validateWorkerExpiry({ type: "P45", expiryDate: null, noExpiry: false }, today), {
      ok: true,
      expiryDate: null,
      indefinite: false,
    });
  });
});
