import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { parseSiteContact, siteAddressLine } from "@/lib/site-contact";

/**
 * Site contacts are stored once on the site and copied into every agreement
 * for it (Jenni, 08-10-26), so what's stored must be tidy and a bad email
 * must never get through.
 */
const form = (fields: Record<string, string>) => (k: string) => fields[k];

describe("parseSiteContact", () => {
  test("tidies the three fields", () => {
    const r = parseSiteContact(form({ contactName: "  Boss   Test ", contactPhone: " 07700 900123 ", contactEmail: " Boss@Site.CO.UK " }));
    assert.deepEqual(r, { contact: { contactName: "Boss Test", contactPhone: "07700 900123", contactEmail: "boss@site.co.uk" } });
  });

  test("blank fields are stored as nothing", () => {
    assert.deepEqual(parseSiteContact(form({ contactName: " ", contactPhone: "" })), {
      contact: { contactName: null, contactPhone: null, contactEmail: null },
    });
  });

  test("a malformed email is rejected, not stored", () => {
    const r = parseSiteContact(form({ contactEmail: "boss at site" }));
    assert.ok("error" in r);
  });
});

describe("siteAddressLine", () => {
  test("joins what's there, postcode in capitals", () => {
    assert.equal(siteAddressLine({ address: "duxbury street", city: "chorley", postcode: "pr7 8hg" }), "duxbury street, chorley, PR7 8HG");
    assert.equal(siteAddressLine({ address: null, city: "Chorley", postcode: null }), "Chorley");
    assert.equal(siteAddressLine({}), "");
  });
});
