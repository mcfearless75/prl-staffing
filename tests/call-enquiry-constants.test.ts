import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { isCallEnquiryCategory, CALL_ENQUIRY_CATEGORIES } from "@/lib/calls/constants";

describe("isCallEnquiryCategory", () => {
  test("accepts every declared category", () => {
    for (const category of CALL_ENQUIRY_CATEGORIES) {
      assert.equal(isCallEnquiryCategory(category), true);
    }
  });

  test("rejects an unknown string", () => {
    assert.equal(isCallEnquiryCategory("NOT_A_CATEGORY"), false);
  });

  test("rejects non-string values", () => {
    assert.equal(isCallEnquiryCategory(undefined), false);
    assert.equal(isCallEnquiryCategory(42), false);
  });
});
