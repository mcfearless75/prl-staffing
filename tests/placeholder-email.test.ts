import { test } from "node:test";
import assert from "node:assert/strict";
import { isPlaceholderEmail } from "@/lib/placeholder-email";

test("recognises the import's invented addresses, whatever the case or spacing", () => {
  assert.equal(isPlaceholderEmail("paul.mcloughlin@prl-placeholder.co.uk"), true);
  assert.equal(isPlaceholderEmail("  A.B@PRL-Placeholder.co.uk "), true);
});

test("leaves real addresses alone, including lookalikes", () => {
  assert.equal(isPlaceholderEmail("admin@prlsitesolutions.co.uk"), false);
  assert.equal(isPlaceholderEmail("someone@notprl-placeholder.co.uk"), false);
  assert.equal(isPlaceholderEmail("prl-placeholder.co.uk@gmail.com"), false);
  assert.equal(isPlaceholderEmail(""), false);
  assert.equal(isPlaceholderEmail(null), false);
});
