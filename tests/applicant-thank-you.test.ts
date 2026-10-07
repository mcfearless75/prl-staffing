import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { applicantThankYouEmail, PRL_CONTACT } from "@/lib/applicant-thank-you";

/**
 * Website applicants get a "thanks, we'll be in touch" email with PRL's
 * contact details and social links (Erica, 07-10-26 #5).
 */
describe("applicantThankYouEmail", () => {
  test("greets by first name and says we'll be in touch", () => {
    const { html, text } = applicantThankYouEmail("Sam");
    assert.match(html, /Hi Sam,/);
    assert.match(text, /^Hi Sam,/);
    assert.match(text, /will be in touch/);
  });

  test("carries the contact details and both social links, in HTML and text", () => {
    const { html, text } = applicantThankYouEmail("Sam");
    for (const value of [PRL_CONTACT.phone, PRL_CONTACT.email, PRL_CONTACT.linkedin, PRL_CONTACT.instagram]) {
      assert.ok(html.includes(value), `html missing ${value}`);
      assert.ok(text.includes(value), `text missing ${value}`);
    }
  });

  test("the applicant's name is escaped in the HTML", () => {
    const { html } = applicantThankYouEmail('<img src=x onerror="alert(1)">');
    assert.ok(!html.includes("<img src=x"));
    assert.match(html, /&lt;img/);
  });

  test("a blank name still reads properly", () => {
    assert.match(applicantThankYouEmail("  ").text, /^Hi there,/);
  });
});
