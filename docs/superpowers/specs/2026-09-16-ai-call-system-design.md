# AI Call System (Retell) — Design Spec

**Date:** 2026-09-16
**Status:** Approved for implementation planning

## Purpose

PRL Site Solutions' 0800 number currently routes through Tamar Telecommunications'
`phonedivert` hunt groups (https://www.tamartelecommunications.co.uk/phonedivert/home).
Calls that go unanswered — or arrive outside business hours — currently have no
handler. This adds an AI voice agent (Retell AI) as that fallback, with the
call outcome fed into PRISM so the office can follow up.

Tamar's hunt-group config itself is out of scope for this build — it's a vendor
portal setting on the user's account, not code. The scope here is: the Retell
agent, and the PRISM side that receives and surfaces what the agent captured.

## Requirements (confirmed with the user)

- **Trigger:** the AI answers both when the hunt group rings out unanswered
  during business hours, and for all calls outside business hours/weekends.
- **Caller triage:** the agent must distinguish four categories — new
  applicant/job enquiry, existing contractor query, client/site enquiry, and
  urgent/site-safety issue — plus a fallback for anything that doesn't fit.
- **No live transfer.** Every call ends with "someone will call you back
  shortly," logged as a message. Urgent calls are flagged, not escalated live.
- **PRISM integration:** every call is logged to the PRISM database and
  triggers an email notification; there is also a staff-only page to browse
  call history.
- **Notification list:** every call (any category) emails all of: `adella@`,
  `keenan@`, `helen@`, `jenni@`, `sian@`, `erica@prlsitesolutions.co.uk`.
- **Retell account:** exists, but nothing is configured yet — no phone number,
  no agent.
- **Testing:** validate the agent directly via Retell's own test number first
  (cheap, repeatable), then do final validation via real off-hours calls to
  the live 0800 number once Tamar's fallback destination is pointed at the
  Retell number.

## Non-goals (explicitly out of scope for this build)

- No live call transfer to a human, under any category including urgent.
- No automatic linking of a caller-stated name/contractor ID to a real
  `Contractor` record. A voice claim is not verified identity — it's stored as
  a free-text hint (`contractorIdHint`) for whoever actions the enquiry.
- No live PRISM data lookups during the call (e.g. "what's my next shift").
  The integration is call-end only.
- No changes to Tamar's hunt-group configuration by Claude — that's a manual
  vendor-portal step for the user, documented here but not automated.
- No per-category recipient routing — all 6 recipients get every email.

## Architecture

```
Caller → 0800 number → Tamar phonedivert hunt groups (unchanged)
                          │ (unanswered OR after-hours)
                          ▼
                  Retell phone number → Retell AI agent (conversation)
                          │ (call ends)
                          ▼
          Retell Post-Call Analysis → POST /api/calls/retell-webhook (PRISM)
                          │
                          ├─→ CallEnquiry row created (Postgres via Prisma)
                          ├─→ Resend email to all 6 staff addresses
                          └─→ visible on new /calls dashboard page
```

Chosen over two alternatives (see brainstorming discussion): live in-call
function-calling was rejected as unnecessary complexity given there's no live
transfer or live lookup requirement; a Retell-only setup with no PRISM
integration was rejected because the user explicitly wants logging + a call
log page in PRISM.

## Components

### 1. Retell agent (Retell dashboard/API, not PRISM code)

- Single agent, single prompt. Introduces itself as PRL Site Solutions,
  explains the team is currently unavailable, has a natural conversation to
  determine why the caller is calling, and collects: name, callback number,
  and the relevant detail for their category. Always closes with a callback
  promise — never attempts transfer.
- **Post-Call Analysis** schema (Retell's structured extraction over the
  transcript, run once the call ends):
  - `category`: enum `APPLICANT | CONTRACTOR_QUERY | CLIENT_ENQUIRY | URGENT | OTHER`
  - `callerName`: string, nullable
  - `callerPhone`: string, nullable (also available from the raw call metadata
    as a fallback if the caller doesn't state it)
  - `contractorIdHint`: string, nullable — whatever the caller said, unverified
  - `reason`: string — short description of what they need
  - `urgent`: boolean
  - `summary`: string — a few sentences for the email body
- Retell fires its post-call webhook to PRISM once analysis completes.

### 2. PRISM: data model

New Prisma model:

```prisma
enum CallEnquiryCategory {
  APPLICANT
  CONTRACTOR_QUERY
  CLIENT_ENQUIRY
  URGENT
  OTHER
}

enum CallEnquiryStatus {
  NEW
  ACTIONED
}

model CallEnquiry {
  id                String               @id @default(cuid())
  retellCallId      String               @unique
  category          CallEnquiryCategory
  callerName        String?
  callerPhone       String?
  contractorIdHint  String?
  reason            String
  summary           String
  transcript        String               @db.Text
  urgent            Boolean              @default(false)
  status            CallEnquiryStatus    @default(NEW)
  receivedAt        DateTime             @default(now())
  actionedBy        String?
  actionedAt        DateTime?

  @@index([status])
  @@index([category])
}
```

### 3. PRISM: webhook endpoint

`POST /api/calls/retell-webhook`

- Public route (Retell calls it directly, no user session) — classified the
  same way as the existing public-form routes in the codebase: no session,
  but validated at the boundary.
- Verifies Retell's webhook signature (HMAC, per Retell's webhook-signing
  docs) against `RETELL_WEBHOOK_SECRET` before doing anything else. Rejects
  unsigned or invalid requests with 401, no DB write.
- Parses the post-call-analysis payload, upserts a `CallEnquiry` row keyed on
  `retellCallId` (idempotent — Retell may retry webhook delivery).
- Sends one Resend email to all 6 recipients. Subject line includes category,
  and is prefixed `[URGENT]` when `urgent` is true. Body includes caller name/
  phone, reason, summary, and a link to the entry on `/calls`.
- Errors in email sending must not fail the DB write or vice versa — the call
  record is the source of truth; email is best-effort with logging on failure.

### 4. PRISM: call log page

`/calls` (or wherever fits existing dashboard nav — matches the pattern of
other staff pages), behind `requireStaff()`:

- List of `CallEnquiry` rows, newest first, filterable by category and status.
- Each row shows category (with an urgent visual flag), caller name/phone,
  reason/summary, received time, status.
- Action to mark a row `ACTIONED` (records `actionedBy` from the session,
  `actionedAt` now).
- Detail view/expansion shows the full transcript.

### 5. Environment variables (Railway only, per project convention)

- `RETELL_API_KEY`
- `RETELL_WEBHOOK_SECRET`

Neither goes in local `.env` — consistent with existing PRISM convention that
local `.env` carries zero credentials.

## Error handling

- Invalid/missing webhook signature → 401, no side effects, logged.
- Malformed payload (missing required fields) → 400, logged with the raw
  payload for debugging, no partial DB write.
- Duplicate `retellCallId` (webhook retry) → upsert, not a duplicate row.
- Email delivery failure → call record still persists; failure is logged so
  it's visible without silently losing the enquiry.

## Testing plan

1. **Agent-only validation** — call Retell's own test/dev phone number
   directly. Iterate on the prompt and Post-Call Analysis schema until
   categorization and data capture are reliable, without touching Tamar or
   burning real off-hours test calls.
2. **Pipeline validation** — with the agent behaving well, confirm the full
   chain: webhook received → signature verified → `CallEnquiry` row created →
   email received by all 6 addresses → entry visible and correctly
   categorized on `/calls`.
3. **Live cutover test** — user updates Tamar's phonedivert fallback
   destination to the Retell phone number. Real off-hours calls to the live
   0800 number confirm end-to-end behaviour.
4. **Daytime overflow test** — separately confirm the unanswered-during-
   business-hours path (let a call ring out) reaches the same agent.

## Open items for the user (not blocking design, but needed before/at build time)

- Exact Retell phone number and agent ID, once provisioned.
- Confirmation of where `/calls` should sit in the existing dashboard nav.
- Whether `RETELL_API_KEY` / `RETELL_WEBHOOK_SECRET` should be added to
  Railway now or at deploy time (they're needed before the webhook route can
  verify anything, so before first live test at the latest).
