import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeFeed, readableDetails, workflowRowsForFeed } from "@/lib/activity-feed";

const at = (iso: string) => new Date(iso);

test("merges people and automation newest first, and caps the length", () => {
  const feed = mergeFeed(
    [
      { id: "a1", action: "Document verified", details: "CSCS", userName: "Sian", userEmail: "sian@x", createdAt: at("2026-10-01T10:00:00Z") },
      { id: "a2", action: "Note added", details: "x", userName: "Helen", userEmail: null, createdAt: at("2026-09-01T10:00:00Z") },
    ],
    [{ id: "w1", workflow: "compliance-chase", action: "chase-email", outcome: "sent", detail: "1 doc(s): CSCS", createdAt: at("2026-09-15T08:00:00Z") }],
    2
  );
  assert.deepEqual(feed.map((r) => r.id), ["a1", "wf-w1"]);
  assert.equal(feed[1].action, "Automatic document reminder emailed");
  assert.equal(feed[1].automatic, true);
});

test("skipped runs and manual sends (already logged by the person) are left out", () => {
  const rows = workflowRowsForFeed([
    { id: "1", workflow: "compliance-chase", action: "chase-email", outcome: "skipped", detail: null, createdAt: at("2026-10-01T00:00:00Z") },
    { id: "2", workflow: "compliance-chase", action: "chase-email", outcome: "sent", detail: "manual by sian@x", createdAt: at("2026-10-01T00:00:00Z") },
    { id: "3", workflow: "welcome-agent", action: "welcome", outcome: "failed", detail: "bounce", createdAt: at("2026-10-01T00:00:00Z") },
  ]);
  assert.deepEqual(rows.map((r) => r.action), ["Welcome email sent — FAILED"]);
});

test("details: text stays text, JSON becomes key: value pairs", () => {
  assert.equal(readableDetails("CSCS — card.jpg"), "CSCS — card.jpg");
  assert.equal(readableDetails('{"item":"CSCS","reason":"wrong person","nested":{"a":1}}'), "item: CSCS · reason: wrong person");
  assert.equal(readableDetails("  "), null);
  assert.equal(readableDetails("{not json"), "{not json");
});
