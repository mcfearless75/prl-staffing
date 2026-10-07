import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { documentsScore, rtwItemState } from "@/lib/portal-score";

/**
 * The My Documents percentage. Adam McGuire had a CSCS and no Right to Work
 * and saw 100%, because RTW wasn't counted. It must be.
 */
describe("documentsScore", () => {
  test("CSCS verified but no Right to Work is 50%, not 100%", () => {
    const s = documentsScore({ rtw: "missing", cards: ["verified"] });
    assert.equal(s.score, 50);
    assert.equal(s.total, 2);
  });

  test("Right to Work and every card verified is 100%", () => {
    assert.equal(documentsScore({ rtw: "verified", cards: ["verified", "verified"] }).score, 100);
  });

  test("uploaded but not yet checked counts as submitted, not verified", () => {
    const s = documentsScore({ rtw: "submitted", cards: ["submitted"] });
    assert.equal(s.submitted, 2);
    assert.equal(s.verified, 0);
    assert.equal(s.score, 0);
  });

  test("with no cards required for the role, Right to Work alone decides it", () => {
    assert.equal(documentsScore({ rtw: "missing", cards: [] }).score, 0);
    assert.equal(documentsScore({ rtw: "verified", cards: [] }).score, 100);
  });
});

describe("rtwItemState", () => {
  test("verified beats submitted; nothing in is missing", () => {
    assert.equal(rtwItemState(true, true), "verified");
    assert.equal(rtwItemState(true, false), "submitted");
    assert.equal(rtwItemState(false, false), "missing");
  });
});
