import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  parseCampaignFilter,
  isMissing,
  matchesFilter,
  skipReason,
  renderMessage,
  renderSubject,
  CAMPAIGN_TEMPLATES,
  CAMPAIGN_CATEGORIES,
} from "@/lib/campaign-builder";

/**
 * Campaign → Custom email. These rules decide who gets a real email, so the
 * edges that would email the wrong people (or inject markup) are pinned.
 */

const NOW = new Date("2026-09-27T12:00:00Z");
const FUTURE = new Date("2027-06-01");
const PAST = new Date("2026-01-01");

describe("parseCampaignFilter", () => {
  test("keeps valid values", () => {
    assert.deepEqual(parseCampaignFilter({ status: "Active", jobTitle: " Joiner ", missing: "rtw" }), {
      status: "Active",
      jobTitle: "Joiner",
      missing: "rtw",
    });
    assert.equal(parseCampaignFilter({ missing: "category:CSCS" }).missing, "category:CSCS");
  });

  test("drops anything unknown to 'any', never to something broader or odd", () => {
    assert.deepEqual(parseCampaignFilter({ status: "Left", jobTitle: 5, missing: "category:Nope" }), {
      status: "",
      jobTitle: "",
      missing: "",
    });
  });

  test("Right to Work is its own filter, not a category", () => {
    assert.equal(CAMPAIGN_CATEGORIES.includes("Right to Work"), false);
  });
});

describe("isMissing", () => {
  const cscs = (status: string, expiryDate: Date | null = FUTURE) => ({ type: "CSCS", status, expiryDate });

  test("no filter matches everyone", () => {
    assert.equal(isMissing([], "", NOW), true);
  });

  test("a card on file (even Pending) means they are not missing it", () => {
    assert.equal(isMissing([cscs("Verified")], "category:CSCS", NOW), false);
    assert.equal(isMissing([cscs("Pending")], "category:CSCS", NOW), false);
  });

  test("nothing, rejected, or out of date counts as missing", () => {
    assert.equal(isMissing([], "category:CSCS", NOW), true);
    assert.equal(isMissing([cscs("Non-Compliant")], "category:CSCS", NOW), true);
    assert.equal(isMissing([cscs("Verified", PAST)], "category:CSCS", NOW), true);
  });

  test("Right to Work uses the profile flag's rule", () => {
    assert.equal(isMissing([], "rtw", NOW), true);
    assert.equal(isMissing([{ type: "Passport — UK or Ireland", status: "Verified", expiryDate: FUTURE }], "rtw", NOW), false);
  });
});

describe("matchesFilter", () => {
  const person = { status: "Active", jobTitle: "Joiner", compliances: [] };

  test("status and job title must both match; job title ignores case and spaces", () => {
    assert.equal(matchesFilter(person, { status: "Active", jobTitle: "joiner", missing: "" }, NOW), true);
    assert.equal(matchesFilter({ ...person, jobTitle: " Joiner " }, { status: "", jobTitle: "Joiner", missing: "" }, NOW), true);
    assert.equal(matchesFilter(person, { status: "Inactive", jobTitle: "", missing: "" }, NOW), false);
    assert.equal(matchesFilter(person, { status: "", jobTitle: "Labourer", missing: "" }, NOW), false);
  });

  test("job title is exact, not a substring (\"Joiner\" must not catch \"Joiner Supervisor\")", () => {
    assert.equal(matchesFilter({ ...person, jobTitle: "Joiner Supervisor" }, { status: "", jobTitle: "Joiner", missing: "" }, NOW), false);
  });
});

describe("skipReason", () => {
  test("placeholder, blank and bounced addresses are skipped", () => {
    assert.ok(skipReason({ email: "a@prl-placeholder.co.uk", emailBounced: false }));
    assert.ok(skipReason({ email: "", emailBounced: false }));
    assert.ok(skipReason({ email: "a@b.com", emailBounced: true }));
    assert.equal(skipReason({ email: "a@b.com", emailBounced: false }), null);
  });
});

describe("renderMessage", () => {
  test("fills {name} and makes paragraphs", () => {
    const html = renderMessage("Hi {name},\n\nLine one\nline two", { name: "Bob" });
    assert.match(html, /Hi Bob,/);
    assert.equal((html.match(/<p /g) ?? []).length, 2);
    assert.match(html, /Line one<br>line two/);
  });

  test("escapes staff-typed markup and names", () => {
    const html = renderMessage("<script>x</script> {name}", { name: "<b>Eve</b>" });
    assert.equal(html.includes("<script>"), false);
    assert.equal(html.includes("<b>"), false);
    assert.match(html, /&lt;script&gt;/);
  });
});

describe("renderSubject", () => {
  test("fills {name} and can't carry a line break into the header", () => {
    assert.equal(renderSubject("Hello {name}\r\nBcc: x", { name: "Bob" }), "Hello Bob Bcc: x");
  });
});

describe("CAMPAIGN_TEMPLATES", () => {
  test("every template's filter is one the parser accepts", () => {
    for (const t of CAMPAIGN_TEMPLATES) {
      assert.equal(parseCampaignFilter({ missing: t.missing }).missing, t.missing, t.id);
    }
  });
});
