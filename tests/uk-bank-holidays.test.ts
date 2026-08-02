import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  getBankHolidayName,
  getBankHolidaysInWeek,
  getUKBankHolidays,
  isUKBankHoliday,
} from "@/lib/uk-bank-holidays";

/**
 * UK bank holidays (England & Wales) drive the overtime premium, so a wrong or
 * missing date is a pay error.
 *
 * Expected dates below are the real published ones, not values read back out of
 * this module — checking the code against itself would prove nothing.
 */

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const datesFor = (year: number) => getUKBankHolidays(year).map(iso).sort();

describe("published dates", () => {
  test("2026", () => {
    assert.deepEqual(datesFor(2026), [
      "2026-01-01", // New Year's Day, a Thursday
      "2026-04-03", // Good Friday
      "2026-04-06", // Easter Monday
      "2026-05-04", // Early May
      "2026-05-25", // Spring
      "2026-08-31", // Summer
      "2026-12-25", // Christmas Day, a Friday
      "2026-12-28", // Boxing Day (Sat) substitute
    ]);
  });

  test("2027", () => {
    assert.deepEqual(datesFor(2027), [
      "2027-01-01",
      "2027-03-26", // Good Friday — Easter is 28 March
      "2027-03-29",
      "2027-05-03",
      "2027-05-31",
      "2027-08-30",
      "2027-12-27", // Christmas (Sat) substitute
      "2027-12-28", // Boxing Day (Sun) substitute
    ]);
  });
});

describe("Christmas falling on a Sunday", () => {
  // The bug this suite was written to catch. Boxing Day already owns Monday the
  // 26th, so the Christmas substitute must move to TUESDAY the 27th. The old
  // code put both on the 26th and left the 27th undetected, so anyone working
  // it received no bank-holiday premium.
  for (const year of [2022, 2033]) {
    test(`${year}: the 26th and 27th are BOTH bank holidays`, () => {
      assert.ok(isUKBankHoliday(new Date(year, 11, 26)), "26 Dec should be a bank holiday");
      assert.ok(isUKBankHoliday(new Date(year, 11, 27)), "27 Dec should be a bank holiday");
    });

    test(`${year}: Christmas Day itself is not double-counted`, () => {
      assert.equal(new Set(datesFor(year)).size, 8, "all 8 holidays must be distinct days");
    });
  }
});

describe("Christmas falling on a Saturday", () => {
  test("2027: Christmas moves to Monday 27th and Boxing Day to Tuesday 28th", () => {
    assert.ok(isUKBankHoliday(new Date(2027, 11, 27)));
    assert.ok(isUKBankHoliday(new Date(2027, 11, 28)));
    assert.equal(isUKBankHoliday(new Date(2027, 11, 25)), false, "the Saturday itself is not");
  });
});

describe("every year", () => {
  test("yields exactly 8 distinct bank holidays, 2020-2040", () => {
    for (let year = 2020; year <= 2040; year++) {
      const dates = datesFor(year);
      assert.equal(dates.length, 8, `${year} should have 8 entries`);
      assert.equal(new Set(dates).size, 8, `${year} has a duplicated date: ${dates.join()}`);
    }
  });

  test("never lands a substitute on a weekend", () => {
    // Substitutes exist precisely to move off Sat/Sun. One landing on a weekend
    // means the substitution rule failed.
    for (let year = 2020; year <= 2040; year++) {
      for (const d of getUKBankHolidays(year)) {
        const day = d.getDay();
        if (d.getMonth() === 11 || (d.getMonth() === 0 && d.getDate() <= 3)) {
          assert.ok(day !== 0 && day !== 6, `${iso(d)} is a weekend bank holiday`);
        }
      }
    }
  });

  test("keeps every holiday inside its own calendar year", () => {
    for (let year = 2020; year <= 2040; year++) {
      for (const d of getUKBankHolidays(year)) {
        assert.equal(d.getFullYear(), year, `${iso(d)} escaped ${year}`);
      }
    }
  });
});

describe("isUKBankHoliday", () => {
  test("is false for an ordinary working day", () => {
    assert.equal(isUKBankHoliday(new Date(2026, 5, 10)), false); // Wed 10 June 2026
  });

  test("ignores the time of day", () => {
    const morning = new Date(2026, 11, 25, 0, 0, 0);
    const evening = new Date(2026, 11, 25, 23, 59, 59);
    assert.equal(isUKBankHoliday(morning), true);
    assert.equal(isUKBankHoliday(evening), true);
  });
});

describe("getBankHolidayName", () => {
  test("names the fixed and Easter-derived holidays", () => {
    assert.equal(getBankHolidayName(new Date(2026, 0, 1)), "New Year's Day");
    assert.equal(getBankHolidayName(new Date(2026, 3, 3)), "Good Friday");
    assert.equal(getBankHolidayName(new Date(2026, 3, 6)), "Easter Monday");
    assert.equal(getBankHolidayName(new Date(2026, 7, 31)), "Summer Bank Holiday");
  });

  test("returns null for a normal day", () => {
    assert.equal(getBankHolidayName(new Date(2026, 5, 10)), null);
  });

  test("agrees with isUKBankHoliday across a whole year", () => {
    const d = new Date(2026, 0, 1);
    while (d.getFullYear() === 2026) {
      assert.equal(
        getBankHolidayName(d) !== null,
        isUKBankHoliday(d),
        `disagreement on ${iso(d)}`
      );
      d.setDate(d.getDate() + 1);
    }
  });
});

describe("getBankHolidaysInWeek", () => {
  test("finds Christmas week 2026 by day offset from the Monday", () => {
    // Week starting Mon 21 Dec 2026: Christmas is Friday (offset 4).
    const found = getBankHolidaysInWeek(new Date(2026, 11, 21));
    assert.deepEqual(found, [{ dayOfWeek: 4, name: "Christmas Day" }]);
  });

  test("returns nothing for a week with no bank holiday", () => {
    assert.deepEqual(getBankHolidaysInWeek(new Date(2026, 5, 8)), []);
  });

  test("finds both holidays when a week contains two", () => {
    // Week starting Mon 28 Dec 2026 contains the Boxing Day substitute (Mon).
    const found = getBankHolidaysInWeek(new Date(2026, 11, 28));
    assert.ok(found.some((f) => f.dayOfWeek === 0 && f.name === "Boxing Day"));
  });
});
