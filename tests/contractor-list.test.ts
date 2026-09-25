import { test } from "node:test";
import assert from "node:assert/strict";
import { appliedForFromNotes, effectiveJobTitle, parseContractorSort, sortContractorRows, type SortableRow } from "@/lib/contractor-list";

test("job title falls back through profile roles, then the live assignment", () => {
  assert.equal(effectiveJobTitle({ jobTitle: "Electrician", profileJobRoles: ["Labourer"], liveAssignmentRole: "Banksman" }), "Electrician");
  assert.equal(effectiveJobTitle({ jobTitle: "  ", profileJobRoles: ["Labourer", "Banksman"], liveAssignmentRole: "Fire Watch" }), "Labourer, Banksman");
  assert.equal(effectiveJobTitle({ jobTitle: null, profileJobRoles: [], liveAssignmentRole: "Fire Watch" }), "Fire Watch");
  assert.equal(effectiveJobTitle({ jobTitle: null, profileJobRoles: [" "], liveAssignmentRole: " " }), "");
});

test("applied-for role is read from application JSON and ignores anything else", () => {
  assert.equal(appliedForFromNotes(JSON.stringify({ positionsSought: " Electrician " })), "Electrician");
  assert.equal(appliedForFromNotes(JSON.stringify({ other: 1 })), "");
  assert.equal(appliedForFromNotes("Plain text note about Electrician"), "");
  assert.equal(appliedForFromNotes("null"), "");
  assert.equal(appliedForFromNotes(null), "");
});

test("unknown sort falls back to surname; the old sortBy=firstName link still works", () => {
  assert.equal(parseContractorSort(undefined), "last");
  assert.equal(parseContractorSort("nonsense"), "last");
  assert.equal(parseContractorSort(undefined, "firstName"), "first");
  assert.equal(parseContractorSort("title", "firstName"), "title");
});

const row = (lastName: string, over: Partial<SortableRow> = {}): SortableRow => ({
  firstName: "A", lastName, email: null, title: "", workingAt: "", compliance: "Verified", status: "Active", ...over,
});

test("blank values sort last in both directions", () => {
  const rows = [row("A", { title: "" }), row("B", { title: "Welder" }), row("C", { title: "Banksman" })];
  assert.deepEqual(sortContractorRows(rows, "title", "asc").map((r) => r.lastName), ["C", "B", "A"]);
  assert.deepEqual(sortContractorRows(rows, "title", "desc").map((r) => r.lastName), ["B", "C", "A"]);
});

test("compliance ascending puts the people needing chasing first", () => {
  const rows = [row("A", { compliance: "Verified" }), row("B", { compliance: "Non-Compliant" }), row("C", { compliance: "Expiring" })];
  assert.deepEqual(sortContractorRows(rows, "compliance", "asc").map((r) => r.lastName), ["B", "C", "A"]);
});

test("ties fall back to surname and the input is not mutated", () => {
  const rows = [row("Zed", { status: "Active" }), row("Abb", { status: "Active" })];
  assert.deepEqual(sortContractorRows(rows, "status", "desc").map((r) => r.lastName), ["Abb", "Zed"]);
  assert.equal(rows[0].lastName, "Zed");
});

test("an inactive person falls back to the role from their last job", () => {
  assert.equal(
    effectiveJobTitle({ jobTitle: null, profileJobRoles: [], liveAssignmentRole: null, lastAssignmentRole: "Labourer" }),
    "Labourer"
  );
  // A live job still wins over a past one.
  assert.equal(
    effectiveJobTitle({ jobTitle: null, profileJobRoles: [], liveAssignmentRole: "Banksman", lastAssignmentRole: "Labourer" }),
    "Banksman"
  );
});
