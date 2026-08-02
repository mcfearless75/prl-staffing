import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { parseDate } from "@/lib/parse-date";

/**
 * Public-form date parsing.
 *
 * This turns applicant-typed text into the DOB, passport expiry and visa expiry
 * stored against a contractor — dates that later drive right-to-work compliance.
 * The failure it exists to prevent is silent: `new Date("03/04/2026")` is a
 * valid Date in Node, just the WRONG one, because the runtime reads it as US
 * month-first. An applicant's 3 April becomes 4 March and nothing errors.
 *
 * Asserted against the calendar, not against the parser's own output.
 */

/** The exact UTC instant a date-only value should land on. */
function utc(y: number, m: number, d: number): string {
  return new Date(Date.UTC(y, m - 1, d)).toISOString();
}

describe("UK DD/MM/YYYY", () => {
  test("reads day first, not month first", () => {
    // The whole reason this function exists. Native Date says 4 March.
    assert.equal(parseDate("03/04/2026")?.toISOString(), utc(2026, 4, 3));
    assert.equal(parseDate("04/03/2026")?.toISOString(), utc(2026, 3, 4));
  });

  test("parses a day past the 12th, which native Date rejects outright", () => {
    // new Date("31/12/2026") is Invalid Date.
    assert.equal(parseDate("31/12/2026")?.toISOString(), utc(2026, 12, 31));
    assert.equal(parseDate("25/12/2025")?.toISOString(), utc(2025, 12, 25));
  });

  test("accepts the separators people actually type", () => {
    for (const raw of ["03/04/2026", "03-04-2026", "03.04.2026"]) {
      assert.equal(parseDate(raw)?.toISOString(), utc(2026, 4, 3), raw);
    }
  });

  test("accepts unpadded day and month", () => {
    assert.equal(parseDate("3/4/2026")?.toISOString(), utc(2026, 4, 3));
    assert.equal(parseDate("3/4/2026")?.toISOString(), parseDate("03/04/2026")?.toISOString());
  });

  test("surrounding whitespace does not change the answer", () => {
    assert.equal(parseDate("  03/04/2026  ")?.toISOString(), utc(2026, 4, 3));
  });
});

describe("ISO from <input type=\"date\">", () => {
  test("parses the browser's own format", () => {
    assert.equal(parseDate("2026-04-03")?.toISOString(), utc(2026, 4, 3));
  });

  test("agrees with the UK form for the same day", () => {
    assert.equal(parseDate("2026-04-03")?.getTime(), parseDate("03/04/2026")?.getTime());
  });
});

describe("dates that do not exist", () => {
  test("an impossible day is rejected, not rolled over into the next month", () => {
    // Date.UTC(2026, 1, 31) is 3 March. Storing that as a passport expiry would
    // be a wrong date that looks entirely plausible.
    for (const raw of ["31/02/2026", "30/02/2026", "32/01/2026", "31/04/2026", "31/06/2026"]) {
      assert.equal(parseDate(raw), null, raw);
    }
  });

  test("an impossible month is rejected", () => {
    assert.equal(parseDate("01/13/2026"), null);
    assert.equal(parseDate("01/00/2026"), null);
  });

  test("day zero is rejected rather than becoming the previous month's last day", () => {
    assert.equal(parseDate("00/01/2026"), null);
  });

  test("29 February is judged against the actual leap year", () => {
    // Ground truth: 2024 and 2028 are leap years, 2026 and 1900 are not.
    assert.equal(parseDate("29/02/2024")?.toISOString(), utc(2024, 2, 29));
    assert.equal(parseDate("29/02/2028")?.toISOString(), utc(2028, 2, 29));
    assert.equal(parseDate("29/02/2026"), null);
    assert.equal(parseDate("29/02/1900"), null);
  });

  test("the same rejection applies to ISO input", () => {
    assert.equal(parseDate("2026-02-31"), null);
    assert.equal(parseDate("2026-13-01"), null);
  });
});

describe("absent and unusable input", () => {
  test("returns null rather than throwing, so one bad field cannot lose an application", () => {
    for (const value of [null, undefined, "", "   ", 42, {}, [], true, new Date()]) {
      assert.equal(parseDate(value), null, JSON.stringify(value) ?? String(value));
    }
  });

  test("unparseable text is null, not an Invalid Date", () => {
    for (const raw of ["not a date", "N/A", "dd/mm/yyyy", "--"]) {
      assert.equal(parseDate(raw), null, raw);
    }
  });

  test("a half-typed date is rejected, not guessed at", () => {
    // Found by writing this test: "03/04" with no year used to fall through to
    // native Date, which returned 4 March 2001 — US month-first, with a century
    // invented, and no error anywhere. That is a wrong DOB that looks real.
    for (const raw of ["03/04", "3-4", "2026", "12", "04.05"]) {
      assert.equal(parseDate(raw), null, raw);
    }
  });
});

describe("what gets stored", () => {
  test("a date-only value lands on UTC midnight", () => {
    // Anything else drifts a day depending on the server's timezone, which is
    // how a DOB becomes the day before.
    const parsed = parseDate("03/04/2026");
    assert.ok(parsed);
    assert.equal(parsed.getUTCHours(), 0);
    assert.equal(parsed.getUTCMinutes(), 0);
    assert.equal(parsed.toISOString(), "2026-04-03T00:00:00.000Z");
  });

  test("a date in BST still lands on UTC midnight, not 23:00 the day before", () => {
    // 3 August 2026 is inside British Summer Time.
    assert.equal(parseDate("03/08/2026")?.toISOString(), "2026-08-03T00:00:00.000Z");
  });

  test("DOCUMENTED: anything else falls through to native Date", () => {
    // Long-form text still parses, and its timezone handling is the runtime's,
    // not ours. Accepted deliberately — the alternative is discarding a date the
    // applicant clearly meant.
    assert.ok(parseDate("April 3, 2026") instanceof Date);
    assert.equal(parseDate("April 3, 2026")?.getFullYear(), 2026);
  });

  test("a complete year-first numeric date still parses", () => {
    // The incomplete-date guard must not swallow this: it has all three parts,
    // so there is nothing to guess.
    assert.equal(parseDate("2026/04/03")?.getFullYear(), 2026);
    assert.equal(parseDate("2026/04/03")?.getMonth(), 3);
    assert.equal(parseDate("2026/04/03")?.getDate(), 3);
  });
});
