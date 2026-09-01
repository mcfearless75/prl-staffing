import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { isDsnCandidate, parseDsnText } from "@/lib/workflows/bounce-parse";

/**
 * bounce-check reads whatever DSN text the receiving mail server chose to
 * write, so this is regex-against-real-wording, not structured parsing.
 * REAL_GMAIL_BOUNCE is the literal text that triggered the bounce-check
 * feature: a compliance-chase email to a mistyped Gmail address came back as
 * a DSN in the infotech@ mailbox that nothing in PRISM had ever read.
 */
const REAL_GMAIL_BOUNCE = `
This is the PPE Hosted Dispatch mail system.

PPE Hosted tried to deliver your email message, but was unable to do so for reasons outside our control.

We recommend contacting the person or service responsible for looking after the recipient domain's email server directly.

The last error message we have available from the recipient's server is included right below, along with an extract of your email:

<ogonnanwasor81@gmail.com>: host gmail-smtp-in.l.google.com[142.250.31.27]
    said: 550-5.1.1 The email account that you tried to reach does not exist.
    Please try 550-5.1.1 double-checking the recipient's email address for
    typos or 550-5.1.1 unnecessary spaces. For more information, go to 550
    5.1.1 https://support.google.com/mail/?p=NoSuchUser
    6a1803df08f44-90ce4433ce7si88956376d6.146 - gsmtp (in reply to RCPT TO
    command)
`;

describe("isDsnCandidate", () => {
  test("matches the real bounce subject", () => {
    assert.equal(
      isDsnCandidate(
        "Undeliverable: Action Required: Compliance Documents Need Attention — PRL Site Solutions",
        "mailer-daemon@ppe-hosted.com"
      ),
      true
    );
  });

  test("matches on sender alone when the subject doesn't say Undeliverable", () => {
    assert.equal(isDsnCandidate("Delivery has failed", "Mail Delivery System <postmaster@example.com>"), true);
  });

  test("an ordinary contractor email is not a candidate", () => {
    assert.equal(isDsnCandidate("Timesheet approved", "jenni@prlsitesolutions.co.uk"), false);
  });
});

describe("parseDsnText", () => {
  test("extracts the recipient and hard-bounce code from the real Gmail bounce", () => {
    const result = parseDsnText(REAL_GMAIL_BOUNCE);
    assert.deepEqual(result, {
      recipient: "ogonnanwasor81@gmail.com",
      code: "5.1.1",
      severity: "hard",
    });
  });

  test("classifies a 4xx code as soft, not hard", () => {
    const text = `<someone@example.com>: host mx.example.com said: 421-4.2.2 mailbox temporarily over quota`;
    const result = parseDsnText(text);
    assert.equal(result?.severity, "soft");
    assert.equal(result?.code, "4.2.2");
  });

  test("recipient is lowercased even if the DSN quotes it mixed-case", () => {
    const text = `<Someone.Else@Example.COM>: host mx.example.com said: 550-5.1.1 no such user`;
    assert.equal(parseDsnText(text)?.recipient, "someone.else@example.com");
  });

  test("falls back to RFC 3464 Final-Recipient when no inline <addr>: host block is present", () => {
    const text = `Final-Recipient: rfc822; someone@example.com\nDiagnostic-Code: smtp; 550 5.1.1 unknown user`;
    assert.equal(parseDsnText(text)?.recipient, "someone@example.com");
  });

  test("returns null when there's no recognisable recipient", () => {
    assert.equal(parseDsnText("Your message could not be delivered."), null);
  });

  test("returns null when a recipient is found but no status code is", () => {
    const text = `<someone@example.com>: host mx.example.com said: something went wrong, sorry`;
    assert.equal(parseDsnText(text), null);
  });

  test("returns null for empty input", () => {
    assert.equal(parseDsnText(""), null);
  });
});
