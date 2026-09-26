# App Invite Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the worker portal's profile + documents pages into PRL's "App Invite Form": new identity fields, save-progress/submit, a Right to Work section with route branching, mandatory expiry dates on card uploads, and the Compliance tab folded into Documents.

**Architecture:** Rules live in small pure modules under `src/lib/` (tested with node:test); pages and API routes call them. Save-progress writes straight to the Contractor row; Submit validates and stamps `profileSubmittedAt`. The portal Compliance page's checklist becomes a component rendered inside Documents; the old route redirects.

**Tech Stack:** Next.js 16 App Router, Prisma/Postgres (Railway runs `prisma migrate deploy` on start), Tailwind, node:test via tsx.

**Spec:** `docs/superpowers/specs/2026-09-26-app-invite-form-design.md`

## Global Constraints

- Tests: `npm test` (node:test, `/tests/*.test.ts`, `@/` alias). Every new rule gets a test, and each test is mutation-checked (break the code, see it fail, restore).
- Verify before each push: `npx tsc --noEmit`, `npm test`, `npx eslint <changed files>` (fix only your own errors), `npx next build --webpack` (worktree uses a node_modules junction; Turbopack rejects it).
- Commit by explicit path; message ends `Co-Authored-By: claude-flow <ruv@ruv.net>`. Push to master = deploy.
- No inline bash heredocs containing `=>` (creates stray files). Use the Write tool for scripts.
- Medical / drugs & alcohol / criminal record are OUT of scope.
- Worker-facing copy is plain English; staff uploads are never blocked by the new expiry rule.

---

### Task 1: Migration + profile rules (pure)

**Files:**
- Modify: `prisma/schema.prisma` (Contractor model, after `knownAs`)
- Create: `prisma/migrations/20260926_app_invite_form/migration.sql`
- Create: `src/lib/profile-options.ts`, `src/lib/profile-completion.ts`
- Test: `tests/profile-completion.test.ts`

**Interfaces — Produces:**
- `TITLE_OPTIONS`, `PRONOUN_OPTIONS`, `NATIONALITY_OPTIONS: readonly string[]`, `PREFER_NOT_TO_SAY = "Prefer not to say"`
- `pickOption(value: unknown, options: readonly string[]): string | null`
- `type ProfileValues = Record<ProfileFieldKey, string | null | undefined>`
- `REQUIRED_PROFILE_FIELDS: { key: ProfileFieldKey; label: string }[]`
- `missingProfileFields(v: Partial<ProfileValues>): string[]` (labels, in form order)
- `nameChange(before: {firstName,lastName}, after: {firstName,lastName}): { changed: boolean; from: string }`

- [ ] **Step 1: Schema + migration**

Schema (Contractor, after `knownAs`):
```prisma
  // App Invite Form (portal /portal/profile) — see docs/superpowers/specs/2026-09-26-app-invite-form-design.md
  title                    String?
  pronouns                 String?
  nationality              String?
  profileSubmittedAt       DateTime? // first complete Submit; drives the portal banner
  nameChangedAt            DateTime? // worker edited their name; cleared when staff mark it checked
  nameChangedFrom          String?   // full name before the worker's edit
  rtwRoute                 String?   // uk-irish-passport | passport-share-code | birth-cert-ni
  shareCode                String?   // Home Office share code, normalised (9 chars, no spaces)
```
Migration:
```sql
ALTER TABLE "Contractor"
  ADD COLUMN "title" TEXT,
  ADD COLUMN "pronouns" TEXT,
  ADD COLUMN "nationality" TEXT,
  ADD COLUMN "profileSubmittedAt" TIMESTAMP(3),
  ADD COLUMN "nameChangedAt" TIMESTAMP(3),
  ADD COLUMN "nameChangedFrom" TEXT,
  ADD COLUMN "rtwRoute" TEXT,
  ADD COLUMN "shareCode" TEXT;
```
Run `npx prisma generate`.

- [ ] **Step 2: Failing test** `tests/profile-completion.test.ts` asserting: complete values → `[]`; blank/whitespace emergency phone → `["Emergency contact phone"]`; labels come back in `REQUIRED_PROFILE_FIELDS` order; Known as is NOT required; `pickOption` accepts a listed value (case-insensitive, returns canonical) and rejects others; `nameChange` ignores whitespace-only edits, flags a spelling change with `from` = old full name. Run `npx tsx --test tests/profile-completion.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement** `profile-options.ts` (titles Mr/Mrs/Miss/Ms/Mx/Dr/Prefer not to say; pronouns He/him, She/her, They/them, Prefer not to say; nationalities = country list + "Prefer not to say" first) and `profile-completion.ts`:
```ts
export const REQUIRED_PROFILE_FIELDS = [
  { key: "title", label: "Title" }, { key: "firstName", label: "First name" },
  { key: "lastName", label: "Last name" }, { key: "pronouns", label: "Pronouns" },
  { key: "nationality", label: "Nationality" }, { key: "email", label: "Email" },
  { key: "phone", label: "Phone" }, { key: "address", label: "Address" },
  { key: "postcode", label: "Postcode" }, { key: "dateOfBirth", label: "Date of birth" },
  { key: "niNumber", label: "NI number" },
  { key: "emergencyContactName", label: "Emergency contact name" },
  { key: "emergencyContactPhone", label: "Emergency contact phone" },
  { key: "emergencyContactRelation", label: "Emergency contact relationship" },
] as const;
export function missingProfileFields(v) {
  return REQUIRED_PROFILE_FIELDS.filter((f) => !String(v[f.key] ?? "").trim()).map((f) => f.label);
}
export function nameChange(before, after) {
  const norm = (s) => (s ?? "").trim().replace(/\s+/g, " ");
  const from = `${norm(before.firstName)} ${norm(before.lastName)}`.trim();
  const to = `${norm(after.firstName)} ${norm(after.lastName)}`.trim();
  return { changed: from !== to, from };
}
```
- [ ] **Step 4:** tests pass; mutation-check (drop a field from the list; make `nameChange` compare raw strings). **Step 5:** commit with Task 2.

### Task 2: Portal profile form (save / submit / name flag)

**Files:** Modify `src/app/api/portal/profile/route.ts`, `src/app/portal/profile/page.tsx`, `src/app/portal/profile/profile-form.tsx`.

**Interfaces — Consumes:** Task 1 exports, `normaliseKnownAs` (`src/lib/contractor-name.ts`).

- API `PUT` body gains `mode: "save" | "submit"`, `title, firstName, lastName, knownAs, pronouns, nationality`; drops `nextOfKin` (never written by the portal again, data kept). Server:
  - `firstName`/`lastName`: trimmed; blank ⇒ keep existing (a blank legal name is never written).
  - `title/pronouns/nationality` via `pickOption`, `knownAs` via `normaliseKnownAs`.
  - `nameChange(existing, next)`; if changed: set `nameChangedAt: now`, `nameChangedFrom: from` (keep the ORIGINAL `from` if a flag is already open), activity "Name changed by worker" with `from → to`.
  - `mode === "submit"`: `missing = missingProfileFields(merged)`; if any → 400 `{ error, missing }` and nothing written; else write + `profileSubmittedAt: existing ?? now`.
- Page: remove Work Details, Assignment History, Next of Kin; pass new fields; header uses the saved name.
- Form: About you / Contact / Emergency contact sections; "Save and finish later" + "Submit"; on submit success `router.push("/portal/documents?submitted=1")`; on 400 show the `missing` list. Emergency fields marked required.

- [ ] Implement, `npx tsc --noEmit`, commit Tasks 1–2 together: `feat(portal): App Invite Form profile — identity fields, save progress, submit`.

### Task 3: Staff side for Task 1–2

**Files:** `src/components/contractor-form.tsx`, `src/app/(dashboard)/contractors/actions.ts`, `src/app/(dashboard)/contractors/[id]/page.tsx`, `src/app/(dashboard)/contractors/[id]/name-check-actions.ts` (new), `src/app/(dashboard)/contractors/[id]/name-check-button.tsx` (new), `src/app/(dashboard)/contractors/page.tsx`.

- Staff form: Title / Pronouns / Nationality selects (options from Task 1); `extractContractorData` adds them via `pickOption`.
- Profile header: chip "Profile submitted <date>" / "Profile not yet submitted"; amber badge "Name changed by worker — check against ID (was X)" + `NameCheckButton` → server action `markNameChecked(contractorId)` (requireStaff, clears both fields, logActivity "Name change checked").
- List: status filter option `NAME_CHECK_FILTER = "NameCheck"` → `where.nameChangedAt = { not: null }`, label "Name changes to check".
- Commit `feat(contractors): staff view of App Invite Form fields + name-change check`. Push Tasks 1–3.

### Task 4: Right to Work route rules (pure)

**Files:** Create `src/lib/rtw-route.ts`; Test `tests/rtw-route.test.ts`.

**Interfaces — Produces:**
```ts
export type RtwRoute = "uk-irish-passport" | "passport-share-code" | "birth-cert-ni";
export const RTW_ROUTES: Record<RtwRoute, { label: string; docs: { type: string; label: string }[]; needsShareCode: boolean }>;
export function parseRtwRoute(v: unknown): RtwRoute | null;
export function normaliseShareCode(raw: unknown): string | null; // 9 [A-Z0-9], spaces/hyphens ignored
export function formatShareCode(code: string): string;            // "W12 345 67X"
export function maskShareCode(code: string): string;              // "••• ••• 67X"
export function rtwProgress(route: RtwRoute | null, satisfiedTypes: ReadonlySet<string>, shareCode: string | null):
  { items: { label: string; done: boolean }[]; complete: boolean };
```
Route docs: uk-irish-passport → `Passport — UK or Ireland`; passport-share-code → `Passport — Other Nationality` + share code; birth-cert-ni → `Birth Certificate` + `National Insurance Proof`. `satisfiedTypes` = record types with status Verified/Pending/Expiring. `complete` false when route is null.

Tests: each route's items; complete only when every item done; share code accepted with spaces/lowercase, rejected at 8/10 chars or with symbols; mask keeps last 3; every doc type named in `RTW_ROUTES` is a valid compliance type (`isValidComplianceType`) — so a typo can't create an unsatisfiable requirement. Mutation-check.

### Task 5: Right to Work section on Documents + staff RTW tab

**Files:** Create `src/app/api/portal/rtw/route.ts` (PUT `{ rtwRoute, shareCode }`, requireContractor, share code required+valid only for that route; activity log without the code), `src/app/portal/documents/rtw-section.tsx` (client). Modify `src/app/portal/documents/page.tsx`, `src/app/(dashboard)/contractors/[id]/tabs/right-to-work-tab.tsx` + its call in `page.tsx`.

- RTW section: question "Do you have a UK or Irish passport?" → Yes sets route 1; No shows the two options. Per required doc: tick if satisfied, else an upload control (reuses the Task 7 uploader so expiry rules apply). Share code input with masked display once saved.
- Staff RTW tab: "Worker's route: <label>" and "Share code: <formatted, full>".
- Commit `feat(portal): Right to Work section with route branching`.

### Task 6: Expiry rules (pure)

**Files:** Create `src/lib/doc-expiry.ts`; Test `tests/doc-expiry.test.ts`.

**Interfaces — Produces:**
```ts
export function expiryRule(type: string): "required" | "none";
export function validateWorkerExpiry(input: { type: string; expiryDate: string | null; noExpiry: boolean }, today?: Date):
  { ok: true; expiryDate: Date | null; indefinite: boolean } | { ok: false; error: string };
```
`none` = every "Identity & Payroll" type + Birth Certificate, CV, IR35 Assessment, Right to Work Check Record. Everything else `required`. Validation for `required`: noExpiry ⇒ `{indefinite:true}`; else date must parse (YYYY-MM-DD) and be today or later ("This document has expired — please upload an in-date one."); missing ⇒ "Enter the expiry date, or tick 'This document has no expiry date'.". For `none`: always ok, null date.

Tests assert over the taxonomy: every Identity & Payroll type is `none`; every type in CSCS, CPCS, NPORS, CCNSG, Plant & Lifting, Medical, Rail, Driving, DBS categories is `required`; both passports `required`; plus the validation cases. Mutation-check.

### Task 7: Enforce + collect expiry on worker uploads

**Files:** Modify `src/app/api/documents/route.ts`, `src/app/portal/compliance/compliance-uploader.tsx`, `src/app/portal/documents/document-uploader.tsx`.

- API: for `userType === "contractor"` sessions read `expiryDate` + `noExpiry` from the form, `validateWorkerExpiry` BEFORE the R2 upload (400 on error), then include `expiryDate`/`indefiniteExpiry` in the compliance record create/update. Staff path unchanged.
- Uploaders: when `expiryRule(type) === "required"`, show date input + "This document has no expiry date" tick, disable upload until one is set; send both fields with every file. Header copy: "Please upload all valid and in-date cards and certificates. Make sure the expiry date is clear."
- Commit `feat(portal): expiry date required on worker card uploads`.

### Task 8: Fold Compliance into Documents, hide the tab, banner

**Files:** Create `src/app/portal/documents/compliance-checklist.tsx` (server component: body of `portal/compliance/page.tsx` taking `contractorId`), `src/app/portal/compliance/layout.tsx` (redirect `/portal/documents`), `src/app/portal/profile-banner.tsx`. Modify `src/app/portal/compliance/page.tsx` (render the component), `src/app/portal/documents/page.tsx` (order: RTW → checklist → uploader → vault), `src/app/portal/layout.tsx` (drop Compliance from nav), `src/app/portal/page.tsx` (repoint `/portal/compliance` links → `/portal/documents`, add banner).

- Banner: shown while `!profileSubmittedAt || !rtwProgress(...).complete`; items "Your details", "Right to Work", "Cards and certificates" (done when every mandatory checklist type is satisfied); links to `/portal/profile` or `/portal/documents`.
- Commit `feat(portal): Compliance folded into Documents; profile banner`.

### Final: verify, push, update memory

Full verify list from Global Constraints, `git status` for strays, push, check Railway deploy SUCCESS, update `memory/next-session-handoff-2026-09-25.md`, MEMORY.md line, ruflo `prism` namespace.

## Self-review

- Spec coverage: A → Tasks 1–3; B → 4–5; C → 6–8; staff visibility → 3, 5; banner → 8. Out-of-scope items excluded.
- Names consistent: `profileSubmittedAt`, `nameChangedAt`, `nameChangedFrom`, `rtwRoute`, `shareCode`, `rtwProgress`, `expiryRule`, `validateWorkerExpiry` used identically across tasks.
