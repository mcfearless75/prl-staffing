import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  ownNotificationsWhere,
  markReadWhere,
  deleteReadWhere,
  teamGroupIds,
  openedByLabel,
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

/**
 * Deleting tidies the list (Jenni, 08-10-26). It must only ever match the
 * caller's own READ alerts: an unread one, or someone else's, is never deleted.
 */
describe("deleteReadWhere", () => {
  test("all: every one of the caller's read alerts", () => {
    const w = deleteReadWhere("u1", { all: true });
    assert.equal(w?.recipientId, "u1");
    assert.equal(w?.isRead, true);
  });

  test("ids: still limited to the caller's read alerts", () => {
    const w = deleteReadWhere("u1", { ids: ["a", "b"] }) as Record<string, unknown> | null;
    assert.equal(w?.recipientId, "u1");
    assert.equal(w?.isRead, true);
    assert.deepEqual(w?.id, { in: ["a", "b"] });
  });

  test("anything else is rejected", () => {
    for (const body of [null, {}, { ids: [] }, { ids: "a" }, { all: "yes" }]) {
      assert.equal(deleteReadWhere("u1", body), null);
    }
  });
});

/**
 * Opening a team alert clears it for everyone (Jenni, 08-10-26). Only alerts
 * with a group spread; a personal one (an @mention) must never clear anyone
 * else's.
 */
describe("teamGroupIds", () => {
  test("distinct groups of the opened alerts", () => {
    assert.deepEqual(teamGroupIds([{ groupId: "g1" }, { groupId: "g1" }, { groupId: "g2" }]), ["g1", "g2"]);
  });

  test("personal alerts (no group) never spread", () => {
    assert.deepEqual(teamGroupIds([{ groupId: null }]), []);
  });
});

describe("openedByLabel", () => {
  test("teammates see who opened it, by first name", () => {
    assert.equal(openedByLabel("Jenni Connors", "Erica South"), "Opened by Jenni");
  });

  test("nothing on the opener's own copy, or when nobody has", () => {
    assert.equal(openedByLabel("Jenni Connors", "jenni connors"), null);
    assert.equal(openedByLabel(null, "Erica South"), null);
  });
});
