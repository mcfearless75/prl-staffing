import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { milesBetween, distanceScore, locationFactor } from "@/lib/distance";
import { postcodeGeoReset } from "@/lib/geo-refresh";

/**
 * Smart matching's Location factor. It used to compare free text against the
 * worker's CURRENT assignments, so a free worker always scored 50% whatever
 * was typed. These pin the replacement: real miles from home to site.
 */

const MANCHESTER = { lat: 53.4808, lng: -2.2426 };
const LIVERPOOL = { lat: 53.4084, lng: -2.9916 };
const LONDON = { lat: 51.5074, lng: -0.1278 };
const EDINBURGH = { lat: 55.9533, lng: -3.1883 };

describe("milesBetween", () => {
  test("matches published straight-line distances", () => {
    assert.ok(Math.abs(milesBetween(MANCHESTER, LIVERPOOL) - 31) < 1.5);
    assert.ok(Math.abs(milesBetween(LONDON, EDINBURGH) - 331) < 5);
  });

  test("is zero to itself and symmetric", () => {
    assert.equal(milesBetween(LONDON, LONDON), 0);
    assert.equal(milesBetween(LONDON, EDINBURGH), milesBetween(EDINBURGH, LONDON));
  });
});

describe("distanceScore", () => {
  test("100 on site, 50 at the radius, 0 at twice the radius", () => {
    assert.equal(distanceScore(0, 25), 100);
    assert.equal(distanceScore(25, 25), 50);
    assert.equal(distanceScore(50, 25), 0);
    assert.equal(distanceScore(500, 25), 0);
  });

  test("nearer always scores at least as high", () => {
    for (let m = 0; m < 60; m += 1) {
      assert.ok(distanceScore(m, 25) >= distanceScore(m + 1, 25), `at ${m} mi`);
    }
  });
});

describe("locationFactor", () => {
  test("no origin: neutral, nobody excluded", () => {
    const f = locationFactor(null, MANCHESTER, 25);
    assert.deepEqual(f, { miles: null, score: 50, excluded: false });
  });

  test("worker with no geocoded postcode is kept at neutral, not hidden", () => {
    const f = locationFactor(MANCHESTER, null, 25);
    assert.deepEqual(f, { miles: null, score: 50, excluded: false });
  });

  test("within the radius is kept and scored by distance", () => {
    const f = locationFactor(MANCHESTER, LIVERPOOL, 40);
    assert.equal(f.excluded, false);
    assert.ok(f.miles !== null && f.miles > 30 && f.miles < 32);
    assert.equal(f.score, distanceScore(f.miles!, 40));
  });

  test("beyond the radius is a hard exclusion", () => {
    assert.equal(locationFactor(MANCHESTER, LIVERPOOL, 25).excluded, true);
    assert.equal(locationFactor(LONDON, EDINBURGH, 100).excluded, true);
  });

  test("exactly on the radius is still within", () => {
    const miles = milesBetween(MANCHESTER, LIVERPOOL);
    assert.equal(locationFactor(MANCHESTER, LIVERPOOL, miles).excluded, false);
  });
});

describe("postcodeGeoReset", () => {
  const RESET = { latitude: null, longitude: null, geocodedAt: null };

  test("a changed postcode clears the cached coordinates", () => {
    assert.deepEqual(postcodeGeoReset("M1 1AA", "L1 8JQ"), RESET);
    assert.deepEqual(postcodeGeoReset(null, "L1 8JQ"), RESET);
    assert.deepEqual(postcodeGeoReset("M1 1AA", null), RESET);
  });

  test("the same postcode, however it is typed, keeps them", () => {
    assert.deepEqual(postcodeGeoReset("M1 1AA", "m11aa "), {});
    assert.deepEqual(postcodeGeoReset(null, ""), {});
    assert.deepEqual(postcodeGeoReset("M1 1AA", "M1 1AA"), {});
  });
});
