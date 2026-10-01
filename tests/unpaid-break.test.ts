import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  NO_UNPAID_BREAK,
  UNPAID_BREAK_OPTIONS,
  isValidUnpaidBreak,
  unpaidBreakLabel,
  unpaidBreakTimesheetNote,
} from "@/lib/unpaid-break";

/**
 * The unpaid break on a Subcontractor Agreement. The email tells the worker
 * not to put the break in their hours; getting that wrong on a site that
 * PAYS breaks would have them under-claim, so "paid" must say nothing.
 */

describe("isValidUnpaidBreak", () => {
  test("every offered option is accepted", () => {
    for (const o of UNPAID_BREAK_OPTIONS) assert.equal(isValidUnpaidBreak(o), true);
  });
  test("anything else is rejected", () => {
    assert.equal(isValidUnpaidBreak(""), false);
    assert.equal(isValidUnpaidBreak("25 minutes"), false);
    assert.equal(isValidUnpaidBreak(undefined), false);
    assert.equal(isValidUnpaidBreak(30), false);
  });
});

describe("wording", () => {
  test("paid breaks: labelled as paid and no timesheet instruction", () => {
    assert.equal(unpaidBreakLabel(NO_UNPAID_BREAK), "None — breaks are paid");
    assert.equal(unpaidBreakTimesheetNote(NO_UNPAID_BREAK), null);
  });
  test("unpaid break: stated per shift, and excluded from hours", () => {
    assert.equal(unpaidBreakLabel("30 minutes"), "30 minutes per shift");
    const note = unpaidBreakTimesheetNote("30 minutes");
    assert.ok(note?.includes("30 minutes per shift"));
    assert.ok(note?.includes("don't include it in your hours"));
  });
});
