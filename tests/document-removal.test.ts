import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { planRemoval, planMove, parseRemovalReason } from "@/lib/document-removal";

/**
 * Removing or moving a document filed against the wrong person. The file and
 * its compliance record share one R2 key; handling only half the pair leaves
 * a scan of one person's ID attached to, or orphaned on, another's profile.
 */

const docs = [
  { id: "d1", storageKey: "contractors/A/passport/1.pdf" },
  { id: "d2", storageKey: "contractors/A/cscs/2.pdf" },
];
const recs = [
  { id: "r1", status: "Pending", filePath: "contractors/A/passport/1.pdf" },
  { id: "r2", status: "Verified", filePath: "contractors/A/cscs/2.pdf" },
  { id: "r3", status: "Verified", filePath: null },
];

describe("planRemoval — deleting a file", () => {
  test("removes the file and its auto-created Pending record", () => {
    const plan = planRemoval({ kind: "document", id: "d1" }, recs, docs)!;
    assert.deepEqual(plan.deleteDocumentIds, ["d1"]);
    assert.deepEqual(plan.deleteRecordIds, ["r1"]);
    assert.deepEqual(plan.unlinkRecordIds, []);
    assert.deepEqual(plan.r2Keys, ["contractors/A/passport/1.pdf"]);
  });

  test("keeps a record a person has verified, only clearing its file link", () => {
    const plan = planRemoval({ kind: "document", id: "d2" }, recs, docs)!;
    assert.deepEqual(plan.deleteRecordIds, []);
    assert.deepEqual(plan.unlinkRecordIds, ["r2"]);
    assert.deepEqual(plan.r2Keys, ["contractors/A/cscs/2.pdf"]);
  });

  test("an id that isn't this contractor's is refused", () => {
    assert.equal(planRemoval({ kind: "document", id: "someone-elses" }, recs, docs), null);
  });
});

describe("planRemoval — deleting a record", () => {
  test("takes its file with it, row and R2 object", () => {
    const plan = planRemoval({ kind: "record", id: "r2" }, recs, docs)!;
    assert.deepEqual(plan.deleteRecordIds, ["r2"]);
    assert.deepEqual(plan.deleteDocumentIds, ["d2"]);
    assert.deepEqual(plan.r2Keys, ["contractors/A/cscs/2.pdf"]);
  });

  test("a record with no file deletes nothing else", () => {
    const plan = planRemoval({ kind: "record", id: "r3" }, recs, docs)!;
    assert.deepEqual(plan, { deleteDocumentIds: [], deleteRecordIds: ["r3"], unlinkRecordIds: [], r2Keys: [] });
  });

  test("a second record sharing the file is kept but unlinked", () => {
    const shared = [...recs, { id: "r4", status: "Verified", filePath: "contractors/A/cscs/2.pdf" }];
    const plan = planRemoval({ kind: "record", id: "r2" }, shared, docs)!;
    assert.deepEqual(plan.unlinkRecordIds, ["r4"]);
  });
});

describe("planMove", () => {
  test("a file moves with every record that points at it, whatever its status", () => {
    const shared = [...recs, { id: "r4", status: "Verified", filePath: "contractors/A/passport/1.pdf" }];
    assert.deepEqual(planMove({ kind: "document", id: "d1" }, shared, docs), {
      documentIds: ["d1"],
      recordIds: ["r1", "r4"],
    });
  });

  test("a record moves with its file", () => {
    assert.deepEqual(planMove({ kind: "record", id: "r2" }, recs, docs), {
      documentIds: ["d2"],
      recordIds: ["r2"],
    });
  });

  test("a record without a file moves alone", () => {
    assert.deepEqual(planMove({ kind: "record", id: "r3" }, recs, docs), { documentIds: [], recordIds: ["r3"] });
  });

  test("refuses an id that isn't this contractor's", () => {
    assert.equal(planMove({ kind: "record", id: "nope" }, recs, docs), null);
  });
});

describe("parseRemovalReason", () => {
  test("accepts the fixed reasons", () => {
    assert.equal(parseRemovalReason("Wrong person", ""), "Wrong person");
  });

  test("Other needs a description", () => {
    assert.equal(parseRemovalReason("Other", "  "), null);
    assert.equal(parseRemovalReason("Other", "blurry scan"), "Other: blurry scan");
  });

  test("rejects anything else", () => {
    assert.equal(parseRemovalReason("because", ""), null);
    assert.equal(parseRemovalReason(undefined, ""), null);
  });
});
