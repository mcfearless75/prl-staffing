import { test } from "node:test";
import assert from "node:assert/strict";
import { formatGbpRate } from "@/lib/rate-format";

test("always pounds to two decimal places", () => {
  assert.equal(formatGbpRate("29.9"), "£29.90");
  assert.equal(formatGbpRate("29"), "£29.00");
  assert.equal(formatGbpRate("£29.90"), "£29.90");
  assert.equal(formatGbpRate(" £ 1,250.5 "), "£1250.50");
  assert.equal(formatGbpRate(".5"), "£0.50");
  assert.equal(formatGbpRate("12."), "£12.00");
});

test("blank or junk stays blank rather than inventing £0.00", () => {
  assert.equal(formatGbpRate(""), "");
  assert.equal(formatGbpRate("   "), "");
  assert.equal(formatGbpRate(null), "");
  assert.equal(formatGbpRate(undefined), "");
  assert.equal(formatGbpRate("abc"), "");
  assert.equal(formatGbpRate("29.90 ph"), "");
  assert.equal(formatGbpRate("-5"), "");
});
