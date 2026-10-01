import { test } from "node:test";
import assert from "node:assert/strict";
import { describeProfileChanges } from "@/lib/profile-changes";

test("names the fields that changed", () => {
  assert.equal(
    describeProfileChanges({ phone: "0711", address: "1 Road", firstName: "Jo" }, { phone: "0722", address: "2 Road", firstName: "Jo" }),
    "Phone, Address"
  );
});

test("never puts values in the log, except the status transition", () => {
  const out = describeProfileChanges(
    { niNumber: "AB123456C", medicalNotes: "x", status: "Active" },
    { niNumber: "ZZ999999Z", medicalNotes: "y", status: "Inactive" }
  );
  assert.equal(out, "Status (Active → Inactive), NI number, Medical notes");
  assert.ok(!out.includes("AB123456C") && !out.includes("ZZ999999Z"));
});

test("blank, null and undefined are no change; unsubmitted fields are skipped", () => {
  assert.equal(describeProfileChanges({ phone: null, notes: "keep" }, { phone: "", status: undefined }), "");
});

test("dates compare by day, not by object", () => {
  assert.equal(
    describeProfileChanges({ dateOfBirth: new Date("1990-01-02T00:00:00Z") }, { dateOfBirth: new Date("1990-01-02T00:00:00Z") }),
    ""
  );
  assert.equal(
    describeProfileChanges({ leavingDate: null }, { leavingDate: new Date("2026-11-01T00:00:00Z") }),
    "Leaving date"
  );
});
