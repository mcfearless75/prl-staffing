import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  recordMatchesRequirement,
  requirementStatus,
  requirementMetForPlacement,
  bestRecordFor,
} from "@/lib/requirement-match";

// Jenni, 2026-10-01: James Nye — CSCS and Right to Work on file, shown missing.
describe("a category requirement is met by any card in that category", () => {
  test("CSCS is met by a Blue card, Right to Work by a UK passport", () => {
    assert.ok(recordMatchesRequirement("CSCS", "CSCS (Blue) — Skilled Worker"));
    assert.ok(recordMatchesRequirement("Right to Work", "Passport — UK or Ireland"));
    assert.ok(recordMatchesRequirement("CSCS", "CSCS"));
  });

  test("a specific requirement still needs that exact card", () => {
    assert.equal(recordMatchesRequirement("CSCS (Gold) — Advanced Craft / Supervisor", "CSCS (Green) — Labourer"), false);
    assert.equal(recordMatchesRequirement("CSCS (Blue) — Skilled Worker", "CSCS (Green) — Labourer"), false);
  });

  test("other categories don't cross over", () => {
    assert.equal(recordMatchesRequirement("CSCS", "Passport — UK or Ireland"), false);
    assert.equal(recordMatchesRequirement("Right to Work", "CSCS (Blue) — Skilled Worker"), false);
  });
});

describe("requirementStatus — the best document wins", () => {
  test("James Nye's case: no longer Missing", () => {
    const held = [
      { type: "CSCS (Blue) — Skilled Worker", status: "Verified" },
      { type: "Passport — UK or Ireland", status: "Verified" },
    ];
    assert.equal(requirementStatus("CSCS", held), "Verified");
    assert.equal(requirementStatus("Right to Work", held), "Verified");
  });

  test("an expired old card doesn't hide a verified new one", () => {
    const held = [
      { type: "CSCS (Green) — Labourer", status: "Expired" },
      { type: "CSCS (Blue) — Skilled Worker", status: "Verified" },
    ];
    assert.equal(requirementStatus("CSCS", held), "Verified");
    assert.equal(bestRecordFor("CSCS", held)?.type, "CSCS (Blue) — Skilled Worker");
  });

  test("nothing held is Missing", () => {
    assert.equal(requirementStatus("CSCS", [{ type: "Passport", status: "Verified" }]), "Missing");
  });
});

describe("requirementMetForPlacement", () => {
  const now = new Date("2026-10-01T12:00:00Z");
  const rec = (over: Partial<{ type: string; status: string; expiryDate: Date | null; indefiniteExpiry: boolean }>) => ({
    type: "CSCS (Blue) — Skilled Worker", status: "Verified", expiryDate: new Date("2027-01-01"), indefiniteExpiry: false, ...over,
  });

  test("a verified in-date card meets a category requirement", () => {
    assert.ok(requirementMetForPlacement("CSCS", [rec({})], now));
  });

  test("no expiry date entered counts as in date, like Right to Work coverage", () => {
    assert.ok(requirementMetForPlacement("Right to Work", [rec({ type: "Birth Certificate", expiryDate: null })], now));
  });

  test("pending or out-of-date doesn't count", () => {
    assert.equal(requirementMetForPlacement("CSCS", [rec({ status: "Pending" })], now), false);
    assert.equal(requirementMetForPlacement("CSCS", [rec({ expiryDate: new Date("2026-09-01") })], now), false);
  });
});

// Jenni, 2026-10-01: Andrew Carroll has an ECS card, never a CSCS.
describe("CSCS partner schemes are accepted for a CSCS requirement", () => {
  test("ECS, JIB and CPCS cards meet 'CSCS'", () => {
    assert.ok(recordMatchesRequirement("CSCS", "ECS Card"));
    assert.ok(recordMatchesRequirement("CSCS", "JIB Card"));
    assert.ok(recordMatchesRequirement("CSCS", "CPCS Excavator (360)"));
    assert.equal(requirementStatus("CSCS", [{ type: "ECS Card", status: "Verified" }]), "Verified");
  });

  test("but not a specific CSCS colour, and not the other way round", () => {
    assert.equal(recordMatchesRequirement("CSCS (Blue) — Skilled Worker", "ECS Card"), false);
    assert.equal(recordMatchesRequirement("CPCS", "CSCS (Blue) — Skilled Worker"), false);
    assert.equal(recordMatchesRequirement("ECS Card", "CSCS (Blue) — Skilled Worker"), false);
  });
});

// Paul, 2026-10-01: a colour requirement is met by that card "or higher".
describe("CSCS colours: that card or higher", () => {
  const BLUE = "CSCS (Blue) — Skilled Worker";
  test("Blue is met by Blue, Gold or Black", () => {
    for (const held of [BLUE, "CSCS (Gold) — Advanced Craft / Supervisor", "CSCS (Black) — Manager"]) {
      assert.ok(recordMatchesRequirement(BLUE, held), held);
    }
  });

  test("but not by Green, or by cards off the ladder", () => {
    for (const held of ["CSCS (Green) — Labourer", "CSCS (Red) — Trainee / Experienced Worker", "CSCS (Yellow) — Visitor", "CSCS (White) — AQP / PQP", "ECS Card"]) {
      assert.equal(recordMatchesRequirement(BLUE, held), false, held);
    }
  });

  test("Gold is met by Black, not Blue", () => {
    assert.ok(recordMatchesRequirement("CSCS (Gold) — Advanced Craft / Supervisor", "CSCS (Black) — Manager"));
    assert.equal(recordMatchesRequirement("CSCS (Gold) — Advanced Craft / Supervisor", BLUE), false);
  });

  test("every ladder name is a real document type, so it can't silently never match", async () => {
    const { COMPLIANCE_TYPES } = await import("@/lib/compliance-types");
    const { CSCS_LADDER } = await import("@/lib/requirement-match");
    for (const c of CSCS_LADDER) assert.ok(COMPLIANCE_TYPES.includes(c), c);
  });
});

// Jenni, 2026-10-01: Balvinder Singh holds NPORS — groundworkers can have CSCS or NPORS.
test("NPORS cards meet a plain CSCS requirement", () => {
  assert.ok(recordMatchesRequirement("CSCS", "NPORS Excavator (360)"));
  assert.ok(recordMatchesRequirement("CSCS", "NPORS"));
  assert.equal(recordMatchesRequirement("CSCS (Blue) — Skilled Worker", "NPORS Excavator (360)"), false);
});

// Jenni, 2026-10-01: "we will tick what's required but it could be either NPORS or CSCS".
describe("either/or requirements (alternatives)", () => {
  const spec = { type: "NPORS", alternatives: ["CPCS"] };
  test("met by any listed family, labelled 'A or B'", async () => {
    const { recordMeetsSpec, requirementLabel } = await import("@/lib/requirement-match");
    assert.ok(recordMeetsSpec(spec, "NPORS Excavator (360)"));
    assert.ok(recordMeetsSpec(spec, "CPCS Telehandler"));
    assert.equal(recordMeetsSpec(spec, "CSCS (Blue) — Skilled Worker"), false);
    assert.equal(requirementLabel(spec), "NPORS or CPCS");
    assert.equal(requirementLabel("CSCS"), "CSCS");
  });

  test("status and placement honour the alternatives", () => {
    assert.equal(requirementStatus(spec, [{ type: "CPCS Telehandler", status: "Verified" }]), "Verified");
    assert.ok(
      requirementMetForPlacement(spec, [{ type: "CPCS Telehandler", status: "Verified", expiryDate: null }], new Date("2026-10-01"))
    );
  });
});
