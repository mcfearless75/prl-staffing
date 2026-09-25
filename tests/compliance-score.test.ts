import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { summariseCompliance, type ScoredAssignment } from "@/lib/compliance-score";
import type { RequirementMatcher, RequiredType } from "@/lib/compliance-gaps";

/**
 * The compliance denominator.
 *
 * Six different answers to "how many contractors?" were on screen at once, and
 * /intelligence divided a count of assignment ROWS by a count of PEOPLE and
 * described the result as a proportion of the workforce. Every number here is
 * per-person; these tests exist to keep it that way.
 */

/** A matcher that requires the same mandatory documents of everyone. */
function requires(mandatory: string[], optional: string[] = []): RequirementMatcher {
  const checklist: RequiredType[] = [
    ...mandatory.map((type) => ({ type, isMandatory: true, description: null })),
    ...optional.map((type) => ({ type, isMandatory: false, description: null })),
  ];
  return {
    configured: true,
    allTypes: [...mandatory, ...optional],
    forRole: () => checklist,
  };
}

/** A matcher that requires nothing of anybody — nothing configured yet. */
const requiresNothing: RequirementMatcher = {
  configured: false,
  allTypes: [],
  forRole: () => [],
};

function assignment(
  contractorId: string,
  opts: {
    role?: string | null;
    jobTitle?: string | null;
    records?: { type: string; status: string }[];
  } = {}
): ScoredAssignment {
  return {
    contractorId,
    role: opts.role ?? "Labourer",
    companyId: "company-1",
    contractor: {
      jobTitle: opts.jobTitle ?? null,
      compliances: opts.records ?? [],
    },
  };
}

const verified = (type: string) => ({ type, status: "Verified" });

describe("assignedTotal counts PEOPLE, not assignment rows", () => {
  test("a contractor on two live assignments is counted once", () => {
    // This is the bug in one line. Two rows, one person.
    const score = summariseCompliance(
      [
        assignment("alice", { records: [verified("CSCS")] }),
        assignment("alice", { records: [verified("CSCS")] }),
      ],
      requires(["CSCS"])
    );
    assert.equal(score.assignedTotal, 1);
    assert.equal(score.fullyCompliant, 1);
    assert.equal(score.score, 100);
  });

  test("distinct contractors are counted separately", () => {
    const score = summariseCompliance(
      [
        assignment("alice", { records: [verified("CSCS")] }),
        assignment("bob", { records: [verified("CSCS")] }),
      ],
      requires(["CSCS"])
    );
    assert.equal(score.assignedTotal, 2);
  });

  test("the per-person buckets always add up to assignedTotal", () => {
    const score = summariseCompliance(
      [
        assignment("compliant", { records: [verified("CSCS")] }),
        assignment("missing", { records: [] }),
        assignment("pending", { records: [{ type: "CSCS", status: "Pending" }] }),
        assignment("expiring", { records: [{ type: "CSCS", status: "Expiring" }] }),
      ],
      requires(["CSCS"])
    );
    const bucketed =
      score.fullyCompliant +
      score.actionRequired +
      score.pendingReview +
      score.expiring +
      score.noRequirements;
    assert.equal(bucketed, score.assignedTotal);
  });

  test("an empty workforce scores 0, not NaN", () => {
    const score = summariseCompliance([], requires(["CSCS"]));
    assert.equal(score.assignedTotal, 0);
    assert.equal(score.score, 0);
    assert.ok(Number.isFinite(score.score));
  });
});

describe("collapsing a contractor's assignments", () => {
  test("prefers the assignment that carries a resolvable role", () => {
    // 241 of 414 assignment roles were blank. Picking the blank row would leave
    // the contractor with no requirements and score them as unconfigured.
    const withBlankFirst = summariseCompliance(
      [
        assignment("alice", { role: "", records: [verified("CSCS")] }),
        assignment("alice", { role: "Labourer", records: [verified("CSCS")] }),
      ],
      requires(["CSCS"])
    );
    assert.equal(withBlankFirst.assignedTotal, 1);
    assert.equal(withBlankFirst.unknownRole, 0);
    assert.equal(withBlankFirst.fullyCompliant, 1);
  });

  test("falls back to the contractor's job title when no assignment has a role", () => {
    const score = summariseCompliance(
      [assignment("alice", { role: "", jobTitle: "Labourer", records: [verified("CSCS")] })],
      requires(["CSCS"])
    );
    assert.equal(score.unknownRole, 0);
  });

  test("reports a contractor with no role anywhere as unknownRole", () => {
    const score = summariseCompliance(
      [assignment("alice", { role: "", jobTitle: null, records: [verified("CSCS")] })],
      requires(["CSCS"])
    );
    assert.equal(score.unknownRole, 1);
    // Still in the denominator — an unknown role does not remove the person.
    assert.equal(score.assignedTotal, 1);
  });
});

describe("classification", () => {
  test("every mandatory document Verified means fully compliant", () => {
    const score = summariseCompliance(
      [assignment("alice", { records: [verified("CSCS"), verified("PPE")] })],
      requires(["CSCS", "PPE"])
    );
    assert.equal(score.fullyCompliant, 1);
    assert.equal(score.score, 100);
  });

  test("a missing mandatory document is action required", () => {
    const score = summariseCompliance(
      [assignment("alice", { records: [verified("CSCS")] })],
      requires(["CSCS", "PPE"])
    );
    assert.equal(score.fullyCompliant, 0);
    assert.equal(score.actionRequired, 1);
    assert.equal(score.score, 0);
  });

  test("Expired and Non-Compliant are action required", () => {
    for (const status of ["Expired", "Non-Compliant"]) {
      const score = summariseCompliance(
        [assignment("alice", { records: [{ type: "CSCS", status }] })],
        requires(["CSCS"])
      );
      assert.equal(score.actionRequired, 1, status);
    }
  });

  test("Expiring is its own bucket, not a pass", () => {
    const score = summariseCompliance(
      [assignment("alice", { records: [{ type: "CSCS", status: "Expiring" }] })],
      requires(["CSCS"])
    );
    assert.equal(score.expiring, 1);
    assert.equal(score.fullyCompliant, 0);
  });

  test("Pending review is not a pass", () => {
    const score = summariseCompliance(
      [assignment("alice", { records: [{ type: "CSCS", status: "Pending" }] })],
      requires(["CSCS"])
    );
    assert.equal(score.pendingReview, 1);
    assert.equal(score.fullyCompliant, 0);
  });

  test("optional documents do not affect the score", () => {
    // The old definition counted every record the contractor happened to hold,
    // so a single verified CSCS scored as fully compliant.
    const score = summariseCompliance(
      [assignment("alice", { records: [verified("CSCS")] })],
      requires(["CSCS"], ["First Aid"])
    );
    assert.equal(score.fullyCompliant, 1);
  });

  test("holding unrelated verified documents does not satisfy a requirement", () => {
    const score = summariseCompliance(
      [assignment("alice", { records: [verified("Passport"), verified("Photo")] })],
      requires(["CSCS"])
    );
    assert.equal(score.fullyCompliant, 0);
    assert.equal(score.actionRequired, 1);
  });

  test("counts contractors holding no records at all", () => {
    const score = summariseCompliance(
      [assignment("alice", { records: [] }), assignment("bob", { records: [verified("CSCS")] })],
      requires(["CSCS"])
    );
    assert.equal(score.noRecords, 1);
  });
});

describe("unconfigured requirements", () => {
  test("a contractor with nothing required of them is NOT scored as compliant", () => {
    // An unconfigured role must not look like a clean bill of health.
    const score = summariseCompliance([assignment("alice")], requiresNothing);
    assert.equal(score.noRequirements, 1);
    assert.equal(score.fullyCompliant, 0);
    assert.equal(score.score, 0);
  });

  test("reports whether requirements are configured at all", () => {
    assert.equal(summariseCompliance([], requiresNothing).requirementsConfigured, false);
    assert.equal(summariseCompliance([], requires(["CSCS"])).requirementsConfigured, true);
  });
});

describe("the score itself", () => {
  test("is fullyCompliant over assignedTotal as a rounded percentage", () => {
    const score = summariseCompliance(
      [
        assignment("a", { records: [verified("CSCS")] }),
        assignment("b", { records: [verified("CSCS")] }),
        assignment("c", { records: [] }),
      ],
      requires(["CSCS"])
    );
    assert.equal(score.assignedTotal, 3);
    assert.equal(score.fullyCompliant, 2);
    assert.equal(score.score, 67);
  });

  test("never exceeds 100, even when people hold several assignments", () => {
    const score = summariseCompliance(
      [
        assignment("a", { records: [verified("CSCS")] }),
        assignment("a", { records: [verified("CSCS")] }),
        assignment("a", { records: [verified("CSCS")] }),
      ],
      requires(["CSCS"])
    );
    assert.ok(score.score <= 100, `score was ${score.score}`);
    assert.equal(score.score, 100);
  });
});

describe("people: the names behind each count", () => {
  // The /compliance tiles used to count PEOPLE but list document ROWS, so
  // "134 Action required" opened a list that never matched: missing documents
  // have no row, and people with no requirements configured have none either.
  // Each tile now lists `people`, which must agree with the counts.
  const matcher = requires(["CSCS", "Passport"]);
  const score = summariseCompliance(
    [
      assignment("ok", { records: [verified("CSCS"), verified("Passport")] }),
      assignment("missing", { records: [verified("CSCS")] }),
      assignment("expired", { records: [verified("CSCS"), { type: "Passport", status: "Expired" }] }),
      assignment("expiring", { records: [verified("CSCS"), { type: "Passport", status: "Expiring" }] }),
      assignment("pending", { records: [verified("CSCS"), { type: "Passport", status: "Pending" }] }),
      assignment("pending", { records: [] }), // second row for the same person is ignored
    ],
    matcher
  );
  const inGroup = (g: string) => score.people.filter((p) => p.group === g).map((p) => p.contractorId);

  test("every person appears exactly once", () => {
    assert.equal(score.people.length, score.assignedTotal);
    assert.equal(new Set(score.people.map((p) => p.contractorId)).size, score.people.length);
  });

  test("each group's list matches its count", () => {
    assert.equal(inGroup("compliant").length, score.fullyCompliant);
    assert.equal(inGroup("actionRequired").length, score.actionRequired);
    assert.equal(inGroup("expiring").length, score.expiring);
    assert.equal(inGroup("pending").length, score.pendingReview);
    assert.equal(inGroup("noRequirements").length, score.noRequirements);
  });

  test("a missing document is listed as an issue even though it has no record", () => {
    const p = score.people.find((x) => x.contractorId === "missing")!;
    assert.equal(p.group, "actionRequired");
    assert.deepEqual(p.issues, [{ type: "Passport", status: "Missing" }]);
  });

  test("issues are only the required documents that are not Verified", () => {
    assert.deepEqual(score.people.find((x) => x.contractorId === "ok")!.issues, []);
    assert.deepEqual(score.people.find((x) => x.contractorId === "expired")!.issues, [{ type: "Passport", status: "Expired" }]);
  });

  test("people with nothing required are their own group, not dropped", () => {
    const s = summariseCompliance([assignment("a")], requiresNothing);
    assert.deepEqual(s.people.map((p) => p.group), ["noRequirements"]);
  });
});
