/**
 * One CSV cell, safe to open in Excel.
 *
 * Quoting handles commas, quotes and line breaks. The formula guard matters
 * more than it looks: names, emails and job titles arrive from PUBLIC forms,
 * and a cell beginning `=`, `+`, `-` or `@` is executed by Excel as a formula
 * when the office opens the export. Prefixing an apostrophe makes Excel show
 * it as plain text (OWASP's recommended mitigation for CSV injection).
 */
export function csvCell(value: string | null | undefined): string {
  let v = value ?? "";
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Header + rows joined with CRLF, with a BOM so Excel reads accented names as UTF-8. */
export function toCsv(rows: string[][]): string {
  return "﻿" + rows.map((r) => r.join(",")).join("\r\n");
}
