import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  UPLOAD_ACTION,
  SUBMIT_ACTION,
  NUDGE_ACTION,
  pendingUploads,
  lastSubmittedAt,
  needsNudge,
  documentsSubmittedEmail,
  type SubmissionEvent,
} from "@/lib/document-submission";

/**
 * The office is told once, when a worker presses Submit, not on every upload
 * (Jenni, 08-10-26). Uploads nobody submitted are caught next morning.
 */
const at = (h: number) => new Date(Date.UTC(2026, 9, 8, h));
const ev = (action: string, h: number, details?: string): SubmissionEvent => ({ action, createdAt: at(h), details });

describe("pendingUploads", () => {
  test("only uploads after the last Submit count, oldest first", () => {
    const events = [ev(UPLOAD_ACTION, 9, "CSCS"), ev(SUBMIT_ACTION, 10), ev(UPLOAD_ACTION, 12, "P45"), ev(UPLOAD_ACTION, 11, "Passport")];
    assert.deepEqual(pendingUploads(events).map((e) => e.details), ["Passport", "P45"]);
  });

  test("never submitted: every upload is pending", () => {
    assert.equal(pendingUploads([ev(UPLOAD_ACTION, 9), ev(UPLOAD_ACTION, 10)]).length, 2);
  });

  test("other activity is ignored", () => {
    assert.equal(pendingUploads([ev("Document uploaded by staff", 9), ev(NUDGE_ACTION, 10)]).length, 0);
  });

  test("lastSubmittedAt is the latest Submit", () => {
    assert.deepEqual(lastSubmittedAt([ev(SUBMIT_ACTION, 9), ev(SUBMIT_ACTION, 11)]), at(11));
    assert.equal(lastSubmittedAt([ev(UPLOAD_ACTION, 9)]), null);
  });
});

describe("needsNudge", () => {
  test("unsubmitted uploads older than the wait: yes", () => {
    assert.equal(needsNudge([ev(UPLOAD_ACTION, 9)], at(12)), true);
  });

  test("recent upload: no, they may still be going", () => {
    assert.equal(needsNudge([ev(UPLOAD_ACTION, 9), ev(UPLOAD_ACTION, 11)], at(12)), false);
  });

  test("submitted: no", () => {
    assert.equal(needsNudge([ev(UPLOAD_ACTION, 9), ev(SUBMIT_ACTION, 10)], at(20)), false);
  });

  test("already told about these uploads: no", () => {
    assert.equal(needsNudge([ev(UPLOAD_ACTION, 9), ev(NUDGE_ACTION, 12)], at(20)), false);
  });

  test("a new upload after the office was told: yes again", () => {
    assert.equal(needsNudge([ev(UPLOAD_ACTION, 9), ev(NUDGE_ACTION, 12), ev(UPLOAD_ACTION, 14)], at(20)), true);
  });
});

describe("documentsSubmittedEmail", () => {
  test("lists every upload and links to the profile", () => {
    const { subject, html } = documentsSubmittedEmail({
      name: "Sam Smith",
      jobTitle: "Labourer",
      uploads: [ev(UPLOAD_ACTION, 9, "Passport — p.jpg"), ev(UPLOAD_ACTION, 10, "CSCS — c.jpg")],
      link: "https://example.test/contractors/1",
    });
    assert.match(subject, /Sam Smith has submitted their documents/);
    assert.match(html, /2 documents to verify/);
    assert.ok(html.includes("Passport — p.jpg") && html.includes("CSCS — c.jpg"));
    assert.ok(html.includes("https://example.test/contractors/1"));
  });

  test("names and file names are escaped", () => {
    const { html } = documentsSubmittedEmail({
      name: "<b>x</b>",
      uploads: [ev(UPLOAD_ACTION, 9, '<img src=x onerror="1">')],
      link: "#",
    });
    assert.ok(!html.includes("<b>x</b>") && !html.includes("<img src=x"));
  });
});
