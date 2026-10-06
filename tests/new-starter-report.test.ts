import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, StandardFonts } from "pdf-lib";

import {
  MAX_REPORT_RECIPIENTS,
  canRunNewStarterReport,
  defaultPayrollRecipients,
  describeFilters,
  filtersToQuery,
  formatNiNumber,
  parseNewStarterFilters,
  parseRecipients,
  roleMatches,
  shapeNewStarterRows,
  toSearchParams,
  type NewStarterSource,
} from "@/lib/reports/new-starter-report";
import { COLUMN_WIDTHS, buildNewStarterPdf, toWinAnsi, wrapText } from "@/lib/reports/new-starter-pdf";

/**
 * New Starter Report — the list sent to the payroll provider with NI numbers.
 *
 * The rules pinned here: a blank TO means today in UK time (not server UTC),
 * the role filter goes through the role normaliser so "Joiner Nights" is a
 * Joiner, rows are ordered by the London start day, and long PDF cells wrap
 * inside their column instead of overprinting the next one.
 */

const q = (s: string) => new URLSearchParams(s);

describe("parseNewStarterFilters", () => {
  test("FROM is required", () => {
    const r = parseNewStarterFilters(q("to=2026-10-06"));
    assert.equal(r.ok, false);
  });

  test("blank TO defaults to today's London date, not server UTC", () => {
    // 23:30 UTC on 5 Oct is 00:30 BST on 6 Oct.
    const r = parseNewStarterFilters(q("from=2026-10-01&to="), new Date("2026-10-05T23:30:00Z"));
    assert.ok(r.ok);
    assert.equal(r.filters.to, "2026-10-06");
    assert.equal(r.filters.toDefaulted, true);
  });

  test("an explicit TO is kept and not marked defaulted", () => {
    const r = parseNewStarterFilters(q("from=2026-10-01&to=2026-10-31"), new Date("2026-10-05T12:00:00Z"));
    assert.ok(r.ok);
    assert.equal(r.filters.to, "2026-10-31");
    assert.equal(r.filters.toDefaulted, false);
  });

  test("rejects impossible dates and reversed ranges", () => {
    assert.equal(parseNewStarterFilters(q("from=2026-02-30")).ok, false);
    assert.equal(parseNewStarterFilters(q("from=2026-10-10&to=2026-10-01")).ok, false);
  });

  test("a single day (FROM = TO) is allowed", () => {
    assert.equal(parseNewStarterFilters(q("from=2026-10-06&to=2026-10-06")).ok, true);
  });

  test("a future FROM with blank TO is an error, not an empty report", () => {
    const r = parseNewStarterFilters(q("from=2026-12-01"), new Date("2026-10-06T12:00:00Z"));
    assert.equal(r.ok, false);
  });

  test("ranges over a year are refused", () => {
    assert.equal(parseNewStarterFilters(q("from=2025-01-01&to=2026-01-01")).ok, true); // 366 days
    assert.equal(parseNewStarterFilters(q("from=2025-01-01&to=2026-01-02")).ok, false);
  });

  test("repeated company/role params are collected, trimmed and de-duplicated", () => {
    const r = parseNewStarterFilters(q("from=2026-10-01&to=2026-10-02&company=a&company=b&company=a&role=Joiner&role=%20&role=Labourer"));
    assert.ok(r.ok);
    assert.deepEqual(r.filters.companyIds, ["a", "b"]);
    assert.deepEqual(r.filters.roles, ["Joiner", "Labourer"]);
  });

  test("a page searchParams record round-trips through toSearchParams and filtersToQuery", () => {
    const params = toSearchParams({ from: "2026-10-01", to: "", company: ["c1", "c2"], role: "Joiner", x: undefined });
    const first = parseNewStarterFilters(params, new Date("2026-10-06T12:00:00Z"));
    assert.ok(first.ok);
    const again = parseNewStarterFilters(q(filtersToQuery(first.filters)), new Date("2026-10-06T12:00:00Z"));
    assert.deepEqual(again, first);
  });
});

describe("roleMatches", () => {
  test("no roles selected matches everyone, including the un-roled", () => {
    assert.equal(roleMatches([], "", null), true);
  });

  test("shift suffix variants match their canonical role", () => {
    assert.equal(roleMatches(["Joiner"], "Joiner Nights", null), true);
    assert.equal(roleMatches(["Labourer"], "labourer  days", null), true);
  });

  test("a blank assignment role falls back to the job title", () => {
    assert.equal(roleMatches(["Joiner"], "", "Joiner"), true);
  });

  test("a different role does not match, and an unknown role never matches a filter", () => {
    assert.equal(roleMatches(["Joiner"], "Labourer", "Joiner"), false);
    assert.equal(roleMatches(["Joiner"], "", ""), false);
  });
});

type SourceOverrides = Partial<Omit<NewStarterSource, "contractor">> & {
  contractor?: Partial<NewStarterSource["contractor"]>;
};

function source(overrides: SourceOverrides = {}): NewStarterSource {
  return {
    assignmentId: overrides.assignmentId ?? "a1",
    startDate: overrides.startDate ?? new Date("2026-10-06T08:00:00Z"),
    role: overrides.role ?? "Joiner",
    companyName: overrides.companyName ?? "Acme Build",
    contractor: {
      id: "c1",
      firstName: "Robert",
      lastName: "Smith",
      phone: "07700 900123",
      email: "rob@example.com",
      niNumber: "ab 12 34 56 c",
      jobTitle: null,
      ...overrides.contractor,
    },
  };
}

describe("shapeNewStarterRows", () => {
  test("start date is the London calendar day, not the UTC one", () => {
    // 23:30 UTC on 5 Oct is 6 Oct in BST.
    const [row] = shapeNewStarterRows([source({ startDate: new Date("2026-10-05T23:30:00Z") })]);
    assert.equal(row.startDate, "06/10/2026");
  });

  test("NI number is the real value in compact upper case", () => {
    assert.equal(formatNiNumber(" ab 12 34 56 c "), "AB123456C");
    assert.equal(shapeNewStarterRows([source()])[0].niNumber, "AB123456C");
    assert.equal(formatNiNumber(null), "");
  });

  test("invented placeholder emails are blanked, real ones kept", () => {
    const [placeholder] = shapeNewStarterRows([source({ contractor: { email: "rob.smith@prl-placeholder.co.uk" } })]);
    assert.equal(placeholder.email, "");
    assert.equal(shapeNewStarterRows([source()])[0].email, "rob@example.com");
  });

  test("blank assignment role shows the job title", () => {
    const [row] = shapeNewStarterRows([source({ role: "", contractor: { jobTitle: "Labourer" } })]);
    assert.equal(row.role, "Labourer");
  });

  test("ordered by start day, then name", () => {
    const rows = shapeNewStarterRows([
      source({ assignmentId: "late", startDate: new Date("2026-10-08T08:00:00Z"), contractor: { firstName: "Aaron" } }),
      source({ assignmentId: "zed", startDate: new Date("2026-10-06T08:00:00Z"), contractor: { firstName: "Zed" } }),
      source({ assignmentId: "amy", startDate: new Date("2026-10-06T15:00:00Z"), contractor: { firstName: "Amy" } }),
    ]);
    assert.deepEqual(rows.map((r) => r.assignmentId), ["amy", "zed", "late"]);
  });
});

describe("describeFilters", () => {
  test("names companies and roles, or says all", () => {
    const r = parseNewStarterFilters(q("from=2026-10-01&to=2026-10-06&company=c1&role=Joiner"));
    assert.ok(r.ok);
    const text = describeFilters(r.filters, new Map([["c1", "Acme Build"]]));
    assert.match(text, /01\/10\/2026 to 06\/10\/2026/);
    assert.match(text, /Companies: Acme Build/);
    assert.match(text, /Roles: Joiner/);
    const all = parseNewStarterFilters(q("from=2026-10-01&to=2026-10-06"));
    assert.ok(all.ok);
    assert.match(describeFilters(all.filters, new Map()), /Companies: all · Roles: all/);
  });
});

describe("access", () => {
  test("admin and manager staff only", () => {
    assert.equal(canRunNewStarterReport({ userType: "staff", role: "admin" }), true);
    assert.equal(canRunNewStarterReport({ userType: "staff", role: "manager" }), true);
    assert.equal(canRunNewStarterReport({ userType: "staff", role: "recruiter" }), false);
    assert.equal(canRunNewStarterReport({ userType: "contractor", role: "admin" }), false);
    assert.equal(canRunNewStarterReport(undefined), false);
  });
});

describe("parseRecipients", () => {
  test("splits on commas and semicolons, trims and de-duplicates case-insensitively", () => {
    const r = parseRecipients(" a@x.com; B@y.co.uk , a@X.com ");
    assert.ok(r.ok);
    assert.deepEqual(r.recipients, ["a@x.com", "B@y.co.uk"]);
  });

  test("rejects blanks, malformed addresses and placeholders", () => {
    assert.equal(parseRecipients("").ok, false);
    assert.equal(parseRecipients("not-an-email").ok, false);
    assert.equal(parseRecipients("a@x.com, b@").ok, false);
    assert.equal(parseRecipients("Name <a@x.com>").ok, false);
    assert.equal(parseRecipients("x@prl-placeholder.co.uk").ok, false);
  });

  test("caps the number of recipients", () => {
    const many = Array.from({ length: MAX_REPORT_RECIPIENTS + 1 }, (_, i) => `p${i}@x.com`).join(",");
    assert.equal(parseRecipients(many).ok, false);
  });

  test("default recipients come from the env list, else blank", () => {
    assert.equal(defaultPayrollRecipients(" a@x.com ,b@y.com,"), "a@x.com, b@y.com");
    assert.equal(defaultPayrollRecipients(undefined), "");
  });
});

describe("PDF text layout", () => {
  // 5pt per character: easy to reason about by hand.
  const measure = (t: string) => t.length * 5;

  test("words wrap at the column width", () => {
    assert.deepEqual(wrapText("aaa bbb ccc", 40, measure), ["aaa bbb", "ccc"]);
  });

  test("an over-long email is broken inside the column, never left overflowing", () => {
    const lines = wrapText("averyveryverylongname@averylongdomain.co.uk", 50, measure, 10);
    assert.ok(lines.length > 1);
    for (const l of lines) assert.ok(measure(l) <= 50, `"${l}" overflows`);
    assert.equal(lines.join(""), "averyveryverylongname@averylongdomain.co.uk");
  });

  test("more than the line cap is truncated with an ellipsis that still fits", () => {
    // Each word exactly fills the line, so the ellipsis forces a trim.
    const lines = wrapText("abcd efgh ijkl", 20, measure, 2);
    assert.deepEqual(lines, ["abcd", "efg…"]);
    assert.ok(measure(lines[1]) <= 20);
  });

  test("characters outside WinAnsi are made safe instead of crashing the PDF", () => {
    const supported = new Set([..."Lodz?eaZolc "].map((c) => c.codePointAt(0)!));
    assert.equal(toWinAnsi("Łódź", supported), "?odz");
    assert.equal(toWinAnsi("Zoë", supported), "Zoe");
  });

  test("column widths fill the landscape A4 printable width exactly", () => {
    assert.equal(COLUMN_WIDTHS.reduce((a, b) => a + b, 0), 842 - 36 * 2);
  });

  test("builds a landscape multi-page PDF with awkward names and long emails", async () => {
    const rows = shapeNewStarterRows(
      Array.from({ length: 80 }, (_, i) =>
        source({
          assignmentId: `a${i}`,
          contractor: { firstName: "Łukasz 😀", lastName: `Wójcik-${i}`, email: `a.really.long.email.address.${i}@some-subcontractor-domain.co.uk` },
        })
      )
    );
    const bytes = await buildNewStarterPdf(rows, {
      filterSummary: "Start dates 01/10/2026 to 06/10/2026 · Companies: all · Roles: all",
      generatedAt: new Date("2026-10-06T09:00:00Z"),
      generatedBy: "Jenni",
    });
    const doc = await PDFDocument.load(bytes);
    assert.ok(doc.getPageCount() > 1);
    const { width, height } = doc.getPage(0).getSize();
    assert.ok(width > height, "landscape");
  });

  test("the widest test email fits its column at the real font", async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const measureReal = (t: string) => font.widthOfTextAtSize(t, 8);
    const emailCol = COLUMN_WIDTHS[2] - 8;
    for (const l of wrapText("a.really.long.email.address.79@some-subcontractor-domain.co.uk", emailCol, measureReal)) {
      assert.ok(measureReal(l) <= emailCol);
    }
  });
});
