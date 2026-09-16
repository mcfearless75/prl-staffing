import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import {
  verifyRetellWebhookSignature,
  parseRetellWebhookPayload,
} from "@/lib/calls/retell-webhook";

const TEST_API_KEY = "test_retell_key";

function sign(rawBody: string, apiKey: string, timestamp: number): string {
  const digest = crypto
    .createHmac("sha256", apiKey)
    .update(rawBody + timestamp)
    .digest("hex");
  return `v=${timestamp},d=${digest}`;
}

beforeEach(() => {
  process.env.RETELL_API_KEY = TEST_API_KEY;
});

describe("verifyRetellWebhookSignature", () => {
  test("accepts a validly signed body", async () => {
    const rawBody = JSON.stringify({ event: "call_analyzed" });
    const signature = sign(rawBody, TEST_API_KEY, Date.now());
    assert.equal(await verifyRetellWebhookSignature(rawBody, signature), true);
  });

  test("rejects a tampered body", async () => {
    const rawBody = JSON.stringify({ event: "call_analyzed" });
    const signature = sign(rawBody, TEST_API_KEY, Date.now());
    assert.equal(await verifyRetellWebhookSignature(rawBody + "x", signature), false);
  });

  test("rejects an expired timestamp", async () => {
    const rawBody = JSON.stringify({ event: "call_analyzed" });
    const oldTimestamp = Date.now() - 10 * 60 * 1000;
    const signature = sign(rawBody, TEST_API_KEY, oldTimestamp);
    assert.equal(await verifyRetellWebhookSignature(rawBody, signature), false);
  });

  test("rejects a missing signature header", async () => {
    assert.equal(await verifyRetellWebhookSignature("{}", null), false);
  });
});

describe("parseRetellWebhookPayload", () => {
  test("skips non call_analyzed events", () => {
    const result = parseRetellWebhookPayload(
      JSON.stringify({ event: "call_started", call: { call_id: "abc" } })
    );
    assert.deepEqual(result, { ok: true, skip: true, event: "call_started", callId: "abc" });
  });

  test("extracts custom_analysis_data fields for call_analyzed", () => {
    const payload = {
      event: "call_analyzed",
      call: {
        call_id: "call_123",
        from_number: "+441234567890",
        transcript: "Agent: hi\nUser: hello",
        call_analysis: {
          call_summary: "Caller asked about a job.",
          custom_analysis_data: {
            category: "APPLICANT",
            caller_name: "Jane Doe",
            caller_phone: "+447700900000",
            reason: "Wants to apply for a joiner role",
            urgent: false,
          },
        },
      },
    };
    const result = parseRetellWebhookPayload(JSON.stringify(payload));
    assert.equal(result.ok, true);
    if (!result.ok || result.skip) return assert.fail("expected parsed data");
    assert.equal(result.data.retellCallId, "call_123");
    assert.equal(result.data.category, "APPLICANT");
    assert.equal(result.data.callerName, "Jane Doe");
    assert.equal(result.data.callerPhone, "+447700900000");
    assert.equal(result.data.reason, "Wants to apply for a joiner role");
    assert.equal(result.data.urgent, false);
  });

  test("falls back to OTHER category and the call summary as reason when custom data is missing", () => {
    const payload = {
      event: "call_analyzed",
      call: {
        call_id: "call_456",
        transcript: "Agent: hi\nUser: hello",
        call_analysis: { call_summary: "Unclear what the caller wanted." },
      },
    };
    const result = parseRetellWebhookPayload(JSON.stringify(payload));
    assert.equal(result.ok, true);
    if (!result.ok || result.skip) return assert.fail("expected parsed data");
    assert.equal(result.data.category, "OTHER");
    assert.equal(result.data.reason, "Unclear what the caller wanted.");
  });

  test("forces urgent true when category is URGENT even without an explicit flag", () => {
    const payload = {
      event: "call_analyzed",
      call: {
        call_id: "call_789",
        transcript: "Agent: hi\nUser: there's an accident on site",
        call_analysis: {
          call_summary: "Caller reported a site incident.",
          custom_analysis_data: { category: "URGENT", reason: "Site incident" },
        },
      },
    };
    const result = parseRetellWebhookPayload(JSON.stringify(payload));
    assert.equal(result.ok, true);
    if (!result.ok || result.skip) return assert.fail("expected parsed data");
    assert.equal(result.data.urgent, true);
  });

  test("falls back to OTHER category when custom data has an invalid category string", () => {
    const payload = {
      event: "call_analyzed",
      call: {
        call_id: "call_654",
        transcript: "Agent: hi\nUser: hello",
        call_analysis: {
          call_summary: "Unclear what the caller wanted.",
          custom_analysis_data: { category: "BOGUS" },
        },
      },
    };
    const result = parseRetellWebhookPayload(JSON.stringify(payload));
    assert.equal(result.ok, true);
    if (!result.ok || result.skip) return assert.fail("expected parsed data");
    assert.equal(result.data.category, "OTHER");
  });

  test("falls back to call.from_number when caller_phone is absent from custom data", () => {
    const payload = {
      event: "call_analyzed",
      call: {
        call_id: "call_999",
        from_number: "+441111222333",
        transcript: "...",
        call_analysis: { call_summary: "...", custom_analysis_data: { category: "OTHER" } },
      },
    };
    const result = parseRetellWebhookPayload(JSON.stringify(payload));
    assert.equal(result.ok, true);
    if (!result.ok || result.skip) return assert.fail("expected parsed data");
    assert.equal(result.data.callerPhone, "+441111222333");
  });

  test("rejects invalid JSON", () => {
    const result = parseRetellWebhookPayload("not json");
    assert.equal(result.ok, false);
  });

  test("rejects a call_analyzed payload missing call_id", () => {
    const result = parseRetellWebhookPayload(JSON.stringify({ event: "call_analyzed", call: {} }));
    assert.equal(result.ok, false);
  });
});
