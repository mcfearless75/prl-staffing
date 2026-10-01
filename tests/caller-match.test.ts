import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { buildCallerIndex, matchCaller, type CallerMatchContractor } from "@/lib/calls/caller-match";

/**
 * Missed-call → contractor lookup on /calls. A wrong "phone" match puts the
 * wrong person's name next to a call, so the invariants are: number formats
 * never matter, placeholders never match, and a name-only guess never outranks
 * or masquerades as a phone match.
 */

const c = (id: string, firstName: string, lastName: string, phone: string | null): CallerMatchContractor => ({
  id,
  firstName,
  lastName,
  phone,
  status: "Active",
});

const book = [
  c("a", "Paul", "McWilliam", "07841 636133"),
  c("b", "Jane", "Doe", "0000000000"),
  c("c", "John", "Smith", "07700900111"),
  c("d", "Mary", "Smith", "07700 900111"), // shared household phone
  c("e", "Tom", "Jones", null),
];
const index = buildCallerIndex(book);

describe("matchCaller", () => {
  test("matches across +44 / 0 / spacing formats", () => {
    for (const phone of ["+447841636133", "07841636133", "447841 636 133"]) {
      const m = matchCaller(index, phone, null);
      assert.equal(m?.basis, "phone");
      assert.deepEqual(m?.contractors.map((x) => x.id), ["a"]);
    }
  });

  test("returns every contractor sharing a number", () => {
    const m = matchCaller(index, "+447700900111", null);
    assert.deepEqual(m?.contractors.map((x) => x.id).sort(), ["c", "d"]);
  });

  test("placeholder numbers never match", () => {
    assert.equal(matchCaller(index, "0000000000", null), null);
  });

  test("phone match wins over a different spoken name", () => {
    const m = matchCaller(index, "+447841636133", "Tom Jones");
    assert.equal(m?.basis, "phone");
    assert.equal(m?.contractors[0].id, "a");
  });

  test("falls back to name only when the number is unknown", () => {
    const m = matchCaller(index, "+447999999999", "tom  JONES");
    assert.equal(m?.basis, "name");
    assert.deepEqual(m?.contractors.map((x) => x.id), ["e"]);
  });

  test("uses first and last word of a spoken name", () => {
    const m = matchCaller(index, null, "Paul James McWilliam");
    assert.equal(m?.basis, "name");
  });

  test("a single name or nothing never matches", () => {
    assert.equal(matchCaller(index, null, "Paul"), null);
    assert.equal(matchCaller(index, null, null), null);
  });
});
