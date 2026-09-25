import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  enquiryEmailHtml,
  enquiryEmailSubject,
  isAllowedEnquiryOrigin,
  MIN_FILL_MS,
  validateClientEnquiry,
} from "@/lib/client-enquiry";

/**
 * Public-website "Request workers" enquiries.
 *
 * This endpoint is unauthenticated and reachable from the open internet, so the
 * rules that matter are: real enquiries always get through, bots get a fake
 * success (so they don't retry) and send nothing, and nothing a stranger types
 * can inject HTML into the staff inbox.
 */

const NOW = 1_800_000_000_000;
const valid = {
  name: "Sam Site",
  company: "Acme Civils Ltd",
  email: "sam@acme.co.uk",
  phone: "07700 900123",
  workers: "4",
  location: "Ince, Cheshire",
  startDate: "Monday",
  message: "Need 4 steel fixers for 3 weeks",
  website: "",
  startedAt: NOW - 60_000,
};

describe("validateClientEnquiry", () => {
  test("accepts a complete enquiry", () => {
    const r = validateClientEnquiry(valid, NOW);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.enquiry.company, "Acme Civils Ltd");
  });

  test("optional fields may be left blank", () => {
    const r = validateClientEnquiry({ ...valid, workers: "", location: " ", startDate: undefined }, NOW);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.enquiry.workers, null);
      assert.equal(r.enquiry.location, null);
      assert.equal(r.enquiry.startDate, null);
    }
  });

  test("names every missing required field", () => {
    const r = validateClientEnquiry({ ...valid, company: "", phone: "  " }, NOW);
    assert.equal(r.ok, false);
    if (!r.ok && !r.spam) {
      assert.match(r.error, /company/);
      assert.match(r.error, /phone/);
    }
  });

  test("rejects a malformed email and a too-short phone number, as user errors not spam", () => {
    for (const bad of [{ email: "not-an-email" }, { phone: "123" }]) {
      const r = validateClientEnquiry({ ...valid, ...bad }, NOW);
      assert.deepEqual([r.ok, !r.ok && r.spam], [false, false]);
    }
  });

  test("honeypot filled -> spam", () => {
    assert.deepEqual(validateClientEnquiry({ ...valid, website: "http://x" }, NOW), { ok: false, spam: true });
  });

  test("submitted faster than a human could -> spam; just over the limit -> fine", () => {
    assert.deepEqual(
      validateClientEnquiry({ ...valid, startedAt: NOW - (MIN_FILL_MS - 1) }, NOW),
      { ok: false, spam: true }
    );
    assert.equal(validateClientEnquiry({ ...valid, startedAt: NOW - MIN_FILL_MS }, NOW).ok, true);
  });

  test("a missing timestamp does not block a real enquiry", () => {
    // e.g. a browser that fails to run the script that sets it
    assert.equal(validateClientEnquiry({ ...valid, startedAt: undefined }, NOW).ok, true);
  });

  test("strips line breaks from single-line fields", () => {
    const r = validateClientEnquiry({ ...valid, company: "Acme\r\nBcc: x@y.z" }, NOW);
    assert.equal(r.ok, true);
    if (r.ok) assert.ok(!/[\r\n]/.test(enquiryEmailSubject(r.enquiry)));
  });

  test("keeps line breaks in the message box", () => {
    const r = validateClientEnquiry({ ...valid, message: "Line one\r\nLine two" }, NOW);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.enquiry.message, "Line one\nLine two");
  });

  test("rejects non-object bodies", () => {
    for (const body of [null, "x", 42]) assert.equal(validateClientEnquiry(body, NOW).ok, false);
  });
});

describe("enquiryEmailHtml", () => {
  test("escapes everything the visitor typed", () => {
    const r = validateClientEnquiry({ ...valid, name: "<script>alert(1)</script>", message: '<img src=x onerror="y">' }, NOW);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const html = enquiryEmailHtml(r.enquiry);
    assert.ok(!html.includes("<script>"));
    assert.ok(!html.includes("<img"));
    assert.ok(html.includes("&lt;script&gt;"));
  });

  test("shows which website page the enquiry came from", () => {
    const r = validateClientEnquiry({ ...valid, page: "/energy-from-waste-recruitment/" }, NOW);
    if (!r.ok) return assert.fail("expected valid");
    const html = enquiryEmailHtml(r.enquiry);
    assert.ok(html.includes("Sent from page"));
    assert.ok(html.includes("/energy-from-waste-recruitment/"));
  });

  test("omits rows for optional fields left blank", () => {
    const r = validateClientEnquiry({ ...valid, workers: "" }, NOW);
    if (!r.ok) return assert.fail("expected valid");
    assert.ok(!enquiryEmailHtml(r.enquiry).includes("Workers needed"));
  });
});

describe("isAllowedEnquiryOrigin", () => {
  test("only the PRL website may post", () => {
    assert.equal(isAllowedEnquiryOrigin("https://prlsitesolutions.co.uk"), true);
    assert.equal(isAllowedEnquiryOrigin("https://www.prlsitesolutions.co.uk"), true);
    assert.equal(isAllowedEnquiryOrigin("https://prlsitesolutions.co.uk.evil.com"), false);
    assert.equal(isAllowedEnquiryOrigin("http://prlsitesolutions.co.uk"), false);
    assert.equal(isAllowedEnquiryOrigin(null), false);
  });
});
