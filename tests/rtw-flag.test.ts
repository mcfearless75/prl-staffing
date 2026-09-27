import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { rtwCoverage, rtwReminderBlockReason, RTW_REMINDER_GAP_HOURS } from "@/lib/rtw-flag";
import { isValidComplianceType } from "@/lib/compliance-types";

/**
 * The red Right to Work flag on the profile header. Rule (Paul, 2026-09-27):
 * covered = a VERIFIED document that has NOT EXPIRED. A wrong "covered" hides
 * an illegal-working risk, so the edges are pinned here.
 */

const NOW = new Date("2026-09-27T12:00:00Z");
const FUTURE = new Date("2027-05-01");
const PAST = new Date("2026-09-01");
const rec = (type: string, status: string, expiryDate: Date | null = FUTURE) => ({ type, status, expiryDate });

describe("rtwCoverage", () => {
  test("a verified, in-date passport covers it", () => {
    assert.deepEqual(rtwCoverage([rec("Passport — UK or Ireland", "Verified")], NOW), { covered: true, reason: null });
  });

  test("Expiring is still verified and in date, so covered", () => {
    assert.equal(rtwCoverage([rec("Passport — Other Nationality", "Expiring")], NOW).covered, true);
  });

  test("a document with no expiry date counts (e.g. a check record)", () => {
    assert.equal(rtwCoverage([rec("Right to Work Check Record", "Verified", null)], NOW).covered, true);
  });

  test("nothing on file", () => {
    const r = rtwCoverage([rec("CSCS", "Verified")], NOW);
    assert.equal(r.covered, false);
    assert.match(r.reason!, /no right to work document/i);
  });

  test("uploaded but not verified yet", () => {
    const r = rtwCoverage([rec("Passport — UK or Ireland", "Pending")], NOW);
    assert.equal(r.covered, false);
    assert.match(r.reason!, /verif/i);
  });

  test("verified but past its expiry date, even if the status was never updated", () => {
    const r = rtwCoverage([rec("Passport — UK or Ireland", "Verified", PAST)], NOW);
    assert.equal(r.covered, false);
    assert.match(r.reason!, /expired/i);
  });

  test("a birth certificate needs verified NI proof alongside it", () => {
    assert.equal(rtwCoverage([rec("Birth Certificate", "Verified", null)], NOW).covered, false);
    assert.equal(
      rtwCoverage([rec("Birth Certificate", "Verified", null), rec("National Insurance Proof", "Verified", null)], NOW).covered,
      true
    );
  });

  test("a bare share-code record is not proof on its own", () => {
    assert.equal(rtwCoverage([rec("Share Code", "Verified", null)], NOW).covered, false);
  });

  test("the types it relies on are real compliance types", () => {
    for (const t of ["Birth Certificate", "National Insurance Proof", "Share Code"]) {
      assert.ok(isValidComplianceType(t), t);
    }
  });
});

describe("rtwReminderBlockReason", () => {
  const ok = { covered: false, email: "worker@example.com", emailBounced: false, lastSentAt: null };

  test("allowed when not covered and not recently chased", () => {
    assert.equal(rtwReminderBlockReason(ok, NOW), null);
  });

  test("blocked when already covered", () => {
    assert.match(rtwReminderBlockReason({ ...ok, covered: true }, NOW)!, /covered/i);
  });

  test("blocked for placeholder or bounced emails", () => {
    assert.ok(rtwReminderBlockReason({ ...ok, email: "x@prl-placeholder.co.uk" }, NOW));
    assert.ok(rtwReminderBlockReason({ ...ok, emailBounced: true }, NOW));
  });

  test("one reminder per gap, so a double-click can't send two", () => {
    const justNow = new Date(NOW.getTime() - 60 * 60 * 1000);
    assert.match(rtwReminderBlockReason({ ...ok, lastSentAt: justNow }, NOW)!, /already/i);
    const longAgo = new Date(NOW.getTime() - (RTW_REMINDER_GAP_HOURS + 1) * 60 * 60 * 1000);
    assert.equal(rtwReminderBlockReason({ ...ok, lastSentAt: longAgo }, NOW), null);
  });
});
