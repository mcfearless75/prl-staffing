import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { applicantRoleError } from "@/lib/apply-roles";

/**
 * Website applicants must say what job they do: tick a role, or tick
 * "My job is not listed" and type it. Both the form and /api/apply rely on this.
 */
describe("applicantRoleError", () => {
  const base = { selectedCount: 0, notListed: false, otherRole: "" };

  test("nothing ticked is refused", () => {
    assert.match(applicantRoleError(base)!, /tick at least one/);
  });

  test("one ticked role is enough", () => {
    assert.equal(applicantRoleError({ ...base, selectedCount: 1 }), null);
  });

  test("'not listed' without typing the job is refused, even with roles ticked", () => {
    assert.match(applicantRoleError({ ...base, notListed: true })!, /type your job/);
    assert.match(applicantRoleError({ ...base, notListed: true, otherRole: "   " })!, /type your job/);
    assert.match(applicantRoleError({ ...base, selectedCount: 2, notListed: true })!, /type your job/);
  });

  test("'not listed' with the job typed is accepted", () => {
    assert.equal(applicantRoleError({ ...base, notListed: true, otherRole: "Scaffolder" }), null);
  });

  test("typing in the other box without ticking 'not listed' doesn't count", () => {
    assert.match(applicantRoleError({ ...base, otherRole: "Scaffolder" })!, /tick at least one/);
  });

  test("if the role list failed to load, the typed role is required instead", () => {
    assert.match(applicantRoleError({ ...base, freeTextMode: true, freeText: " " })!, /tell us the job/);
    assert.equal(applicantRoleError({ ...base, freeTextMode: true, freeText: "Joiner" }), null);
  });
});
