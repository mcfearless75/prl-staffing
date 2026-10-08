import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  PIPELINE_STAGES,
  NEW_STARTER_STAGES,
  docsVerifiedBlocked,
  ONBOARDING_STAGES,
  derivePipelineStage,
  pipelineActions,
  canComplete,
  parseNewStarterInput,
  parseIsoDay,
  signLinkState,
  isWellFormedSignToken,
  parseSignature,
  SIGN_LINK_TTL_DAYS,
  type PlacementSnapshot,
} from "@/lib/new-starter-pipeline";
import { PRE_WORK_CONTRACTOR_STATUSES, SETTABLE_CONTRACTOR_STATUSES } from "@/lib/contractor-statuses";

/**
 * The new-starter pipeline: where a person is, what staff can do next, and
 * what the public form and signing page accept. Every stage on /new-starters
 * and every button on a row comes from these functions.
 */

const base: PlacementSnapshot = {
  contractorStatus: "New Starter",
  pendingDocCount: 0,
  agreement: null,
  inductionRequired: true,
};
const at = (over: Partial<PlacementSnapshot>): PlacementSnapshot => ({ ...base, ...over });
const signed = { signedAt: new Date("2026-10-01T10:00:00Z") };
const sent = { signedAt: null };

describe("derivePipelineStage", () => {
  test("a new starter with nothing uploaded is waiting for documents", () => {
    assert.equal(derivePipelineStage(base), "invited");
  });

  test("an upload waiting review moves them to the verification stage", () => {
    assert.equal(derivePipelineStage(at({ pendingDocCount: 1 })), "docs");
  });

  test("once staff mark documents verified (Onboarding) uploads no longer hold them back", () => {
    assert.equal(derivePipelineStage(at({ contractorStatus: "Onboarding", pendingDocCount: 3 })), "onboarding");
    assert.equal(derivePipelineStage(at({ contractorStatus: "Onboarding", agreement: sent })), "onboarding");
  });

  test("a signed agreement always means induction, whatever the status says", () => {
    for (const contractorStatus of ["New Starter", "Onboarding", "Active"]) {
      assert.equal(derivePipelineStage(at({ contractorStatus, agreement: signed, pendingDocCount: 2 })), "induction");
    }
  });

  test("a reused worker already verified (Active) goes straight to the agreement", () => {
    assert.equal(derivePipelineStage(at({ contractorStatus: "Active" })), "onboarding");
  });

  test("every pre-work status that is not Onboarding counts as unverified", () => {
    // Applied/Looking applicants converted into new starters must be verified
    // like anyone else — otherwise they skip straight to the agreement.
    for (const s of PRE_WORK_CONTRACTOR_STATUSES.filter((s) => s !== "Onboarding")) {
      assert.equal(derivePipelineStage(at({ contractorStatus: s })), "invited", s);
    }
  });

  test("always returns one of the four stages the page renders", () => {
    for (const contractorStatus of [...PRE_WORK_CONTRACTOR_STATUSES, ...SETTABLE_CONTRACTOR_STATUSES]) {
      for (const agreement of [null, sent, signed]) {
        for (const pendingDocCount of [0, 2]) {
          const stage = derivePipelineStage(at({ contractorStatus, agreement, pendingDocCount }));
          assert.ok((PIPELINE_STAGES as readonly string[]).includes(stage));
        }
      }
    }
  });
});

describe("pipelineActions", () => {
  test("cancel is offered at every stage — a person can withdraw at any point", () => {
    for (const p of [base, at({ pendingDocCount: 1 }), at({ contractorStatus: "Onboarding" }), at({ agreement: signed })]) {
      assert.ok(pipelineActions(p).includes("cancel"));
    }
  });

  test("before verification: resend invite or mark documents verified", () => {
    assert.deepEqual(pipelineActions(base), ["resend-invite", "docs-verified", "cancel"]);
  });

  test("onboarding: send the agreement, or resend once one is out", () => {
    assert.deepEqual(pipelineActions(at({ contractorStatus: "Onboarding" })), ["send-agreement", "cancel"]);
    assert.deepEqual(pipelineActions(at({ contractorStatus: "Onboarding", agreement: sent })), ["resend-agreement", "cancel"]);
  });

  test("no completion button is ever offered before the agreement is signed", () => {
    const completing = ["induction-done", "no-induction", "complete"];
    for (const agreement of [null, sent]) {
      for (const contractorStatus of ["New Starter", "Onboarding", "Active"]) {
        for (const inductionRequired of [true, false]) {
          const actions = pipelineActions(at({ contractorStatus, agreement, inductionRequired }));
          assert.equal(actions.some((a) => completing.includes(a)), false);
        }
      }
    }
  });

  test("signed: induction choices only when an induction was required", () => {
    assert.deepEqual(pipelineActions(at({ agreement: signed })), ["induction-done", "no-induction", "cancel"]);
    assert.deepEqual(pipelineActions(at({ agreement: signed, inductionRequired: false })), ["complete", "cancel"]);
  });

  test("every offered completion is one canComplete accepts (button and server agree)", () => {
    for (const inductionRequired of [true, false]) {
      const p = at({ agreement: signed, inductionRequired });
      for (const a of pipelineActions(p)) {
        if (a === "induction-done" || a === "no-induction" || a === "complete") {
          assert.equal(canComplete(p, a), null, a);
        }
      }
    }
  });
});

describe("canComplete", () => {
  test("refuses before signing, whatever the mode", () => {
    for (const mode of ["induction-done", "no-induction", "complete"] as const) {
      assert.ok(canComplete(at({ agreement: sent }), mode));
      assert.ok(canComplete(at({ agreement: null, inductionRequired: false }), mode));
    }
  });

  test("refuses the mode that does not match the induction setting", () => {
    assert.ok(canComplete(at({ agreement: signed }), "complete"));
    assert.ok(canComplete(at({ agreement: signed, inductionRequired: false }), "induction-done"));
  });
});

describe("parseNewStarterInput", () => {
  const today = new Date("2026-10-06T12:00:00Z");
  const good = {
    firstName: " Sam ",
    lastName: "Jones",
    phone: "07700 900123",
    email: " Sam.Jones@Example.com ",
    companyId: "cmp_123",
    siteId: "",
    role: "Labourer",
    startDate: "2026-10-12",
    payRate: "18.50",
    chargeRate: "",
    rateBasis: "Hourly",
    inductionRequired: true,
  };
  const parse = (over: Record<string, unknown>) => parseNewStarterInput({ ...good, ...over }, today);

  test("accepts a complete form, trimming and lower-casing the email", () => {
    const r = parse({});
    assert.ok(r.ok);
    assert.equal(r.value.firstName, "Sam");
    assert.equal(r.value.email, "sam.jones@example.com");
    assert.equal(r.value.siteId, null);
    assert.equal(r.value.chargeRate, null);
    assert.equal(r.value.payRate, 18.5);
    assert.equal(r.value.startDate.toISOString(), "2026-10-12T00:00:00.000Z");
  });

  test("rejects each required field when missing or malformed", () => {
    const bad: Record<string, unknown>[] = [
      { firstName: "" }, { lastName: "  " }, { email: "not-an-email" }, { email: "a@prl-placeholder.co.uk" },
      { phone: "call me" }, { companyId: "" }, { companyId: "x'; drop" }, { siteId: "bad id!" }, { role: "" },
      { startDate: "12/10/2026" }, { startDate: "2026-02-31" }, { startDate: "2028-01-01" },
      { payRate: "" }, { payRate: "0" }, { payRate: "-5" }, { payRate: "abc" }, { payRate: "99999" },
      { chargeRate: "lots" }, { rateBasis: "Weekly" },
    ];
    for (const over of bad) assert.equal(parse(over).ok, false, JSON.stringify(over));
  });

  test("induction is required unless explicitly turned off", () => {
    const off = parse({ inductionRequired: false });
    const missing = parse({ inductionRequired: undefined });
    assert.ok(off.ok && missing.ok);
    assert.equal(off.value.inductionRequired, false);
    assert.equal(missing.value.inductionRequired, true);
  });

  test("an optional charge rate and site are kept when given", () => {
    const r = parse({ chargeRate: "£24", siteId: "site_1", rateBasis: "Daily" });
    assert.ok(r.ok);
    assert.equal(r.value.chargeRate, 24);
    assert.equal(r.value.siteId, "site_1");
    assert.equal(r.value.rateBasis, "Daily");
  });
});

describe("parseIsoDay", () => {
  test("is a calendar day, never shifted by timezone", () => {
    assert.equal(parseIsoDay("2026-03-29")?.toISOString(), "2026-03-29T00:00:00.000Z");
    assert.equal(parseIsoDay("29/03/2026"), null);
    assert.equal(parseIsoDay(undefined), null);
  });
});

describe("signLinkState", () => {
  const sentAt = new Date("2026-10-01T09:00:00Z");
  const day = 24 * 60 * 60 * 1000;

  test("unknown token is invalid; signed beats expired", () => {
    assert.equal(signLinkState(null), "invalid");
    assert.equal(signLinkState({ createdAt: sentAt, signedAt: new Date() }, new Date(sentAt.getTime() + 90 * day)), "signed");
  });

  test(`works for ${SIGN_LINK_TTL_DAYS} days and not after`, () => {
    const at = (days: number) => signLinkState({ createdAt: sentAt, signedAt: null }, new Date(sentAt.getTime() + days * day));
    assert.equal(at(0), "ready");
    assert.equal(at(SIGN_LINK_TTL_DAYS), "ready");
    assert.equal(at(SIGN_LINK_TTL_DAYS + 0.01), "expired");
  });
});

describe("isWellFormedSignToken", () => {
  test("accepts 32 random bytes as base64url and nothing else", () => {
    assert.ok(isWellFormedSignToken("A".repeat(43)));
    assert.ok(isWellFormedSignToken("abc-_".padEnd(43, "x")));
    assert.equal(isWellFormedSignToken("A".repeat(42)), false);
    assert.equal(isWellFormedSignToken("A".repeat(42) + "/"), false);
    assert.equal(isWellFormedSignToken(undefined), false);
  });
});

describe("parseSignature", () => {
  test("needs a full name and the tick", () => {
    assert.deepEqual(parseSignature({ name: "  Sam   Jones ", agree: true }), { ok: true, name: "Sam Jones" });
    assert.equal(parseSignature({ name: "Sam", agree: true }).ok, false);
    assert.equal(parseSignature({ name: "Sam Jones", agree: false }).ok, false);
    assert.equal(parseSignature({ name: "Sam Jones", agree: "true" }).ok, false);
  });
});

/**
 * Jenni, 08-10-26: once documents are verified the person moves from New
 * Starters to Onboarding. Every stage must be shown, and counted, in exactly
 * one of the two places, or someone falls through the gap or is chased twice.
 */
describe("New Starters / Onboarding split", () => {
  test("every stage belongs to exactly one area", () => {
    for (const stage of PIPELINE_STAGES) {
      const homes = [NEW_STARTER_STAGES.includes(stage), ONBOARDING_STAGES.includes(stage)].filter(Boolean).length;
      assert.equal(homes, 1, `${stage} is in ${homes} areas`);
    }
    assert.equal(NEW_STARTER_STAGES.length + ONBOARDING_STAGES.length, PIPELINE_STAGES.length);
  });

  test("verified documents move a person to Onboarding", () => {
    assert.ok(ONBOARDING_STAGES.includes("onboarding"));
    assert.ok(NEW_STARTER_STAGES.includes("docs"));
  });
});

/** Jenni, 08-10-26: "Documents verified" can't be pressed while any are still waiting. */
describe("docsVerifiedBlocked", () => {
  test("blocked while documents are waiting, with the count", () => {
    assert.match(docsVerifiedBlocked({ pendingDocCount: 2 }) ?? "", /2 documents are still waiting/);
    assert.match(docsVerifiedBlocked({ pendingDocCount: 1 }) ?? "", /1 document is still waiting/);
  });

  test("allowed once none are waiting", () => {
    assert.equal(docsVerifiedBlocked({ pendingDocCount: 0 }), null);
  });
});
