import { test } from "node:test";
import assert from "node:assert/strict";
import { safeRedirectPath } from "@/lib/safe-redirect";

test("keeps same-site paths", () => {
  assert.equal(safeRedirectPath("/contractors/abc?tab=Activity"), "/contractors/abc?tab=Activity");
});

test("refuses anything that leaves the site", () => {
  for (const evil of ["https://evil.example", "//evil.example", "/\\evil.example", "evil.example", "", null, undefined]) {
    assert.equal(safeRedirectPath(evil, "/compliance"), "/compliance", String(evil));
  }
});
