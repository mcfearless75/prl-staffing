import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ownNotificationsWhere,
  markReadWhere,
  safeNotificationHref,
  badgeLabel,
  STAFF_RECIPIENT_TYPE,
} from "@/lib/staff-notifications";

test("every bell query is scoped to the caller", () => {
  const cases = [
    ownNotificationsWhere("u1"),
    ownNotificationsWhere("u1", { unreadOnly: true }),
    markReadWhere("u1", { all: true }),
    markReadWhere("u1", { ids: ["n1", "n2"] }),
  ];
  for (const where of cases) {
    assert.ok(where, "expected a where clause");
    assert.equal(where.recipientId, "u1");
    assert.equal(where.recipientType, STAFF_RECIPIENT_TYPE);
  }
});

test("an empty user id is refused rather than matching everyone", () => {
  assert.throws(() => ownNotificationsWhere(""));
});

test("mark-read only touches unread alerts and the ids given", () => {
  assert.deepEqual(markReadWhere("u1", { ids: ["n1"] }), {
    recipientType: STAFF_RECIPIENT_TYPE,
    recipientId: "u1",
    isRead: false,
    id: { in: ["n1"] },
  });
  assert.equal(markReadWhere("u1", { all: true })?.isRead, false);
});

test("mark-read rejects junk bodies", () => {
  for (const body of [null, "all", {}, { all: "yes" }, { ids: [] }, { ids: "n1" }, { ids: [1, 2] }]) {
    assert.equal(markReadWhere("u1", body), null, JSON.stringify(body));
  }
  assert.equal(markReadWhere("u1", { ids: Array.from({ length: 101 }, (_, i) => `n${i}`) }), null);
});

test("only in-app links are followed", () => {
  assert.equal(safeNotificationHref("/contractors/abc?tab=Notes"), "/contractors/abc?tab=Notes");
  for (const bad of ["https://evil.example", "//evil.example", "/\\evil", "javascript:alert(1)", "", null, undefined]) {
    assert.equal(safeNotificationHref(bad), null, String(bad));
  }
});

test("badge label hides at zero and caps at 99+", () => {
  assert.equal(badgeLabel(0), null);
  assert.equal(badgeLabel(-1), null);
  assert.equal(badgeLabel(3), "3");
  assert.equal(badgeLabel(100), "99+");
});
