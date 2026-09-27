import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "crypto";

import {
  encryptJson,
  decryptJson,
  loadSensitiveKey,
  canViewSensitive,
  SensitiveKeyMissingError,
} from "@/lib/sensitive-crypto";
import {
  normaliseDeclarations,
  missingDeclarations,
  daTestBlocked,
  declarationsComplete,
  retentionDue,
} from "@/lib/declarations";

/**
 * Health, drugs & alcohol and criminal-record answers are special-category
 * data. These pin the protections: encryption that fails closed and detects
 * tampering, minimisation, the D&A soft block, and 12-month erasure.
 */

const KEY = randomBytes(32);

describe("sensitive-crypto", () => {
  test("round-trips, and the stored text reveals nothing", () => {
    const payload = encryptJson({ hasMedicalCondition: "Yes", medicalConditions: "Asthma" }, KEY);
    assert.equal(payload.includes("Asthma"), false);
    assert.deepEqual(decryptJson(payload, KEY), { hasMedicalCondition: "Yes", medicalConditions: "Asthma" });
  });

  test("the same answers encrypt differently each time (random IV)", () => {
    assert.notEqual(encryptJson({ a: 1 }, KEY), encryptJson({ a: 1 }, KEY));
  });

  test("a wrong key or a tampered payload is rejected, never mis-read", () => {
    const payload = encryptJson({ a: 1 }, KEY);
    assert.throws(() => decryptJson(payload, randomBytes(32)));
    const parts = payload.split(".");
    const body = Buffer.from(parts[3], "base64");
    body[0] ^= 1;
    parts[3] = body.toString("base64");
    assert.throws(() => decryptJson(parts.join("."), KEY));
  });

  test("fails closed with no key: nothing is ever stored in the clear", () => {
    assert.throws(() => encryptJson({ a: 1 }, null), SensitiveKeyMissingError);
  });

  test("only a 32-byte base64 key is accepted", () => {
    assert.equal(loadSensitiveKey(undefined), null);
    assert.equal(loadSensitiveKey(randomBytes(16).toString("base64")), null);
    assert.equal(loadSensitiveKey(KEY.toString("base64"))?.length, 32);
  });
});

describe("canViewSensitive", () => {
  const LIST = "paul@prlsitesolutions.co.uk, Adella@prlsitesolutions.co.uk";

  test("a listed admin can view (case and spaces ignored)", () => {
    assert.equal(canViewSensitive({ role: "admin", email: "adella@PRLsitesolutions.co.uk" }, LIST), true);
  });

  test("being an admin is not enough — every staff user is an admin today", () => {
    assert.equal(canViewSensitive({ role: "admin", email: "office@prlsitesolutions.co.uk" }, LIST), false);
  });

  test("a listed email without the admin role cannot view", () => {
    assert.equal(canViewSensitive({ role: "staff", email: "paul@prlsitesolutions.co.uk" }, LIST), false);
  });

  test("fails closed with no list configured", () => {
    assert.equal(canViewSensitive({ role: "admin", email: "paul@prlsitesolutions.co.uk" }, undefined), false);
    assert.equal(canViewSensitive({ role: "admin", email: "paul@prlsitesolutions.co.uk" }, " , "), false);
  });
});

describe("normaliseDeclarations", () => {
  test("drops the medical details unless the answer is Yes", () => {
    assert.equal(normaliseDeclarations({ hasMedicalCondition: "No", medicalConditions: "Asthma" }).medicalConditions, undefined);
    assert.equal(normaliseDeclarations({ hasMedicalCondition: "Yes", medicalConditions: " Asthma " }).medicalConditions, "Asthma");
  });

  test("ignores unknown fields and junk answers", () => {
    const d = normaliseDeclarations({ hasUnspentConviction: "maybe", extra: "x", declarationTrue: "true" });
    assert.equal(d.hasUnspentConviction, undefined);
    assert.equal(d.declarationTrue, false);
    assert.equal("extra" in d, false);
  });
});

describe("completion and the D&A soft block", () => {
  const all = {
    hasMedicalCondition: "No" as const,
    canTakeDaTest: "Yes" as const,
    hasUnspentConviction: "No" as const,
    declarationTrue: true,
  };

  test("everything answered and ticked is complete", () => {
    assert.deepEqual(missingDeclarations(all), []);
    assert.equal(declarationsComplete(all), true);
  });

  test("Yes to a medical condition needs the list", () => {
    assert.deepEqual(missingDeclarations({ ...all, hasMedicalCondition: "Yes" }), ["List of medical conditions"]);
  });

  test("the declaration tick is required", () => {
    assert.deepEqual(missingDeclarations({ ...all, declarationTrue: false }), ["Declaration"]);
  });

  test("No to the D&A test blocks completion even when everything is answered", () => {
    const d = { ...all, canTakeDaTest: "No" as const };
    assert.equal(daTestBlocked(d), true);
    assert.deepEqual(missingDeclarations(d), []);
    assert.equal(declarationsComplete(d), false);
  });
});

describe("retentionDue", () => {
  const NOW = new Date("2026-09-27T12:00:00Z");
  const OLD = new Date("2025-06-01");
  const RECENT = new Date("2026-06-01");
  const gone = { status: "Inactive", hasLiveWork: false, leavingDate: OLD, lastJobEnd: OLD, declaredAt: OLD };

  test("erased 12 months after leaving", () => {
    assert.equal(retentionDue(gone, NOW), true);
  });

  test("kept while Active or on live work", () => {
    assert.equal(retentionDue({ ...gone, status: "Active" }, NOW), false);
    assert.equal(retentionDue({ ...gone, hasLiveWork: true }, NOW), false);
  });

  test("measured from the LATEST of leaving, last job and the answers", () => {
    assert.equal(retentionDue({ ...gone, lastJobEnd: RECENT }, NOW), false);
    assert.equal(retentionDue({ ...gone, leavingDate: RECENT }, NOW), false);
    assert.equal(retentionDue({ ...gone, declaredAt: RECENT }, NOW), false);
  });

  test("with no leaving date or jobs, the answers' own date counts", () => {
    assert.equal(retentionDue({ ...gone, leavingDate: null, lastJobEnd: null }, NOW), true);
  });
});
