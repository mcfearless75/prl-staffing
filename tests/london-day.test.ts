import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { addDaysToKey, londonDayBounds, londonDayKey, parseDayKey } from "@/lib/london-day";

/**
 * "Today's Starters" counts assignments whose start date falls on today in UK
 * time. The server runs in UTC, so through BST a server-local midnight would
 * put the 23:00–00:00 UTC hour on the wrong day. Expected instants below are
 * worked out by hand from the published clock-change dates, not read back out
 * of the module.
 */

describe("londonDayBounds", () => {
  test("GMT day: midnight to midnight UTC", () => {
    const { start, end } = londonDayBounds("2026-01-15");
    assert.equal(start.toISOString(), "2026-01-15T00:00:00.000Z");
    assert.equal(end.toISOString(), "2026-01-16T00:00:00.000Z");
  });

  test("BST day: starts at 23:00 UTC the previous evening", () => {
    const { start, end } = londonDayBounds("2026-10-06");
    assert.equal(start.toISOString(), "2026-10-05T23:00:00.000Z");
    assert.equal(end.toISOString(), "2026-10-06T23:00:00.000Z");
  });

  test("clocks go forward (Sun 29 Mar 2026) is a 23-hour day", () => {
    const { start, end } = londonDayBounds("2026-03-29");
    assert.equal(start.toISOString(), "2026-03-29T00:00:00.000Z");
    assert.equal(end.toISOString(), "2026-03-29T23:00:00.000Z");
  });

  test("clocks go back (Sun 25 Oct 2026) is a 25-hour day", () => {
    const { start, end } = londonDayBounds("2026-10-25");
    assert.equal(start.toISOString(), "2026-10-24T23:00:00.000Z");
    assert.equal(end.toISOString(), "2026-10-26T00:00:00.000Z");
  });

  test("a date-only start date (stored as UTC midnight) lands on its own day in BST", () => {
    // new Date("2026-10-06") is how the assignment form stores a date.
    const stored = new Date("2026-10-06");
    const { start, end } = londonDayBounds("2026-10-06");
    assert.ok(stored >= start && stored < end);
    const next = londonDayBounds("2026-10-07");
    assert.ok(!(stored >= next.start && stored < next.end));
  });
});

describe("londonDayKey", () => {
  test("23:30 UTC in BST is already tomorrow in London", () => {
    assert.equal(londonDayKey(new Date("2026-07-01T23:30:00Z")), "2026-07-02");
  });
  test("23:30 UTC in GMT is still today", () => {
    assert.equal(londonDayKey(new Date("2026-12-01T23:30:00Z")), "2026-12-01");
  });
});

describe("parseDayKey / addDaysToKey", () => {
  test("accepts real dates, rejects junk and impossible dates", () => {
    assert.equal(parseDayKey("2026-10-06"), "2026-10-06");
    assert.equal(parseDayKey("2026-02-30"), null);
    assert.equal(parseDayKey("06/10/2026"), null);
    assert.equal(parseDayKey(""), null);
    assert.equal(parseDayKey(undefined), null);
  });
  test("crosses month and year ends", () => {
    assert.equal(addDaysToKey("2026-10-31", 1), "2026-11-01");
    assert.equal(addDaysToKey("2027-01-01", -1), "2026-12-31");
  });
});
