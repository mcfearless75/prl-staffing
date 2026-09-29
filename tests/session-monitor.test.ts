import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  canViewSessions,
  describeDevice,
  formatDuration,
  IDLE_GAP_MS,
  ONLINE_WINDOW_MS,
  sessionDurationMs,
  sessionStatus,
  startOfUkDay,
  reconstructSessions,
} from "@/lib/session-monitor";

/**
 * The session monitor (/sessions). The access gate matters most: the page
 * shows every user's login times, devices and IPs, and it is meant for
 * infotech@ alone — not "any admin".
 */

describe("canViewSessions", () => {
  test("infotech@ can, whatever the casing or stray whitespace", () => {
    assert.equal(canViewSessions("infotech@prlsitesolutions.co.uk"), true);
    assert.equal(canViewSessions(" InfoTech@PRLSiteSolutions.co.uk "), true);
  });
  test("anyone else cannot", () => {
    assert.equal(canViewSessions("jen@prlsitesolutions.co.uk"), false);
    assert.equal(canViewSessions("infotech@prlsitesolutions.co.uk.evil.com"), false);
    assert.equal(canViewSessions("xinfotech@prlsitesolutions.co.uk"), false);
    assert.equal(canViewSessions(""), false);
    assert.equal(canViewSessions(null), false);
    assert.equal(canViewSessions(undefined), false);
  });
});

describe("sessionStatus", () => {
  const now = new Date("2026-09-29T12:00:00Z");
  const start = new Date("2026-09-29T09:00:00Z");
  const seen = (msAgo: number) => new Date(now.getTime() - msAgo);

  test("signed out is ended, however recent", () => {
    assert.equal(sessionStatus({ startedAt: start, lastSeenAt: now, endedAt: now }, now), "ended");
  });
  test("online up to the window, away after it, ended after the idle gap", () => {
    assert.equal(sessionStatus({ startedAt: start, lastSeenAt: seen(ONLINE_WINDOW_MS), endedAt: null }, now), "online");
    assert.equal(sessionStatus({ startedAt: start, lastSeenAt: seen(ONLINE_WINDOW_MS + 1), endedAt: null }, now), "away");
    assert.equal(sessionStatus({ startedAt: start, lastSeenAt: seen(IDLE_GAP_MS), endedAt: null }, now), "away");
    assert.equal(sessionStatus({ startedAt: start, lastSeenAt: seen(IDLE_GAP_MS + 1), endedAt: null }, now), "ended");
  });
  test("the online window survives one missed heartbeat", () => {
    assert.ok(ONLINE_WINDOW_MS > 2 * 60_000);
    assert.ok(ONLINE_WINDOW_MS < IDLE_GAP_MS);
  });
});

describe("sessionDurationMs", () => {
  const start = new Date("2026-09-29T09:00:00Z");
  test("runs to sign-out when there is one, else to the last heartbeat", () => {
    const last = new Date("2026-09-29T10:00:00Z");
    const ended = new Date("2026-09-29T10:05:00Z");
    assert.equal(sessionDurationMs({ startedAt: start, lastSeenAt: last, endedAt: null }), 3_600_000);
    assert.equal(sessionDurationMs({ startedAt: start, lastSeenAt: ended, endedAt: ended }), 3_900_000);
  });
  test("never negative", () => {
    assert.equal(sessionDurationMs({ startedAt: start, lastSeenAt: new Date("2026-09-29T08:00:00Z"), endedAt: null }), 0);
  });
});

describe("formatDuration", () => {
  test("formats", () => {
    assert.equal(formatDuration(0), "<1m");
    assert.equal(formatDuration(59_999), "<1m");
    assert.equal(formatDuration(5 * 60_000), "5m");
    assert.equal(formatDuration(65 * 60_000), "1h 05m");
    assert.equal(formatDuration(26 * 3_600_000), "26h 00m");
  });
});

describe("describeDevice", () => {
  test("Edge is not mistaken for Chrome, nor Chrome for Safari", () => {
    assert.equal(
      describeDevice("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0"),
      "Edge on Windows",
    );
    assert.equal(
      describeDevice("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"),
      "Chrome on Windows",
    );
  });
  test("iPhone Safari and Android Chrome", () => {
    assert.equal(
      describeDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"),
      "Safari on iPhone",
    );
    assert.equal(
      describeDevice("Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36"),
      "Chrome on Android",
    );
  });
  test("missing user agent", () => {
    assert.equal(describeDevice(null), "Unknown device");
  });
});

describe("startOfUkDay", () => {
  test("BST: 00:30 UK on 29 Sep is 23:30 UTC the day before", () => {
    const now = new Date("2026-09-29T14:15:30.250Z"); // 15:15:30 BST
    assert.equal(startOfUkDay(now).toISOString(), "2026-09-28T23:00:00.000Z");
  });
  test("GMT: midnight UK equals midnight UTC", () => {
    const now = new Date("2026-12-10T09:45:00Z");
    assert.equal(startOfUkDay(now).toISOString(), "2026-12-10T00:00:00.000Z");
  });
  test("just after UK midnight in BST stays on the new day", () => {
    const now = new Date("2026-09-28T23:05:00Z"); // 00:05 BST on the 29th
    assert.equal(startOfUkDay(now).toISOString(), "2026-09-28T23:00:00.000Z");
  });
});

describe("reconstructSessions", () => {
  const t = (hhmm: string) => new Date(`2026-09-28T${hhmm}:00Z`);
  const ev = (email: string, hhmm: string, action = "Updated Contractor") =>
    ({ email, name: null, action, at: t(hhmm), ipAddress: null });

  test("splits one person's day at gaps longer than 30 minutes", () => {
    const s = reconstructSessions([
      ev("a@x.com", "09:00", "Staff Login"), ev("a@x.com", "09:20"), ev("a@x.com", "09:50"),
      ev("a@x.com", "10:21"), // 31 min later → new session
    ]);
    assert.equal(s.length, 2);
    assert.equal(s[0].startedAt.toISOString(), t("09:00").toISOString());
    assert.equal(s[0].lastSeenAt.toISOString(), t("09:50").toISOString());
    assert.equal(s[0].actions, 3);
    assert.equal(s[0].signedIn, true);
    assert.equal(s[1].signedIn, false);
  });

  test("keeps people apart even when interleaved, and ignores email casing", () => {
    const s = reconstructSessions([ev("a@x.com", "09:00"), ev("B@x.com", "09:05"), ev("b@x.com", "09:10"), ev("a@x.com", "09:15")]);
    assert.equal(s.length, 2);
    assert.deepEqual(s.map((x) => [x.email, x.actions]), [["a@x.com", 2], ["b@x.com", 2]]);
  });

  test("failed and blocked logins are not sessions", () => {
    const s = reconstructSessions([
      ev("a@x.com", "09:00", "Staff Login Failed — Wrong Password"),
      ev("a@x.com", "09:01", "Contractor Login Blocked — Account Locked"),
    ]);
    assert.equal(s.length, 0);
  });
});
