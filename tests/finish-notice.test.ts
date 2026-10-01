import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  buildFinishNoticeEmail,
  daysUntil,
  finishItems,
  finishKey,
  finishNoticeBlockReason,
  formatFinishDate,
} from "@/lib/finish-notice";

/**
 * The "you're finishing" email. It exists so a contractor isn't the last to
 * know their job ends tomorrow — so it must pick up the right dates, never
 * resend the same dates twice, and always allow a resend when a date changes.
 */

const NOW = new Date("2026-10-01T15:30:00Z");
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
const job = (over: Partial<{ status: string; endDate: Date | null; role: string; location: string | null }> = {}) => ({
  status: "Active",
  endDate: day("2026-10-02"),
  role: "Labourer",
  location: "Leeds",
  company: { name: "Acme Build" },
  ...over,
});

describe("finishItems", () => {
  test("a live job ending tomorrow is included, labelled with role, company and site", () => {
    const items = finishItems({ leavingDate: null, assignments: [job()] }, NOW);
    assert.equal(items.length, 1);
    assert.equal(items[0].label, "Labourer at Acme Build (Leeds)");
    assert.equal(items[0].date.toISOString().slice(0, 10), "2026-10-02");
  });

  test("an end date of today still counts; yesterday does not", () => {
    assert.equal(finishItems({ leavingDate: null, assignments: [job({ endDate: day("2026-10-01") })] }, NOW).length, 1);
    assert.equal(finishItems({ leavingDate: null, assignments: [job({ endDate: day("2026-09-30") })] }, NOW).length, 0);
  });

  test("finished jobs and jobs with no end date are ignored", () => {
    const items = finishItems(
      { leavingDate: null, assignments: [job({ status: "Completed" }), job({ endDate: null })] },
      NOW
    );
    assert.deepEqual(items, []);
  });

  test("an Ending job is still live and is included", () => {
    assert.equal(finishItems({ leavingDate: null, assignments: [job({ status: "Ending" })] }, NOW).length, 1);
  });

  test("leaving date is included and items come soonest first", () => {
    const items = finishItems(
      { leavingDate: day("2026-10-01"), assignments: [job({ endDate: day("2026-10-09") })] },
      NOW
    );
    assert.deepEqual(items.map((i) => i.kind), ["leaving", "assignment"]);
  });
});

describe("finishNoticeBlockReason", () => {
  const items = finishItems({ leavingDate: null, assignments: [job()] }, NOW);
  const base = { email: "worker@example.com", emailBounced: false, items, lastSentKey: null };

  test("sendable when there's a date and it hasn't been sent", () => {
    assert.equal(finishNoticeBlockReason(base), null);
  });

  test("the same dates can't be sent twice", () => {
    assert.equal(finishNoticeBlockReason({ ...base, lastSentKey: finishKey(items) }), "Already told about these dates");
  });

  test("a date brought forward can be sent again", () => {
    const earlier = finishItems({ leavingDate: null, assignments: [job({ endDate: day("2026-10-01") })] }, NOW);
    assert.equal(finishNoticeBlockReason({ ...base, items: earlier, lastSentKey: finishKey(items) }), null);
  });

  test("no dates, no email, bounced email all block", () => {
    assert.ok(finishNoticeBlockReason({ ...base, items: [] }));
    assert.ok(finishNoticeBlockReason({ ...base, email: "" }));
    assert.ok(finishNoticeBlockReason({ ...base, emailBounced: true }));
  });
});

describe("dates and email", () => {
  test("dates read as the stored calendar day, not shifted by timezone", () => {
    assert.equal(formatFinishDate(day("2026-10-02")), "Friday, 2 October 2026");
    assert.equal(daysUntil(day("2026-10-02"), NOW), 1);
    assert.equal(daysUntil(day("2026-10-01"), NOW), 0);
  });

  test("email names the job and date, and escapes typed text", () => {
    const items = finishItems({ leavingDate: null, assignments: [job({ location: "<b>Site</b>" })] }, NOW);
    const html = buildFinishNoticeEmail("Sam", items);
    assert.match(html, /Hi Sam,/);
    assert.match(html, /Friday, 2 October 2026/);
    assert.match(html, /Labourer at Acme Build/);
    assert.ok(!html.includes("<b>Site</b>"));
  });
});
