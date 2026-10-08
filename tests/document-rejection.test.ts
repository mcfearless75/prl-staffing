import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  MAX_REASON_LENGTH,
  cleanReason,
  rejectionNote,
  reasonFromNote,
  rejectionMessage,
} from "@/lib/document-rejection";

/**
 * A rejected document is explained to the worker and shown on My Documents
 * until they upload it again (Jenni, 08-10-26).
 */
const at = new Date(Date.UTC(2026, 9, 8, 10));

describe("rejection reason", () => {
  test("the reason survives the round trip through the record's notes", () => {
    assert.equal(reasonFromNote(rejectionNote("Photo is blurry", at)), "Photo is blurry");
  });

  test("no reason given: still recognised as a rejection, with no reason", () => {
    const note = rejectionNote("", at);
    assert.match(note, /^Rejected by PRL on 08\/10\/2026/);
    assert.equal(reasonFromNote(note), null);
  });

  test("ordinary upload notes are not mistaken for a rejection", () => {
    assert.equal(reasonFromNote("Document uploaded by contractor (v2) on 2026-10-08. Awaiting verification."), null);
    assert.equal(reasonFromNote("Checked by Jenni: front and back match"), null);
    assert.equal(reasonFromNote(null), null);
  });

  test("reasons are tidied and capped", () => {
    assert.equal(cleanReason("  card   expired \n "), "card expired");
    assert.equal(cleanReason("x".repeat(1000)).length, MAX_REASON_LENGTH);
    assert.equal(cleanReason(undefined), "");
  });
});

describe("rejectionMessage", () => {
  test("names the document, gives the reason and says to upload again", () => {
    const msg = rejectionMessage("CSCS", "Card has expired");
    assert.match(msg, /Your CSCS has been checked/);
    assert.match(msg, /Reason: Card has expired/);
    assert.match(msg, /upload it again/);
  });

  test("no reason line when none was given", () => {
    assert.doesNotMatch(rejectionMessage("CSCS", ""), /Reason:/);
  });
});
