import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  chaseCutoff,
  docsToChase,
  reminderBlockReason,
} from "@/lib/compliance-reminder";

/**
 * The per-person "Send compliance reminder" button and the daily chase share
 * these rules. If they drifted, staff could send a reminder listing nothing,
 * or the button could promise a send the daily run would never make.
 */

const NOW = new Date("2026-09-26T12:00:00Z");
const days = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

describe("docsToChase", () => {
  test("includes expired and inside-the-window records, soonest first", () => {
    const docs = docsToChase(
      [
        { type: "CSCS", status: "Verified", expiryDate: days(20) },
        { type: "Passport", status: "Expired", expiryDate: days(-5) },
      ],
      NOW
    );
    assert.deepEqual(docs.map((d) => d.type), ["Passport", "CSCS"]);
  });

  test("the window edge is inclusive; a moment past it is not chased", () => {
    const docs = docsToChase(
      [
        // The cutoff is calendar days (setDate), not 24h blocks — the window
        // here spans the October clock change, so pin to the real cutoff.
        { type: "Edge", status: "Verified", expiryDate: chaseCutoff(NOW) },
        { type: "Past", status: "Verified", expiryDate: new Date(chaseCutoff(NOW).getTime() + 1) },
      ],
      NOW
    );
    assert.deepEqual(docs.map((d) => d.type), ["Edge"]);
  });

  test("Pending records and records with no expiry are never chased", () => {
    const docs = docsToChase(
      [
        { type: "DBS", status: "Pending", expiryDate: days(3) },
        { type: "NVQ", status: "Verified", expiryDate: null },
      ],
      NOW
    );
    assert.equal(docs.length, 0);
  });
});

describe("reminderBlockReason", () => {
  const ok = { email: "bob@example.com", emailBounced: false, docCount: 2, alreadyChasedToday: false };

  test("a normal case can send", () => {
    assert.equal(reminderBlockReason(ok), null);
  });

  test("blocks placeholder or missing email", () => {
    assert.match(reminderBlockReason({ ...ok, email: "bob.smith@prl-placeholder.co.uk" })!, /email/);
    assert.match(reminderBlockReason({ ...ok, email: null })!, /email/);
  });

  test("blocks a bounced address", () => {
    assert.match(reminderBlockReason({ ...ok, emailBounced: true })!, /bounced/);
  });

  test("blocks when there is nothing to chase", () => {
    assert.match(reminderBlockReason({ ...ok, docCount: 0 })!, /Nothing/);
  });

  test("blocks a second send the same day — the daily chase counts too", () => {
    assert.match(reminderBlockReason({ ...ok, alreadyChasedToday: true })!, /today/);
  });
});
