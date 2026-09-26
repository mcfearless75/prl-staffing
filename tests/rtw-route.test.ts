import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { isValidComplianceType } from "@/lib/compliance-types";
import {
  RTW_ROUTES,
  maskShareCode,
  formatShareCode,
  normaliseShareCode,
  parseRtwRoute,
  rtwProgress,
  type RtwRoute,
} from "@/lib/rtw-route";

/**
 * The worker's Right to Work route. A wrong type name here would ask for a
 * document the upload API can never file, so the route could never complete.
 */

describe("RTW_ROUTES", () => {
  test("every required document is a real compliance type", () => {
    for (const [route, r] of Object.entries(RTW_ROUTES)) {
      for (const d of r.docs) assert.ok(isValidComplianceType(d.type), `${route}: ${d.type}`);
    }
  });

  test("only the non-UK passport route needs a share code", () => {
    assert.deepEqual(
      (Object.keys(RTW_ROUTES) as RtwRoute[]).filter((k) => RTW_ROUTES[k].needsShareCode),
      ["passport-share-code"]
    );
  });
});

describe("rtwProgress", () => {
  test("no route chosen is never complete", () => {
    assert.equal(rtwProgress(null, new Set(["Passport — UK or Ireland"]), false).complete, false);
  });

  test("UK/Irish passport completes on its passport alone", () => {
    assert.equal(rtwProgress("uk-irish-passport", new Set(["Passport — UK or Ireland"]), false).complete, true);
  });

  test("non-UK passport needs the share code too", () => {
    const docs = new Set(["Passport — Other Nationality"]);
    assert.equal(rtwProgress("passport-share-code", docs, false).complete, false);
    assert.equal(rtwProgress("passport-share-code", docs, true).complete, true);
  });

  test("birth certificate route needs both documents", () => {
    const p = rtwProgress("birth-cert-ni", new Set(["Birth Certificate"]), false);
    assert.deepEqual(p.items.map((i) => i.done), [true, false]);
    assert.equal(p.complete, false);
  });

  test("the other route's documents don't count", () => {
    assert.equal(rtwProgress("uk-irish-passport", new Set(["Passport — Other Nationality"]), true).complete, false);
  });
});

describe("share codes", () => {
  test("accepts spaces, hyphens and lower case", () => {
    assert.equal(normaliseShareCode("w12 345-67x"), "W1234567X");
  });

  test("rejects the wrong length or symbols", () => {
    assert.equal(normaliseShareCode("W1234567"), null);
    assert.equal(normaliseShareCode("W12345678X"), null);
    assert.equal(normaliseShareCode("W1234567!"), null);
    assert.equal(normaliseShareCode(undefined), null);
  });

  test("formats and masks", () => {
    assert.equal(formatShareCode("W1234567X"), "W12 345 67X");
    assert.equal(maskShareCode("W1234567X"), "••• ••• 67X");
  });

  test("parseRtwRoute only accepts known routes", () => {
    assert.equal(parseRtwRoute("birth-cert-ni"), "birth-cert-ni");
    assert.equal(parseRtwRoute("toString"), null);
    assert.equal(parseRtwRoute("driving-licence"), null);
  });
});
