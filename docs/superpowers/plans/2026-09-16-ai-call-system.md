# AI Call System (Retell) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give PRL Site Solutions' 0800 number an AI fallback (Retell AI) for
unanswered/after-hours calls, with every call triaged into one of four
categories, logged in PRISM, and emailed to the office.

**Architecture:** A single Retell voice agent (configured on Retell's
platform, not in this repo) has the conversation and classifies the caller.
When the call ends, Retell's Post-Call Analysis fires one signed webhook to a
new PRISM route, which verifies the signature, stores a `CallEnquiry` row,
and emails the team. A new staff-only `/calls` page lists and actions those
rows.

**Tech Stack:** Next.js 16 App Router, Prisma 6 / PostgreSQL, `retell-sdk`
(new dependency, for webhook signature verification), existing `sendEmail()`
/ Resend helper, `node:test` via `tsx` for unit tests.

**Spec:** [docs/superpowers/specs/2026-09-16-ai-call-system-design.md](../specs/2026-09-16-ai-call-system-design.md)

## Global Constraints

- IDs are `String @id @default(cuid())` — no autoincrement, no `uuid()`.
- Status/category-like fields are plain `String` with a `@default(...)` and a
  `//` comment pointing at the `src/lib` file that owns the vocabulary — this
  codebase has no Prisma `enum` blocks.
- No `DATABASE_URL` is available locally — migrations are hand-written SQL
  files under `prisma/migrations/YYYYMMDD_snake_case_description/`, applied
  automatically by `prisma migrate deploy` in the `start` script on Railway
  deploy. Do not attempt `prisma migrate dev` locally.
- `npx prisma generate` does not need a DB connection and must be run after
  any schema change so local types are current — stop `npm run dev` first
  (it EPERMs on Windows otherwise).
- Local `.env` carries zero credentials; new secrets (`RETELL_API_KEY`) are
  Railway-only and are out of scope for Claude to set — flagged as a manual
  step in Task 8.
- `.env.example` is excluded from file access in this environment (denied by
  permission rule) — its update is a manual step for the user, given verbatim
  in Task 8, not something Claude edits directly.
- Tests live in `tests/*.test.ts`, run via `tsx --test "tests/**/*.test.ts"`
  (`npm test`), using `node:test` + `node:assert/strict` (`describe`/`test`,
  not `it`). Only pure functions in `src/lib` are unit tested — `route.ts`
  files are not (Next.js route handlers aren't importable in isolation here).
- After every task: `npx tsc --noEmit` must pass.
- Run `npm test` after any task that adds/changes a `tests/*.test.ts` file.

### Confirmed Retell webhook contract (verified against docs.retellai.com, 2026-09-16)

- Signature header: `X-Retell-Signature`, format `v={unix_ms_timestamp},d={hex_hmac_sha256}`.
- The HMAC is computed over `rawBody + timestamp` (string concatenation, no
  separator), keyed with the Retell **API key that has the "webhook" badge**
  enabled in the Retell dashboard — there is no separate webhook secret.
  `RETELL_API_KEY` is that one value, used for both this and any future
  Retell API calls.
- Verify with the official `retell-sdk` package: `Retell.verify(rawBody, apiKey, signatureHeader)`
  (async, returns boolean) — it enforces the ~5 minute freshness window and
  does a constant-time comparison. Do not hand-roll the HMAC check.
- Must verify against the **raw request body string**, never a re-serialized
  `JSON.stringify` of the parsed body.
- Webhook payload: `{ "event": "call_started" | "call_ended" | "call_analyzed" | ..., "call": {...} }`.
  Only `call_analyzed` carries the populated `call.call_analysis` object
  (`call_summary`, `in_voicemail`, `user_sentiment`, `call_successful`,
  `custom_analysis_data`). Other event types must be acknowledged (204) and
  ignored.
- `call.call_analysis.custom_analysis_data` holds whatever fields we define
  in the Retell agent's Post-Call Analysis schema — we control the key names
  (see Task 8's exact schema).
- Retell retries a webhook up to 3 times if it doesn't get a 2xx within 10
  seconds — the same `call.call_id` can arrive more than once. The handler
  must be idempotent on `retellCallId`.

---

### Task 1: `CallEnquiry` Prisma model + migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260916_call_enquiry/migration.sql`
- Create: `src/lib/calls/constants.ts`

**Interfaces:**
- Produces: `CALL_ENQUIRY_CATEGORIES: readonly ["APPLICANT", "CONTRACTOR_QUERY", "CLIENT_ENQUIRY", "URGENT", "OTHER"]`,
  `type CallEnquiryCategory`, `isCallEnquiryCategory(value: unknown): value is CallEnquiryCategory`,
  `CALL_ENQUIRY_STATUSES: readonly ["New", "Actioned"]`, `type CallEnquiryStatus` —
  all exported from `src/lib/calls/constants.ts`. Later tasks (webhook lib,
  webhook route, dashboard pages) import from here rather than re-declaring
  the vocabulary, per this codebase's existing convention of one shared
  source of truth per status/category list.
- Produces: Prisma model `CallEnquiry` with fields `id, retellCallId, category,
  callerName, callerPhone, contractorIdHint, reason, summary, transcript,
  urgent, status, receivedAt, actionedBy, actionedAt` — consumed by every
  later task.

- [ ] **Step 1: Add the constants file**

```ts
// src/lib/calls/constants.ts
export const CALL_ENQUIRY_CATEGORIES = [
  "APPLICANT",
  "CONTRACTOR_QUERY",
  "CLIENT_ENQUIRY",
  "URGENT",
  "OTHER",
] as const;

export type CallEnquiryCategory = (typeof CALL_ENQUIRY_CATEGORIES)[number];

export function isCallEnquiryCategory(value: unknown): value is CallEnquiryCategory {
  return (
    typeof value === "string" &&
    (CALL_ENQUIRY_CATEGORIES as readonly string[]).includes(value)
  );
}

export const CALL_ENQUIRY_STATUSES = ["New", "Actioned"] as const;

export type CallEnquiryStatus = (typeof CALL_ENQUIRY_STATUSES)[number];
```

- [ ] **Step 2: Write a failing test for the category guard**

```ts
// tests/call-enquiry-constants.test.ts
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { isCallEnquiryCategory, CALL_ENQUIRY_CATEGORIES } from "@/lib/calls/constants";

describe("isCallEnquiryCategory", () => {
  test("accepts every declared category", () => {
    for (const category of CALL_ENQUIRY_CATEGORIES) {
      assert.equal(isCallEnquiryCategory(category), true);
    }
  });

  test("rejects an unknown string", () => {
    assert.equal(isCallEnquiryCategory("NOT_A_CATEGORY"), false);
  });

  test("rejects non-string values", () => {
    assert.equal(isCallEnquiryCategory(undefined), false);
    assert.equal(isCallEnquiryCategory(42), false);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- --test-name-pattern isCallEnquiryCategory`
Expected: FAIL — `@/lib/calls/constants` not found (Step 1 not yet on disk
when this is run standalone; if Steps 1 and 2 are done together, skip
straight to Step 4).

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`
Expected: PASS, including the 3 new `isCallEnquiryCategory` tests.

- [ ] **Step 5: Add the Prisma model**

Append to `prisma/schema.prisma` (after the last existing model):

```prisma
model CallEnquiry {
  id               String    @id @default(cuid())
  retellCallId     String    @unique
  category         String // See src/lib/calls/constants.ts — APPLICANT, CONTRACTOR_QUERY, CLIENT_ENQUIRY, URGENT, OTHER
  callerName       String?
  callerPhone      String?
  contractorIdHint String?
  reason           String
  summary          String
  transcript       String    @db.Text
  urgent           Boolean   @default(false)
  status           String    @default("New") // See src/lib/calls/constants.ts — New, Actioned
  receivedAt       DateTime  @default(now())
  actionedBy       String?
  actionedAt       DateTime?

  @@index([status, receivedAt])
  @@index([category])
}
```

- [ ] **Step 6: Hand-write the migration**

Create `prisma/migrations/20260916_call_enquiry/migration.sql`:

```sql
-- Stores overflow/after-hours call enquiries captured by the Retell AI voice
-- agent behind the 0800 number's Tamar phonedivert hunt groups. Written by
-- POST /api/calls/retell-webhook once Retell's post-call analysis completes.
CREATE TABLE "CallEnquiry" (
    "id" TEXT NOT NULL,
    "retellCallId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "callerName" TEXT,
    "callerPhone" TEXT,
    "contractorIdHint" TEXT,
    "reason" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "transcript" TEXT NOT NULL,
    "urgent" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'New',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actionedBy" TEXT,
    "actionedAt" TIMESTAMP(3),

    CONSTRAINT "CallEnquiry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CallEnquiry_retellCallId_key" ON "CallEnquiry"("retellCallId");

CREATE INDEX "CallEnquiry_status_receivedAt_idx" ON "CallEnquiry"("status", "receivedAt");

CREATE INDEX "CallEnquiry_category_idx" ON "CallEnquiry"("category");
```

- [ ] **Step 7: Validate the schema and regenerate the client**

Stop `npm run dev` if it's running (Windows EPERMs `prisma generate`
otherwise), then run:

```bash
npx prisma validate
npx prisma generate
npx tsc --noEmit
```

Expected: all three succeed with no errors. `prisma.callEnquiry` is now a
valid client method for later tasks.

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260916_call_enquiry src/lib/calls/constants.ts tests/call-enquiry-constants.test.ts
git commit -m "feat: add CallEnquiry model for the AI call system"
```

---

### Task 2: Retell webhook signature verification + payload parsing

**Files:**
- Create: `src/lib/calls/retell-webhook.ts`
- Test: `tests/retell-webhook.test.ts`
- Modify: `package.json` (add `retell-sdk` dependency)

**Interfaces:**
- Consumes: `CallEnquiryCategory`, `isCallEnquiryCategory` from `@/lib/calls/constants` (Task 1).
- Produces:
  - `verifyRetellWebhookSignature(rawBody: string, signatureHeader: string | null): Promise<boolean>`
  - `parseRetellWebhookPayload(rawBody: string): ParseResult`, where
    ```ts
    interface ParsedCallEnquiry {
      retellCallId: string;
      category: CallEnquiryCategory;
      callerName: string | null;
      callerPhone: string | null;
      contractorIdHint: string | null;
      reason: string;
      summary: string;
      transcript: string;
      urgent: boolean;
    }
    type ParseResult =
      | { ok: true; skip: true }
      | { ok: true; skip: false; data: ParsedCallEnquiry }
      | { ok: false; error: string };
    ```
  Consumed by Task 4's webhook route.

- [ ] **Step 1: Install the Retell SDK**

```bash
npm install retell-sdk
```

- [ ] **Step 2: Write the failing tests**

```ts
// tests/retell-webhook.test.ts
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
    assert.deepEqual(result, { ok: true, skip: true });
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
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '@/lib/calls/retell-webhook'`.

- [ ] **Step 4: Implement the library**

```ts
// src/lib/calls/retell-webhook.ts
import { Retell } from "retell-sdk";
import { isCallEnquiryCategory, type CallEnquiryCategory } from "@/lib/calls/constants";

export interface ParsedCallEnquiry {
  retellCallId: string;
  category: CallEnquiryCategory;
  callerName: string | null;
  callerPhone: string | null;
  contractorIdHint: string | null;
  reason: string;
  summary: string;
  transcript: string;
  urgent: boolean;
}

export type ParseResult =
  | { ok: true; skip: true }
  | { ok: true; skip: false; data: ParsedCallEnquiry }
  | { ok: false; error: string };

function getRetellApiKey(): string {
  const key = process.env.RETELL_API_KEY;
  if (!key) throw new Error("RETELL_API_KEY is not configured");
  return key;
}

/**
 * Verifies the raw request body against Retell's X-Retell-Signature header.
 * Must be called with the RAW body string — never a re-serialized JSON.stringify
 * of the parsed body, or verification will fail.
 */
export async function verifyRetellWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): Promise<boolean> {
  if (!signatureHeader) return false;
  return Retell.verify(rawBody, getRetellApiKey(), signatureHeader);
}

export function parseRetellWebhookPayload(rawBody: string): ParseResult {
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return { ok: false, error: "Invalid JSON body" };
  }

  if (typeof payload !== "object" || payload === null) {
    return { ok: false, error: "Payload is not an object" };
  }
  const root = payload as Record<string, unknown>;

  if (root.event !== "call_analyzed") {
    return { ok: true, skip: true };
  }

  if (typeof root.call !== "object" || root.call === null) {
    return { ok: false, error: "Missing call object" };
  }
  const call = root.call as Record<string, unknown>;

  const callId = call.call_id;
  if (typeof callId !== "string" || callId.length === 0) {
    return { ok: false, error: "Missing call.call_id" };
  }

  const analysis =
    typeof call.call_analysis === "object" && call.call_analysis !== null
      ? (call.call_analysis as Record<string, unknown>)
      : {};
  const custom =
    typeof analysis.custom_analysis_data === "object" && analysis.custom_analysis_data !== null
      ? (analysis.custom_analysis_data as Record<string, unknown>)
      : {};

  const category = isCallEnquiryCategory(custom.category) ? custom.category : "OTHER";
  const transcript = typeof call.transcript === "string" ? call.transcript : "";
  const summary = typeof analysis.call_summary === "string" ? analysis.call_summary : "";
  const reason =
    typeof custom.reason === "string" && custom.reason.length > 0 ? custom.reason : summary;
  const callerPhone =
    (typeof custom.caller_phone === "string" && custom.caller_phone) ||
    (typeof call.from_number === "string" ? call.from_number : null) ||
    null;

  return {
    ok: true,
    skip: false,
    data: {
      retellCallId: callId,
      category,
      callerName: typeof custom.caller_name === "string" ? custom.caller_name : null,
      callerPhone,
      contractorIdHint:
        typeof custom.contractor_id_hint === "string" ? custom.contractor_id_hint : null,
      reason,
      summary,
      transcript,
      urgent: custom.urgent === true || category === "URGENT",
    },
  };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, all `verifyRetellWebhookSignature` and `parseRetellWebhookPayload` tests green.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/lib/calls/retell-webhook.ts tests/retell-webhook.test.ts
git commit -m "feat: verify and parse Retell post-call webhook payloads"
```

---

### Task 3: Call enquiry email recipients

**Files:**
- Modify: `src/lib/email.ts`

**Interfaces:**
- Produces: `CALL_ENQUIRY_RECIPIENTS: string[]`, exported alongside the
  existing `GRIEVANCE_RECIPIENTS` etc. constants. Consumed by Task 4's
  webhook route.

- [ ] **Step 1: Add the recipient list**

In `src/lib/email.ts`, immediately after the existing `COMPLIANCE_RECIPIENTS`
export (currently the last recipient-list export in the file), add:

```ts
export const CALL_ENQUIRY_RECIPIENTS = recipientList(process.env.CALL_ENQUIRY_RECIPIENTS, [
  "adella@prlsitesolutions.co.uk",
  "keenan@prlsitesolutions.co.uk",
  "helen@prlsitesolutions.co.uk",
  "jenni@prlsitesolutions.co.uk",
  "sian@prlsitesolutions.co.uk",
  "erica@prlsitesolutions.co.uk",
]);
```

This follows the exact existing `recipientList(envValue, fallback)` pattern
already used by every other recipient constant in this file — no new helper
needed.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/email.ts
git commit -m "feat: add call enquiry notification recipients"
```

---

### Task 4: Webhook route `POST /api/calls/retell-webhook`

**Files:**
- Create: `src/app/api/calls/retell-webhook/route.ts`

**Interfaces:**
- Consumes: `verifyRetellWebhookSignature`, `parseRetellWebhookPayload` from
  `@/lib/calls/retell-webhook` (Task 2); `sendEmail`, `CALL_ENQUIRY_RECIPIENTS`
  from `@/lib/email` (Task 3); `prisma.callEnquiry` (Task 1); `prisma` from `@/lib/db`.
- Produces: the live webhook endpoint Retell will be configured to call (Task 8).

Not unit tested per this repo's convention (route handlers aren't imported
in isolation) — verified manually in Step 4 below with `curl`, then again
end-to-end once the Retell agent exists (Task 8).

- [ ] **Step 1: Implement the route**

```ts
// src/app/api/calls/retell-webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sendEmail, CALL_ENQUIRY_RECIPIENTS } from "@/lib/email";
import { verifyRetellWebhookSignature, parseRetellWebhookPayload } from "@/lib/calls/retell-webhook";

// Machine-to-machine endpoint: Retell may burst-retry (up to 3x within 10s
// per call) and multiple real calls can land close together, so this limit
// is far higher than the per-IP limits used on human-facing public forms.
const ipRequests = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT = 200;
const WINDOW_MS = 60 * 60 * 1000;

function checkIpRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipRequests.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    ipRequests.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count += 1;
  return true;
}

function categoryLabel(category: string): string {
  switch (category) {
    case "APPLICANT":
      return "New Applicant";
    case "CONTRACTOR_QUERY":
      return "Contractor Query";
    case "CLIENT_ENQUIRY":
      return "Client Enquiry";
    case "URGENT":
      return "Urgent";
    default:
      return "Other";
  }
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkIpRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-retell-signature");

  let verified = false;
  try {
    verified = await verifyRetellWebhookSignature(rawBody, signature);
  } catch (error) {
    console.error("Retell webhook signature verification could not run:", error);
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  if (!verified) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const parsed = parseRetellWebhookPayload(rawBody);
  if (!parsed.ok) {
    console.error("Retell webhook payload rejected:", parsed.error);
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  if (parsed.skip) {
    return new NextResponse(null, { status: 204 });
  }

  const { data } = parsed;

  const existing = await prisma.callEnquiry.findUnique({
    where: { retellCallId: data.retellCallId },
  });
  if (existing) {
    // Already processed — Retell retry, not a new call.
    return new NextResponse(null, { status: 204 });
  }

  let enquiryId: string;
  try {
    const enquiry = await prisma.callEnquiry.create({
      data: {
        retellCallId: data.retellCallId,
        category: data.category,
        callerName: data.callerName,
        callerPhone: data.callerPhone,
        contractorIdHint: data.contractorIdHint,
        reason: data.reason,
        summary: data.summary,
        transcript: data.transcript,
        urgent: data.urgent,
      },
    });
    enquiryId = enquiry.id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      // Two retries raced past the findUnique check above.
      return new NextResponse(null, { status: 204 });
    }
    console.error("Failed to record call enquiry:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  const emailResult = await sendEmail({
    to: CALL_ENQUIRY_RECIPIENTS,
    subject: `${data.urgent ? "[URGENT] " : ""}Call enquiry: ${categoryLabel(data.category)}`,
    template: "call-enquiry",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#1F4E79;">${categoryLabel(data.category)}${data.urgent ? " — URGENT" : ""}</h2>
        <p><strong>Caller:</strong> ${data.callerName ?? "Not given"}${data.callerPhone ? ` (${data.callerPhone})` : ""}</p>
        <p><strong>Reason:</strong> ${data.reason}</p>
        <p><strong>Summary:</strong> ${data.summary}</p>
        <p><a href="https://www.prismworkforce.online/calls/${enquiryId}">View in PRISM</a></p>
      </div>
    `,
  });
  if (!emailResult.success) {
    console.error(`Failed to send call enquiry notification email for ${enquiryId}:`, emailResult.error);
  }

  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual local verification**

Start the dev server (`npm run dev`), then in another terminal, with
`RETELL_API_KEY` set in your shell to any test value matching what the
server process sees:

```bash
node -e "
const crypto = require('crypto');
const apiKey = 'test_retell_key';
const body = JSON.stringify({event:'call_analyzed',call:{call_id:'manual_test_1',from_number:'+441234567890',transcript:'Agent: hi\nUser: hello',call_analysis:{call_summary:'Test call.',custom_analysis_data:{category:'APPLICANT',caller_name:'Test Caller',reason:'Manual verification'}}}});
const ts = Date.now();
const digest = crypto.createHmac('sha256', apiKey).update(body + ts).digest('hex');
console.log('BODY=' + body);
console.log('SIG=v=' + ts + ',d=' + digest);
"
```

Copy the printed `BODY` and `SIG` into:

```bash
curl -i -X POST http://localhost:3000/api/calls/retell-webhook \
  -H "Content-Type: application/json" \
  -H "X-Retell-Signature: <SIG>" \
  -d '<BODY>'
```

Expected: `204 No Content`. Then confirm a `CallEnquiry` row exists (e.g. via
`npx prisma studio` against your local/dev database if one is configured) and
that the 6 recipients received the email (check `EmailLog` if no live email
transport is configured locally — `sendEmail` logs every attempt there
regardless of transport).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/calls/retell-webhook/route.ts
git commit -m "feat: add Retell post-call webhook endpoint"
```

---

### Task 5: `/calls` list page

**Files:**
- Create: `src/app/(dashboard)/calls/page.tsx`

**Interfaces:**
- Consumes: `requireStaff` from `@/lib/require-staff`; `prisma` from `@/lib/db`;
  `CALL_ENQUIRY_CATEGORIES`, `CALL_ENQUIRY_STATUSES` from `@/lib/calls/constants` (Task 1).
- Produces: the `/calls` route, linking each row to `/calls/[id]` (Task 6).

- [ ] **Step 1: Implement the page**

```tsx
// src/app/(dashboard)/calls/page.tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";
import { CALL_ENQUIRY_CATEGORIES, CALL_ENQUIRY_STATUSES } from "@/lib/calls/constants";

function buildHref(status: string, category: string): string {
  const params = new URLSearchParams();
  if (status && status !== "All") params.set("status", status);
  if (category && category !== "All") params.set("category", category);
  const qs = params.toString();
  return qs ? `/calls?${qs}` : "/calls";
}

export default async function CallsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; category?: string }>;
}) {
  const guard = await requireStaff();
  if (!guard.ok) redirect("/login");

  const params = searchParams ? await searchParams : {};
  const statusFilter = params?.status || "";
  const categoryFilter = params?.category || "";

  const where: Record<string, unknown> = {};
  if (statusFilter && statusFilter !== "All") where.status = statusFilter;
  if (categoryFilter && categoryFilter !== "All") where.category = categoryFilter;

  const enquiries = await prisma.callEnquiry.findMany({
    where,
    orderBy: { receivedAt: "desc" },
  });

  const statuses = ["All", ...CALL_ENQUIRY_STATUSES];
  const categories = ["All", ...CALL_ENQUIRY_CATEGORIES];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Call Enquiries</h1>

      <div className="flex gap-2 mb-3 flex-wrap">
        {statuses.map((s) => (
          <Link
            key={s}
            href={buildHref(s, categoryFilter)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              (statusFilter || "All") === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
            }`}
          >
            {s}
          </Link>
        ))}
      </div>
      <div className="flex gap-2 mb-6 flex-wrap">
        {categories.map((c) => (
          <Link
            key={c}
            href={buildHref(statusFilter, c)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              (categoryFilter || "All") === c ? "bg-indigo-600 text-white" : "bg-gray-50 text-gray-600"
            }`}
          >
            {c}
          </Link>
        ))}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b">
            <th className="py-2">Received</th>
            <th>Category</th>
            <th>Caller</th>
            <th>Reason</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {enquiries.map((e) => (
            <tr key={e.id} className="border-b hover:bg-gray-50">
              <td className="py-2">
                <Link href={`/calls/${e.id}`} className="block">
                  {e.receivedAt.toLocaleString("en-GB")}
                </Link>
              </td>
              <td>
                {e.urgent ? <span className="text-red-600 font-semibold">URGENT </span> : null}
                {e.category}
              </td>
              <td>
                {e.callerName || "—"} {e.callerPhone ? `(${e.callerPhone})` : ""}
              </td>
              <td className="max-w-xs truncate">{e.reason}</td>
              <td>{e.status}</td>
            </tr>
          ))}
          {enquiries.length === 0 && (
            <tr>
              <td colSpan={5} className="py-6 text-center text-gray-400">
                No call enquiries yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (note: `/calls/[id]` doesn't exist until Task 6, so the
`href` to it is a dangling link until then — that's expected and doesn't
break the build).

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/calls/page.tsx"
git commit -m "feat: add /calls list page"
```

---

### Task 6: `/calls/[id]` detail page + mark-actioned action

**Files:**
- Create: `src/app/(dashboard)/calls/[id]/page.tsx`
- Create: `src/app/(dashboard)/calls/actions.ts`

**Interfaces:**
- Consumes: `requireStaff` (`@/lib/require-staff`), `prisma` (`@/lib/db`),
  `auth` (`@/lib/auth`).
- Produces: `markActioned(id: string): Promise<void>` server action, used by
  the detail page's form.

- [ ] **Step 1: Implement the server action**

```ts
// src/app/(dashboard)/calls/actions.ts
"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function markActioned(id: string) {
  try {
    const session = await auth();
    await prisma.callEnquiry.update({
      where: { id },
      data: {
        status: "Actioned",
        actionedBy: session?.user?.name || session?.user?.email || "Unknown",
        actionedAt: new Date(),
      },
    });
    await prisma.activityLog.create({
      data: {
        action: "CALL_ENQUIRY_ACTIONED",
        entityType: "CallEnquiry",
        entityId: id,
        userName: session?.user?.name,
        userEmail: session?.user?.email,
        details: "Marked actioned",
      },
    });
    revalidatePath("/calls");
    revalidatePath(`/calls/${id}`);
  } catch (error) {
    if ((error as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error(error);
    throw new Error("Failed to mark call enquiry actioned");
  }
}
```

- [ ] **Step 2: Implement the detail page**

```tsx
// src/app/(dashboard)/calls/[id]/page.tsx
export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";
import { markActioned } from "../actions";

export default async function CallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const guard = await requireStaff();
  if (!guard.ok) redirect("/login");

  const { id } = await params;
  const enquiry = await prisma.callEnquiry.findUnique({ where: { id } });
  if (!enquiry) notFound();

  const boundMarkActioned = markActioned.bind(null, enquiry.id);

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-semibold mb-2">
        {enquiry.urgent ? <span className="text-red-600">URGENT — </span> : null}
        {enquiry.category}
      </h1>
      <p className="text-gray-500 mb-6">{enquiry.receivedAt.toLocaleString("en-GB")}</p>

      <dl className="grid grid-cols-[140px_1fr] gap-y-2 mb-6 text-sm">
        <dt className="text-gray-500">Caller</dt>
        <dd>{enquiry.callerName || "Not given"}</dd>
        <dt className="text-gray-500">Phone</dt>
        <dd>{enquiry.callerPhone || "Not given"}</dd>
        <dt className="text-gray-500">Contractor hint</dt>
        <dd>{enquiry.contractorIdHint || "—"}</dd>
        <dt className="text-gray-500">Reason</dt>
        <dd>{enquiry.reason}</dd>
        <dt className="text-gray-500">Summary</dt>
        <dd>{enquiry.summary}</dd>
        <dt className="text-gray-500">Status</dt>
        <dd>
          {enquiry.status}
          {enquiry.actionedBy ? ` by ${enquiry.actionedBy}` : ""}
        </dd>
      </dl>

      <h2 className="text-lg font-medium mb-2">Transcript</h2>
      <pre className="whitespace-pre-wrap bg-gray-50 border rounded p-4 text-sm mb-6">
        {enquiry.transcript}
      </pre>

      {enquiry.status !== "Actioned" && (
        <form action={boundMarkActioned}>
          <button type="submit" className="rounded bg-blue-600 text-white px-4 py-2 text-sm font-medium">
            Mark actioned
          </button>
        </form>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification**

With the dev server running and the row created in Task 4's manual test
still in the database, visit `/calls` while logged in as a staff user,
confirm the row appears, click through to `/calls/[id]`, confirm the
transcript renders, click "Mark actioned", confirm the status updates and
the button disappears.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/calls/[id]/page.tsx" "src/app/(dashboard)/calls/actions.ts"
git commit -m "feat: add call enquiry detail page and mark-actioned action"
```

---

### Task 7: Sidebar nav entry + badge count

**Files:**
- Modify: `src/components/sidebar.tsx`
- Modify: `src/app/api/counts/route.ts`

**Interfaces:**
- Consumes: `prisma.callEnquiry.count` (Task 1).
- Produces: nothing consumed elsewhere — this is the final integration task.

- [ ] **Step 1: Add the count to the counts API**

In `src/app/api/counts/route.ts`, add `newCallEnquiries` alongside the
existing counts. The full updated handler:

```ts
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireStaff();
  if (!guard.ok) return NextResponse.json({ error: "Unauthorized" }, { status: guard.reason === "forbidden" ? 403 : 401 });

  try {
    const [pendingTimesheets, complianceAlerts, draftInvoices, pendingOnboarding, pendingApplicants, openQueries, openGrievances, newStarters, newCallEnquiries] = await Promise.all([
      prisma.timesheet.count({
        where: { status: { in: ["Submitted", "Draft"] } },
      }),
      prisma.complianceRecord.count({
        where: { status: { in: ["Pending", "Non-Compliant", "Expired"] } },
      }),
      prisma.invoice.count({
        where: { status: "Draft" },
      }),
      prisma.supplyAgreement.count({
        where: { status: "Pending" },
      }),
      prisma.contractor.count({
        where: { status: "Applied" },
      }),
      prisma.paymentQuery.count({
        where: { status: { in: ["Open", "Assigned"] } },
      }),
      prisma.grievance.count({
        where: { status: { in: ["Open", "Assigned"] } },
      }),
      prisma.newStarterSubmission.count({
        where: { status: "New" },
      }),
      prisma.callEnquiry.count({
        where: { status: "New" },
      }),
    ]);

    return NextResponse.json({
      pendingTimesheets,
      complianceAlerts,
      draftInvoices,
      pendingOnboarding,
      pendingApplicants,
      openQueries,
      openGrievances,
      newStarters,
      newCallEnquiries,
    });
  } catch {
    return NextResponse.json({ pendingTimesheets: 0, complianceAlerts: 0, draftInvoices: 0, pendingOnboarding: 0, pendingApplicants: 0, openQueries: 0, openGrievances: 0, newStarters: 0, newCallEnquiries: 0 });
  }
}
```

- [ ] **Step 2: Add the nav entry**

In `src/components/sidebar.tsx`:

1. Add `Phone` to the `lucide-react` import list (line 30, after `HelpCircle`
   or anywhere in that block):

```tsx
import {
  LayoutDashboard,
  Users,
  Building2,
  Clock,
  ShieldCheck,
  TrendingUp,
  ClipboardList,
  LogOut,
  Receipt,
  Brain,
  Menu,
  X,
  Activity,
  Shield,
  UserPlus,
  MessageSquare,
  AlertCircle,
  FileText,
  UserCheck,
  Send,
  Wrench,
  HelpCircle,
  Phone,
} from "lucide-react";
```

2. Add a row to the `navigation` array, right after `"Grievances"`:

```tsx
const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, badgeKey: null },
  { name: "Intelligence", href: "/intelligence", icon: Brain, badgeKey: null },
  { name: "Campaign", href: "/campaign", icon: Send, badgeKey: null },
  { name: "Applicants", href: "/applicants", icon: UserCheck, badgeKey: "pendingApplicants" as const },
  { name: "New Starters", href: "/new-starters", icon: UserPlus, badgeKey: "newStarters" as const },
  { name: "Onboarding", href: "/onboarding/submissions", icon: UserPlus, badgeKey: "pendingOnboarding" as const },
  { name: "Subcontractors", href: "/contractors", icon: Users, badgeKey: null },
  { name: "Clients", href: "/companies", icon: Building2, badgeKey: null },
  { name: "Assignments", href: "/assignments", icon: ClipboardList, badgeKey: null },
  { name: "Timesheets", href: "/timesheets", icon: Clock, badgeKey: null },
  { name: "Billing", href: "/billing", icon: Receipt, badgeKey: "draftInvoices" as const },
  { name: "Compliance", href: "/compliance", icon: ShieldCheck, badgeKey: "complianceAlerts" as const },
  { name: "Reports", href: "/reports", icon: FileText, badgeKey: null },
  { name: "Rates", href: "/rates", icon: TrendingUp, badgeKey: null },
  { name: "Job Roles", href: "/job-roles", icon: Wrench, badgeKey: null },
  { name: "Pay Queries", href: "/payment-queries", icon: MessageSquare, badgeKey: "openQueries" as const },
  { name: "Grievances", href: "/grievances", icon: AlertCircle, badgeKey: "openGrievances" as const },
  { name: "Calls", href: "/calls", icon: Phone, badgeKey: "newCallEnquiries" as const },
  { name: "QMS", href: "/qms", icon: Shield, badgeKey: null },
  { name: "Activity Log", href: "/activity", icon: Activity, badgeKey: null },
  { name: "Help", href: "/help", icon: HelpCircle, badgeKey: null },
];
```

3. Update the `Counts` type and the `useState` initializer to include the new
   field:

```tsx
type Counts = {
  complianceAlerts: number;
  draftInvoices: number;
  pendingOnboarding: number;
  pendingApplicants: number;
  openQueries: number;
  openGrievances: number;
  newStarters: number;
  newCallEnquiries: number;
};
```

```tsx
const [counts, setCounts] = useState<Counts>({
  complianceAlerts: 0,
  draftInvoices: 0,
  pendingOnboarding: 0,
  pendingApplicants: 0,
  openQueries: 0,
  openGrievances: 0,
  newStarters: 0,
  newCallEnquiries: 0,
});
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification**

With the dev server running and logged in as staff, confirm "Calls" appears
in the sidebar with a badge matching the count of `status: "New"` rows, and
that clicking it navigates to `/calls`.

- [ ] **Step 5: Commit**

```bash
git add src/components/sidebar.tsx src/app/api/counts/route.ts
git commit -m "feat: add Calls nav entry and badge count"
```

---

### Task 8: Env vars, Retell agent provisioning, and end-to-end testing

This task is operational, not code — it's the checklist for the parts of the
spec that live outside this repo (Retell's dashboard, Railway's environment,
Tamar's portal). No commit at the end; this is a runbook for the user.

**Files:** none in this repo (see the manual `.env.example` note below).

- [ ] **Step 1: Add the Railway environment variable**

In the Railway dashboard for this project's web service, add:

```
RETELL_API_KEY=<the Retell API key with the "webhook" badge enabled>
```

Optional, only if the 6-address default in Task 3 needs overriding without a
deploy:

```
CALL_ENQUIRY_RECIPIENTS=<comma-separated email list>
```

- [ ] **Step 2: Update `.env.example` (manual — Claude cannot edit this file)**

`.env.example` is excluded from Claude's file access in this environment. By
hand, add these two lines (with the other optional/commented vars, following
the file's existing style):

```
# Retell AI (call system) — the API key must have the "webhook" badge enabled
RETELL_API_KEY=
# Optional — comma-separated override of the call-enquiry notification list
CALL_ENQUIRY_RECIPIENTS=
```

- [ ] **Step 3: Create the Retell agent**

In the Retell dashboard:

1. Create a new agent. Write the prompt per the spec: introduces itself as
   PRL Site Solutions, explains the team is currently unavailable, has a
   natural conversation to determine why the caller is calling, collects
   name + callback number + the relevant detail, always closes with a
   callback promise — never attempts a transfer.
2. Provision a phone number for the agent (this becomes Tamar's fallback
   destination in Step 6).
3. Set the agent's `webhook_url` to
   `https://www.prismworkforce.online/api/calls/retell-webhook`.
4. Configure Post-Call Analysis with exactly these custom fields (key names
   must match `src/lib/calls/retell-webhook.ts`'s `custom_analysis_data`
   reads from Task 2):

   | Key | Type | Notes |
   |---|---|---|
   | `category` | Enum/select | Values: `APPLICANT`, `CONTRACTOR_QUERY`, `CLIENT_ENQUIRY`, `URGENT`, `OTHER` |
   | `caller_name` | String | |
   | `caller_phone` | String | Optional — the route also falls back to the call's own `from_number` if this is empty |
   | `contractor_id_hint` | String | Whatever the caller states, unverified |
   | `reason` | String | Short description of what they need |
   | `urgent` | Boolean | |

5. Ensure the API key used for verification (`RETELL_API_KEY` in Railway) is
   the one with the "webhook" badge enabled in the dashboard's API Keys page.

- [ ] **Step 4: Standalone agent test (no Tamar involved yet)**

Deploy this repo's changes to Railway first (push to `master`; Railway
auto-deploys and runs `prisma migrate deploy`). Then call Retell's own test
number for the new agent directly. Have a few conversations covering each of
the 4 categories plus one that should fall to `OTHER`. After each call,
confirm:

- The call appears on `/calls` in PRISM with the right category.
- The email arrived at all 6 addresses with the right subject/urgency flag.
- The transcript on the detail page matches what was actually said.

Iterate on the agent's prompt and the Post-Call Analysis field descriptions
in the Retell dashboard until this is reliable — no PRISM code changes
needed for this iteration.

- [ ] **Step 5: Point Tamar's fallback at the Retell number**

In the Tamar phonedivert portal (https://www.tamartelecommunications.co.uk/phonedivert/home),
set the hunt groups' final/overflow destination to the Retell phone number
from Step 3. This is a manual portal change on the user's account — Claude
cannot do this step.

- [ ] **Step 6: Live cutover test**

Call the live 0800 number outside business hours and confirm it reaches the
Retell agent and the same `/calls` + email pipeline fires correctly.

- [ ] **Step 7: Daytime overflow test**

During business hours, let a call to the 0800 number ring out unanswered
through the hunt groups and confirm it also falls through to the same AI
agent.
