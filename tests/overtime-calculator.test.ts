import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_OVERTIME_CONFIG,
  calculateOvertime,
  shouldAutoApprove,
  type DayEntry,
} from "@/lib/overtime-calculator";
import { calculateProfessionalHours } from "@/lib/professional-hours";

/**
 * Overtime splits a week's hours into regular and premium, which is what the
 * contractor is paid on. dayOfWeek is 0=Mon .. 6=Sun.
 */

/** Mon 8 June 2026 — an ordinary week with no bank holiday in it. */
const PLAIN_WEEK = new Date(2026, 5, 8);
/** Mon 21 Dec 2026 — Christmas Day falls on the Friday, offset 4. */
const CHRISTMAS_WEEK = new Date(2026, 11, 21);

const days = (...hours: number[]): DayEntry[] =>
  hours.map((h, i) => ({ dayOfWeek: i, hours: h, date: new Date() }));

describe("a standard week", () => {
  test("5 x 8h is all regular, no overtime", () => {
    const r = calculateOvertime(days(8, 8, 8, 8, 8), PLAIN_WEEK);
    assert.equal(r.totalRegularHours, 40);
    assert.equal(r.totalOvertimeHours, 0);
    assert.deepEqual(r.exceptions, []);
  });

  test("splits a long day at the 8h daily threshold", () => {
    const r = calculateOvertime(days(10), PLAIN_WEEK);
    assert.equal(r.totalRegularHours, 8);
    assert.equal(r.totalOvertimeHours, 2);
    assert.match(r.dailyBreakdown[0].reason ?? "", /daily limit/);
  });

  test("a short day is entirely regular", () => {
    const r = calculateOvertime(days(4), PLAIN_WEEK);
    assert.equal(r.totalRegularHours, 4);
    assert.equal(r.totalOvertimeHours, 0);
  });

  test("regular plus overtime always equals the hours submitted", () => {
    // The property that matters: the split may move, but nothing may be lost.
    for (const week of [days(8, 8, 8, 8, 8), days(10, 12, 6, 9, 8), days(0, 0, 7, 0, 0)]) {
      const submitted = week.reduce((sum, d) => sum + d.hours, 0);
      const r = calculateOvertime(week, PLAIN_WEEK);
      assert.equal(
        r.totalRegularHours + r.totalOvertimeHours,
        submitted,
        `lost hours on ${JSON.stringify(week.map((d) => d.hours))}`
      );
    }
  });
});

describe("weekend premium", () => {
  test("all Saturday and Sunday hours are overtime, however few", () => {
    const sat: DayEntry[] = [{ dayOfWeek: 5, hours: 4, date: new Date() }];
    const sun: DayEntry[] = [{ dayOfWeek: 6, hours: 4, date: new Date() }];
    for (const [label, entries] of [["Sat", sat], ["Sun", sun]] as const) {
      const r = calculateOvertime(entries, PLAIN_WEEK);
      assert.equal(r.totalRegularHours, 0, label);
      assert.equal(r.totalOvertimeHours, 4, label);
      assert.equal(r.weekendHours, 4, label);
    }
  });

  test("Friday is a weekday, not a weekend", () => {
    const r = calculateOvertime([{ dayOfWeek: 4, hours: 8, date: new Date() }], PLAIN_WEEK);
    assert.equal(r.totalRegularHours, 8);
    assert.equal(r.weekendHours, 0);
  });
});

describe("bank holiday premium", () => {
  test("hours on Christmas Day are all premium and raise an exception", () => {
    // Christmas 2026 is the Friday of this week — offset 4.
    const r = calculateOvertime([{ dayOfWeek: 4, hours: 8, date: new Date() }], CHRISTMAS_WEEK);
    assert.equal(r.bankHolidayHours, 8);
    assert.equal(r.totalOvertimeHours, 8);
    assert.equal(r.totalRegularHours, 0);
    assert.ok(r.exceptions.some((e) => /bank holiday/i.test(e)));
  });

  test("the same day in an ordinary week is plain regular time", () => {
    const r = calculateOvertime([{ dayOfWeek: 4, hours: 8, date: new Date() }], PLAIN_WEEK);
    assert.equal(r.bankHolidayHours, 0);
    assert.equal(r.totalRegularHours, 8);
  });

  test("bank holiday beats the weekday split even on a long day", () => {
    const r = calculateOvertime([{ dayOfWeek: 4, hours: 12, date: new Date() }], CHRISTMAS_WEEK);
    assert.equal(r.totalRegularHours, 0);
    assert.equal(r.totalOvertimeHours, 12);
  });
});

describe("exceptions", () => {
  test("an empty week is flagged rather than silently passed", () => {
    const r = calculateOvertime([], PLAIN_WEEK);
    assert.ok(r.exceptions.includes("Zero hours submitted"));
  });

  test("flags an excessive week over 60h", () => {
    const r = calculateOvertime(days(13, 13, 13, 13, 13), PLAIN_WEEK);
    assert.ok(r.exceptions.some((e) => /Excessive hours/.test(e)));
  });

  test("a normal week raises nothing", () => {
    assert.deepEqual(calculateOvertime(days(8, 8, 8, 8, 8), PLAIN_WEEK).exceptions, []);
  });
});

describe("the weekly threshold", () => {
  test("cannot be reached on the default config", () => {
    // Worth pinning: weekend and bank-holiday hours never count as regular, and
    // each weekday contributes at most 8 regular hours, so five weekdays cap
    // regular time at exactly 40. The weekly-overtime branch is unreachable
    // under DEFAULT_OVERTIME_CONFIG — it only exists for custom configs.
    const r = calculateOvertime(days(24, 24, 24, 24, 24), PLAIN_WEEK);
    assert.equal(r.totalRegularHours, 40);
    assert.equal(r.weeklyOvertimeHours, 0);
  });

  test("fires when the daily threshold allows regular hours past the weekly one", () => {
    const config = { ...DEFAULT_OVERTIME_CONFIG, standardDailyHours: 10, standardWeeklyHours: 40 };
    const r = calculateOvertime(days(10, 10, 10, 10, 10), PLAIN_WEEK, config);
    assert.equal(r.totalRegularHours, 40);
    assert.equal(r.weeklyOvertimeHours, 10);
    assert.equal(r.totalOvertimeHours, 10);
    assert.ok(r.exceptions.some((e) => /exceed 40h standard/.test(e)));
  });
});

describe("shouldAutoApprove", () => {
  test("never auto-approves when anything was flagged", () => {
    const r = shouldAutoApprove(40, 0, ["8h worked on bank holiday"]);
    assert.equal(r.autoApprove, false);
    assert.match(r.reason, /Flagged/);
  });

  test("auto-approves a clean standard week", () => {
    assert.equal(shouldAutoApprove(40, 0, []).autoApprove, true);
  });

  test("auto-approves minor overtime within the 2h tolerance", () => {
    assert.equal(shouldAutoApprove(42, 2, []).autoApprove, true);
  });

  test("sends real overtime for manual approval", () => {
    const r = shouldAutoApprove(48, 8, []);
    assert.equal(r.autoApprove, false);
    assert.match(r.reason, /manual approval/);
  });

  test("a zero-hour week is never auto-approved", () => {
    // calculateOvertime always flags an empty week, and a flag blocks approval.
    const week = calculateOvertime([], PLAIN_WEEK);
    const r = shouldAutoApprove(0, 0, week.exceptions);
    assert.equal(r.autoApprove, false);
  });
});

describe("calculateProfessionalHours", () => {
  test("computes a plain shift", () => {
    assert.equal(calculateProfessionalHours("08:00", "16:30"), 8.5);
  });

  test("rolls an overnight shift over midnight", () => {
    assert.equal(calculateProfessionalHours("22:00", "06:00"), 8);
  });

  test("returns null for missing or malformed input rather than 0", () => {
    // 0 would read as "worked no hours"; null means "not recorded".
    for (const bad of [null, undefined, "", "9am", "25:00", "08:60", "0800"]) {
      assert.equal(calculateProfessionalHours(bad as string, "16:00"), null, String(bad));
    }
  });

  test("treats equal start and finish as a zero-length shift", () => {
    assert.equal(calculateProfessionalHours("09:00", "09:00"), 0);
  });

  test("rounds to two decimal places", () => {
    assert.equal(calculateProfessionalHours("09:00", "09:20"), 0.33);
  });
});
