import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSentEmailRecord, parseSentEmailRecord } from "@/lib/sent-email-record";

const email = {
  by: "jen@prlsitesolutions.co.uk",
  to: "worker@example.com",
  subject: "Action needed: your Right to Work — PRL Site Solutions",
  html: '<!DOCTYPE html><html><body><p>Hi "Sam" & co,</p></body></html>',
};

test("round-trips a sent email exactly, including quotes, ampersands and dashes", () => {
  assert.deepEqual(parseSentEmailRecord(buildSentEmailRecord(email)), email);
});

test("keeps the optional note, and omits it when empty", () => {
  const withNote = parseSentEmailRecord(buildSentEmailRecord({ ...email, note: "3 document(s) listed" }));
  assert.equal(withNote?.note, "3 document(s) listed");
  const stored = JSON.parse(buildSentEmailRecord({ ...email, note: "" }));
  assert.equal("note" in stored, false);
});

test("old plain-text details are not treated as a stored email", () => {
  assert.equal(parseSentEmailRecord("by jen@prlsitesolutions.co.uk"), null);
  assert.equal(parseSentEmailRecord("3 document(s) listed"), null);
  assert.equal(parseSentEmailRecord(""), null);
  assert.equal(parseSentEmailRecord(null), null);
  assert.equal(parseSentEmailRecord(undefined), null);
});

test("malformed or other-shaped JSON returns null rather than throwing", () => {
  assert.equal(parseSentEmailRecord("{not json"), null);
  assert.equal(parseSentEmailRecord("[1,2]"), null);
  assert.equal(parseSentEmailRecord("null"), null);
  // Campaign entries store JSON too, but not an email.
  assert.equal(parseSentEmailRecord(JSON.stringify({ sent: 12, template: "welcome" })), null);
  // Every email field must be a string, and there must be a body to show.
  assert.equal(parseSentEmailRecord(JSON.stringify({ ...email, html: "" })), null);
  assert.equal(parseSentEmailRecord(JSON.stringify({ ...email, to: 42 })), null);
  assert.equal(parseSentEmailRecord(JSON.stringify({ to: email.to, html: email.html })), null);
});

test("a missing sender still shows the email", () => {
  const rest = { to: email.to, subject: email.subject, html: email.html };
  assert.deepEqual(parseSentEmailRecord(JSON.stringify(rest)), { ...rest, by: "" });
});
