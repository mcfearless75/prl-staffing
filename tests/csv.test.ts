import { test } from "node:test";
import assert from "node:assert/strict";
import { csvCell, toCsv } from "@/lib/csv";

test("plain values pass through", () => {
  assert.equal(csvCell("Jake Adair"), "Jake Adair");
  assert.equal(csvCell(null), "");
  assert.equal(csvCell(undefined), "");
});

test("commas, quotes and line breaks are quoted", () => {
  assert.equal(csvCell("Metlen — INCE Marsh, Gate 2"), '"Metlen — INCE Marsh, Gate 2"');
  assert.equal(csvCell('Dan "the man"'), '"Dan ""the man"""');
  assert.equal(csvCell("line1\nline2"), '"line1\nline2"');
});

// Names and emails come from public forms; Excel would execute these.
test("formula-leading cells are neutralised", () => {
  for (const evil of ["=HYPERLINK(\"http://x\")", "+1+1", "-2+3", "@SUM(A1)", "\tx"]) {
    assert.ok(csvCell(evil).replace(/^"/, "").startsWith("'"), evil);
  }
  // The guard runs before quoting, so a guarded cell with a comma is still one cell.
  assert.equal(csvCell("=1,2"), `"'=1,2"`);
});

test("toCsv adds a BOM and CRLF rows", () => {
  assert.equal(toCsv([["a", "b"], ["c", "d"]]), "﻿a,b\r\nc,d");
});
