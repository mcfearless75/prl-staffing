import { test } from "node:test";
import assert from "node:assert/strict";
import { missingEmergencyFields } from "@/lib/emergency-contact";

test("complete contact reports nothing missing", () => {
  assert.deepEqual(
    missingEmergencyFields({ emergencyContactName: "Jane Smith", emergencyContactPhone: "07700 900123" }),
    []
  );
});

test("reports name and phone separately", () => {
  assert.deepEqual(
    missingEmergencyFields({ emergencyContactName: null, emergencyContactPhone: "07700 900123" }),
    ["Name"]
  );
  assert.deepEqual(
    missingEmergencyFields({ emergencyContactName: "Jane Smith", emergencyContactPhone: undefined }),
    ["Phone"]
  );
  assert.deepEqual(
    missingEmergencyFields({ emergencyContactName: null, emergencyContactPhone: null }),
    ["Name", "Phone"]
  );
});

test("empty and whitespace-only values count as missing", () => {
  assert.deepEqual(
    missingEmergencyFields({ emergencyContactName: "   ", emergencyContactPhone: "" }),
    ["Name", "Phone"]
  );
  assert.deepEqual(
    missingEmergencyFields({ emergencyContactName: "\t\n", emergencyContactPhone: " 07700 900123 " }),
    ["Name"]
  );
});
