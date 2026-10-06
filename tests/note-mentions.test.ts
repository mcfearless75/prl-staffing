import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  extractMentionTokens,
  resolveMentions,
  segmentMentions,
  mentionHandle,
  suggestMentions,
  activeMentionQuery,
  describeUnresolved,
  type MentionableUser,
} from "@/lib/note-mentions";

const adella: MentionableUser = { id: "u1", name: "Adella Brown", email: "adella@prlsitesolutions.co.uk" };
const jen1: MentionableUser = { id: "u2", name: "Jen Smith", email: "jen.smith@prlsitesolutions.co.uk" };
const jen2: MentionableUser = { id: "u3", name: "jen Jones", email: "jjones@prlsitesolutions.co.uk" };
const paul: MentionableUser = { id: "u4", name: "Paul McFarlane", email: "infotech@prlsitesolutions.co.uk" };
const STAFF = [adella, jen1, jen2, paul];

describe("extractMentionTokens", () => {
  test("finds handles, lower-cases and de-duplicates them", () => {
    assert.deepEqual(extractMentionTokens("@Adella and @paul, then @ADELLA again"), ["adella", "paul"]);
  });

  test("an email address in the note is not a mention", () => {
    assert.deepEqual(extractMentionTokens("sent to joe@prlsitesolutions.co.uk today"), []);
  });

  test("trailing sentence punctuation is not part of the handle", () => {
    assert.deepEqual(extractMentionTokens("Thanks @paul. Ask @jen.smith."), ["paul", "jen.smith"]);
  });

  test("a bare @ or @ followed by a digit is ignored", () => {
    assert.deepEqual(extractMentionTokens("meet @ 3pm, room @2"), []);
  });

  test("mentions at the start of the text and after newlines/brackets count", () => {
    assert.deepEqual(extractMentionTokens("@paul\n(@adella)"), ["paul", "adella"]);
  });
});

describe("resolveMentions", () => {
  test("matches by first name, case-insensitively", () => {
    const r = resolveMentions("@PAUL please check", STAFF);
    assert.deepEqual(r.matched.map((u) => u.id), ["u4"]);
  });

  test("matches by email local part", () => {
    const r = resolveMentions("@infotech and @jen.smith", STAFF);
    assert.deepEqual(r.matched.map((u) => u.id), ["u4", "u2"]);
  });

  test("an ambiguous first name matches NOBODY and is reported", () => {
    const r = resolveMentions("@jen can you look", STAFF);
    assert.equal(r.matched.length, 0);
    assert.deepEqual(r.ambiguous, ["jen"]);
  });

  test("the same person mentioned two ways is matched once", () => {
    const r = resolveMentions("@paul / @infotech", STAFF);
    assert.deepEqual(r.matched.map((u) => u.id), ["u4"]);
  });

  test("unknown handles are reported, not matched", () => {
    const r = resolveMentions("@nobody", STAFF);
    assert.deepEqual(r, { matched: [], ambiguous: [], unknown: ["nobody"] });
  });

  test("email local part wins over another person's first name", () => {
    const infotechPerson = { id: "u9", name: "Infotech Bot", email: "bot@x.co.uk" };
    const r = resolveMentions("@infotech", [...STAFF, infotechPerson]);
    assert.deepEqual(r.matched.map((u) => u.id), ["u4"]);
  });
});

describe("segmentMentions", () => {
  test("rejoining the segments reproduces the original text", () => {
    const text = "Hi @adella, @jen and @nobody — mail joe@x.com. @Paul!";
    const segs = segmentMentions(text, STAFF);
    assert.equal(segs.map((s) => s.text).join(""), text);
  });

  test("only resolved mentions are highlighted", () => {
    const segs = segmentMentions("Hi @adella, @jen and @Paul.", STAFF);
    const mentions = segs.filter((s) => s.kind === "mention");
    assert.deepEqual(mentions.map((s) => s.text), ["@adella", "@Paul"]);
  });
});

describe("mentionHandle / suggestMentions", () => {
  test("a unique first name is used as the handle", () => {
    assert.equal(mentionHandle(paul, STAFF), "paul");
  });

  test("a clashing first name falls back to the email local part", () => {
    assert.equal(mentionHandle(jen1, STAFF), "jen.smith");
    assert.equal(mentionHandle(jen2, STAFF), "jjones");
  });

  test("every inserted handle resolves back to exactly that person", () => {
    for (const u of STAFF) {
      const r = resolveMentions(`@${mentionHandle(u, STAFF)}`, STAFF);
      assert.deepEqual(r.matched.map((m) => m.id), [u.id]);
    }
  });

  test("suggests by first-name or email prefix", () => {
    assert.deepEqual(suggestMentions("je", STAFF).map((u) => u.id).sort(), ["u2", "u3"]);
    assert.deepEqual(suggestMentions("info", STAFF).map((u) => u.id), ["u4"]);
  });
});

describe("activeMentionQuery", () => {
  test("detects the handle being typed at the caret", () => {
    assert.equal(activeMentionQuery("hello @ad"), "ad");
    assert.equal(activeMentionQuery("@"), "");
    assert.equal(activeMentionQuery("hello @ad and"), null);
    assert.equal(activeMentionQuery("joe@prl"), null);
  });
});

describe("describeUnresolved", () => {
  test("nothing to say when everything resolved", () => {
    assert.equal(describeUnresolved({ ambiguous: [], unknown: [] }), null);
  });

  test("names the ambiguous handle", () => {
    assert.match(describeUnresolved({ ambiguous: ["jen"], unknown: [] }) ?? "", /@jen matches more than one person/);
  });
});
