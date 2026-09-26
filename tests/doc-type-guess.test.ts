import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { categoryForType } from "@/lib/compliance-types";
import { guessDocType, guessDocTypeWithin, typeGroupsFor } from "@/lib/doc-type-guess";

/**
 * The Right to Work tab's uploader is limited to RTW document types. If the
 * limit leaked, a CSCS card uploaded there would be filed as RTW evidence, or
 * an ID scan would be filed under some other category.
 */

describe("guessDocType", () => {
  test("recognises common file names", () => {
    assert.equal(guessDocType("John Passport scan.jpg"), "Passport");
    assert.equal(guessDocType("share_code.pdf"), "Share Code");
    assert.equal(guessDocType("CSCS front.png"), "CSCS");
    assert.equal(guessDocType("IMG_2231.jpg"), "Other");
  });
});

describe("guessDocTypeWithin — Right to Work", () => {
  test("keeps an RTW guess", () => {
    assert.equal(guessDocTypeWithin("passport.pdf", "Right to Work"), "Passport");
    assert.equal(guessDocTypeWithin("visa.pdf", "Right to Work"), "Right to Work");
  });

  test("anything outside the category falls back to the generic RTW type", () => {
    assert.equal(guessDocTypeWithin("IMG_2231.jpg", "Right to Work"), "Right to Work");
    assert.equal(guessDocTypeWithin("cscs.jpg", "Right to Work"), "Right to Work");
  });

  test("without a limit it is the plain guess", () => {
    assert.equal(guessDocTypeWithin("cscs.jpg"), "CSCS");
  });

  test("every guess it makes is inside the category", () => {
    for (const f of ["a.pdf", "cscs.jpg", "dbs.pdf", "p45.pdf", "passport.png", "brp.jpg", "cv.docx"]) {
      assert.equal(categoryForType(guessDocTypeWithin(f, "Right to Work")), "Right to Work", f);
    }
  });
});

describe("typeGroupsFor", () => {
  test("offers only RTW types when limited", () => {
    const groups = typeGroupsFor("Right to Work");
    assert.equal(groups.length, 1);
    assert.ok(groups[0].types.includes("Share Code"));
    assert.ok(!groups[0].types.includes("CSCS"));
  });

  test("offers every group otherwise", () => {
    assert.ok(typeGroupsFor().length > 1);
  });
});
