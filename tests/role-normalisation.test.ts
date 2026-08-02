import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  CANONICAL_ROLES,
  normaliseRole,
  requirementAppliesToRole,
  resolveRole,
  splitShift,
  tidyRoleText,
} from "@/lib/role-normalisation";

/**
 * Role resolution.
 *
 * Every per-role compliance requirement is matched through this module. Before
 * it existed the match was an exact lowercased string compare, so a rule for
 * "Joiner" missed "Joiner Nights" and a rule for "Firewatch Operative" missed
 * both "Firewatch Days" and "Fire Watch Nights" — a requirement that looks
 * configured on screen but applies to nobody.
 *
 * The spellings asserted below are the ones named in that module's own header
 * as having been seen in live data, plus the blank-role fallback that 241 of
 * 414 assignments depend on. They are ground truth about what PRL types, not
 * echoes of what the code happens to return.
 */

describe("tidyRoleText", () => {
  test("collapses the double spaces that live data is full of", () => {
    assert.equal(tidyRoleText("Labourer  Nights"), "Labourer Nights");
    assert.equal(tidyRoleText("  Site   Manager  "), "Site Manager");
  });

  test("collapses tabs and newlines, not just spaces", () => {
    assert.equal(tidyRoleText("Site\tManager"), "Site Manager");
    assert.equal(tidyRoleText("Site\nManager"), "Site Manager");
  });

  test("leaves an already-tidy name untouched", () => {
    assert.equal(tidyRoleText("Site Manager"), "Site Manager");
  });
});

describe("splitShift — day/night is a shift, not a role", () => {
  test("strips a trailing shift word", () => {
    assert.deepEqual(splitShift("Labourer Nights"), { role: "Labourer", shift: "Nights" });
    assert.deepEqual(splitShift("Labourer Days"), { role: "Labourer", shift: "Days" });
  });

  test("strips the punctuated forms staff actually type", () => {
    for (const raw of ["Labourer (Nights)", "Labourer - Nights", "Labourer/Nights", "Labourer Night Shift"]) {
      assert.deepEqual(splitShift(raw), { role: "Labourer", shift: "Nights" }, raw);
    }
  });

  test("a role covering BOTH shifts carries no shift", () => {
    // "Firewatch Days/Nights" ends in "Nights". A naive single-pass strip
    // leaves the bogus role "Firewatch Days" behind, which then matches no
    // requirement at all.
    assert.deepEqual(splitShift("Firewatch Days/Nights"), { role: "Firewatch", shift: null });
    assert.deepEqual(splitShift("Labourer Day/Night"), { role: "Labourer", shift: null });
  });

  test("a role whose whole name is a shift word is left alone", () => {
    // Stripping here would yield an empty role name.
    assert.deepEqual(splitShift("Nights"), { role: "Nights", shift: null });
    assert.deepEqual(splitShift("Days"), { role: "Days", shift: null });
  });

  test("is case-insensitive about the shift word", () => {
    assert.deepEqual(splitShift("labourer nights"), { role: "labourer", shift: "Nights" });
    assert.deepEqual(splitShift("LABOURER NIGHTS"), { role: "LABOURER", shift: "Nights" });
  });

  test("does not strip a shift word from the middle of a name", () => {
    assert.deepEqual(splitShift("Night Watchman"), { role: "Night Watchman", shift: null });
  });
});

describe("the canonical vocabulary", () => {
  test("every canonical role resolves to itself, unchanged and unflagged", () => {
    // The invariant, not a copy of the list: whatever the vocabulary contains,
    // no entry may be mangled by shift-stripping or shadowed by an alias. Adding
    // a role ending in a shift word (say "Cover Days") would break this.
    for (const role of CANONICAL_ROLES) {
      assert.deepEqual(
        normaliseRole(role),
        { canonical: role, shift: null, needsReview: false },
        role
      );
    }
  });

  test("no canonical role is a case-variant duplicate of another", () => {
    // Lookup is by lowercased key, so a duplicate would silently make one
    // spelling unreachable.
    const lowered = CANONICAL_ROLES.map((r) => r.toLowerCase());
    assert.equal(new Set(lowered).size, lowered.length);
  });

  test("resolution is idempotent — feeding the answer back changes nothing", () => {
    // An alias pointing at a name that is not itself canonical would fail here.
    const liveSpellings = [
      "Joiner Nights",
      "Fire Watch Nights",
      "Pipe Fitter",
      "banksman",
      "Traffic Marshal",
      "Storeman",
      "Forman Civils",
      "360 Operator",
      "Rigger/Slinger",
      "Supervisor",
      "Some Role Nobody Configured",
    ];
    for (const raw of liveSpellings) {
      const once = normaliseRole(raw).canonical;
      assert.ok(once, raw);
      assert.equal(normaliseRole(once).canonical, once, raw);
    }
  });
});

describe("normaliseRole", () => {
  test("treats blank input as no role at all, not as an unknown one", () => {
    for (const raw of [null, undefined, "", "   ", "\t"]) {
      assert.deepEqual(
        normaliseRole(raw),
        { canonical: null, shift: null, needsReview: false },
        JSON.stringify(raw)
      );
    }
  });

  test("matches a canonical role regardless of case or spacing", () => {
    assert.equal(normaliseRole("labourer").canonical, "Labourer");
    assert.equal(normaliseRole("  SITE   MANAGER ").canonical, "Site Manager");
  });

  test("mechanical variants map silently — no review needed", () => {
    const mechanical: [string, string][] = [
      ["Fire Watch", "Firewatch Operative"],
      ["Firewatch", "Firewatch Operative"],
      ["Pipe Fitter", "Pipefitter"],
      ["Traffic Marshal", "Traffic Marshall"],
      ["Banksman", "Banksperson"],
      ["Storeman", "Warehouse Operative"],
      ["Gate Man", "Gate Person"],
      ["Telehandler", "Telehandler Driver"],
      ["Platter", "Plater Fabricator"],
      ["Forman", "Foreman"],
      ["Forman Civils", "Civils Foreman"],
      ["360 Operator", "360 Machine Operator"],
      ["Hoist Operator", "Hoist Driver"],
      ["Electrician Tester", "Electrician (Tester)"],
      ["HSE", "H&S Advisor"],
      ["Slinger", "Slinger/Signaller"],
    ];
    for (const [raw, canonical] of mechanical) {
      const result = normaliseRole(raw);
      assert.equal(result.canonical, canonical, raw);
      assert.equal(result.needsReview, false, `${raw} should not need review`);
    }
  });

  test("judgement calls resolve but are flagged for confirmation", () => {
    // These merge two arguably-distinct trades. They must still resolve — a
    // requirement that never applies is the bug this module exists to fix — but
    // a wrong guess has to be visible rather than silent.
    const judgement: [string, string][] = [
      ["Supervisor", "Site Supervisor"],
      ["Electrician/Improver", "Electrical Improver"],
      ["Electrical Stores", "Warehouse Operative"],
      ["Rigger/Slinger", "Rigger"],
    ];
    for (const [raw, canonical] of judgement) {
      const result = normaliseRole(raw);
      assert.equal(result.canonical, canonical, raw);
      assert.equal(result.needsReview, true, `${raw} should need review`);
    }
  });

  test("an unrecognised role keeps its tidied text and is flagged", () => {
    // It must not be force-fitted to the nearest canonical name, and it must not
    // vanish — it has to show up in the coverage report as one to configure.
    const result = normaliseRole("  Bouncy   Castle   Inspector ");
    assert.equal(result.canonical, "Bouncy Castle Inspector");
    assert.equal(result.needsReview, true);
  });

  test("carries the shift alongside the canonical role", () => {
    assert.deepEqual(normaliseRole("Joiner Nights"), {
      canonical: "Joiner",
      shift: "Nights",
      needsReview: false,
    });
    assert.deepEqual(normaliseRole("Fire Watch Days"), {
      canonical: "Firewatch Operative",
      shift: "Days",
      needsReview: false,
    });
  });

  test("DOCUMENTED: 'Improver' and 'Skilled Labourer' are never flagged", () => {
    // Both are listed as judgement aliases AND as canonical roles. The exact
    // canonical lookup runs first, so it wins and the judgement entries for
    // these two are unreachable — they resolve identically but with
    // needsReview false, so PRL is never asked to confirm which trade an
    // "Improver" belongs to. Pinned deliberately: if the flag is ever wanted,
    // this test should fail and force the decision.
    assert.equal(normaliseRole("Improver").needsReview, false);
    assert.equal(normaliseRole("Skilled Labourer").needsReview, false);
  });
});

describe("resolveRole — the job-title fallback", () => {
  test("the assignment role wins when it has one", () => {
    const resolved = resolveRole("Joiner", "Labourer");
    assert.equal(resolved.canonical, "Joiner");
    assert.equal(resolved.source, "assignment");
  });

  test("falls back to the job title when the assignment role is blank", () => {
    // 241 of 414 assignments had no role. Without this, per-role requirements
    // could never apply to 58% of assigned contractors.
    for (const blank of [null, undefined, "", "   "]) {
      const resolved = resolveRole(blank, "Labourer");
      assert.equal(resolved.canonical, "Labourer", JSON.stringify(blank));
      assert.equal(resolved.source, "jobTitle", JSON.stringify(blank));
    }
  });

  test("an UNRECOGNISED assignment role still beats the job title", () => {
    // Only a blank role falls through. Unrecognised text is a real answer about
    // what this person is doing on this assignment, so it is preferred over a
    // job title that may be years stale.
    const resolved = resolveRole("Bouncy Castle Inspector", "Labourer");
    assert.equal(resolved.canonical, "Bouncy Castle Inspector");
    assert.equal(resolved.source, "assignment");
    assert.equal(resolved.needsReview, true);
  });

  test("no role from any source is reported as unknown, not guessed", () => {
    assert.deepEqual(resolveRole(null, null), {
      canonical: null,
      shift: null,
      raw: "",
      source: "unknown",
      needsReview: false,
    });
    assert.equal(resolveRole("  ", "  ").source, "unknown");
  });

  test("raw is the tidied text that was typed, not the canonical name", () => {
    // The original stays visible so staff can see what the mapping was made
    // from — Assignment.role is never rewritten.
    assert.equal(resolveRole("pipe  fitter").raw, "pipe fitter");
    assert.equal(resolveRole("pipe  fitter").canonical, "Pipefitter");
    assert.equal(resolveRole("", "  fire watch  ").raw, "fire watch");
  });

  test("carries shift and needsReview through from whichever source won", () => {
    assert.equal(resolveRole("Labourer Nights").shift, "Nights");
    assert.equal(resolveRole("", "Labourer Nights").shift, "Nights");
    assert.equal(resolveRole("", "Supervisor").needsReview, true);
    assert.equal(resolveRole("", "Supervisor").source, "jobTitle");
  });
});

describe("requirementAppliesToRole", () => {
  const joinerOnNights = resolveRole("Joiner Nights");
  const firewatchNights = resolveRole("Fire Watch Nights");
  const firewatchDays = resolveRole("Firewatch Days");
  const noRole = resolveRole(null, null);

  test("a rule matches every spelling of the role it names", () => {
    // The four failures the module was built for, stated as they were reported.
    assert.equal(requirementAppliesToRole("Joiner", joinerOnNights), true);
    assert.equal(requirementAppliesToRole("Firewatch Operative", firewatchNights), true);
    assert.equal(requirementAppliesToRole("Firewatch Operative", firewatchDays), true);
    assert.equal(requirementAppliesToRole("Firewatch Operative", resolveRole("Firewatch Days/Nights")), true);
  });

  test("the rule's own spelling is normalised too", () => {
    // A requirement saved as "Pipe Fitter" must still reach a "Pipefitter".
    assert.equal(requirementAppliesToRole("Pipe Fitter", resolveRole("Pipefitter")), true);
    assert.equal(requirementAppliesToRole("Banksman", resolveRole("Banksperson")), true);
    assert.equal(requirementAppliesToRole("joiner", joinerOnNights), true);
  });

  test("does not apply to a different role", () => {
    assert.equal(requirementAppliesToRole("Joiner", resolveRole("Labourer")), false);
    assert.equal(requirementAppliesToRole("Firewatch Operative", resolveRole("Welder")), false);
  });

  test("'All' reaches people whose role is unknown", () => {
    // This is what keeps a baseline rule like "everyone needs Right to Work"
    // meaningful for the un-roled part of the workforce.
    assert.equal(requirementAppliesToRole("All", noRole), true);
    assert.equal(requirementAppliesToRole("All", joinerOnNights), true);
  });

  test("a named role never reaches someone with no role", () => {
    assert.equal(requirementAppliesToRole("Joiner", noRole), false);
    assert.equal(requirementAppliesToRole("Bouncy Castle Inspector", noRole), false);
  });

  test("DOCUMENTED: the 'All' wildcard is case-sensitive", () => {
    // "all" is not the wildcard — it falls through to a normal role compare and
    // therefore matches nobody. The requirement write path stores the exact
    // string "All", so this only bites data written around it.
    assert.equal(requirementAppliesToRole("all", joinerOnNights), false);
    assert.equal(requirementAppliesToRole("all", noRole), false);
  });

  test("an unrecognised rule role still matches the same unrecognised text", () => {
    const odd = resolveRole("Bouncy Castle Inspector");
    assert.equal(requirementAppliesToRole("bouncy  castle  inspector", odd), true);
  });
});
