import { test } from "node:test";
import assert from "node:assert/strict";
import { sortRolesAZ } from "@/lib/job-roles";

// Jenni, 2026-10-01: electricians were scattered through the role picker.
test("job roles are A–Z regardless of case or stray spaces", () => {
  const sorted = sortRolesAZ([
    { name: "Labourer" },
    { name: "electrical Improver" },
    { name: " Electrician" },
    { name: "Approved Electrician" },
    { name: "Electrician (Tester)" },
  ]).map((r) => r.name.trim());
  assert.deepEqual(sorted, ["Approved Electrician", "electrical Improver", "Electrician", "Electrician (Tester)", "Labourer"]);
});
