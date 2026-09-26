import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { effectiveKnownAs, greetingName, fullName, normaliseKnownAs } from "@/lib/contractor-name";

/**
 * "Known as" names. Every email greets through greetingName(), so a bug here
 * either ignores the name someone asked to be called or greets them "Hi ,".
 */

describe("greetingName", () => {
  test("uses known-as when set", () => {
    assert.equal(greetingName({ firstName: "Robert", knownAs: "Bob" }), "Bob");
  });

  test("falls back to first name when known-as is blank or whitespace", () => {
    assert.equal(greetingName({ firstName: "Robert", knownAs: null }), "Robert");
    assert.equal(greetingName({ firstName: "Robert", knownAs: "   " }), "Robert");
  });

  test("never greets an empty name", () => {
    assert.equal(greetingName({ firstName: "", knownAs: "" }), "there");
    assert.equal(greetingName({ firstName: null }, "Contractor"), "Contractor");
  });

  test("trims both names", () => {
    assert.equal(greetingName({ firstName: " Robert ", knownAs: " Bob " }), "Bob");
  });
});

describe("effectiveKnownAs", () => {
  test("a known-as identical to the first name adds nothing", () => {
    assert.equal(effectiveKnownAs({ firstName: "Robert", knownAs: "robert" }), null);
  });

  test("a real nickname is kept", () => {
    assert.equal(effectiveKnownAs({ firstName: "Robert", knownAs: "Bob" }), "Bob");
  });
});

describe("fullName", () => {
  test("is the legal name, never the nickname", () => {
    assert.equal(fullName({ firstName: "Robert", lastName: "Smith", knownAs: "Bob" }), "Robert Smith");
  });

  test("tolerates a missing part", () => {
    assert.equal(fullName({ firstName: "Robert", lastName: null }), "Robert");
  });
});

describe("normaliseKnownAs", () => {
  test("blank, non-string and same-as-first all store null", () => {
    assert.equal(normaliseKnownAs("", "Robert"), null);
    assert.equal(normaliseKnownAs(null, "Robert"), null);
    assert.equal(normaliseKnownAs("Robert", "Robert"), null);
  });

  test("keeps and trims a real nickname, capped at 60 chars", () => {
    assert.equal(normaliseKnownAs("  Bob ", "Robert"), "Bob");
    assert.equal(normaliseKnownAs("x".repeat(80), "Robert")?.length, 60);
  });
});
