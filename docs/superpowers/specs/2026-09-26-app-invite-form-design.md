# App Invite Form (worker portal profile + documents) — design

Date: 2026-09-26 · Approved by Paul in chat · Source: PRL "PRISM Improvements v1.1.xlsx", tab "App Invite Form"

The "App Invite Form" is the worker portal's `/portal/profile`, reached from the invite email.
Medical, drugs & alcohol and criminal-record sections are OUT of scope: they wait on PRL's GDPR
answers (retention period, who can view).

## Decisions (Paul, 2026-09-26)

- **Who fills it in:** everyone, gently. Existing workers see a "complete your profile" banner until
  done; nothing in the portal is locked.
- **Worker edits their name:** changed directly, and flagged for staff to check against ID.
- **Save progress:** writes straight to the Contractor record (no separate draft copy). Submit
  validates and stamps completion.

## Data (one migration)

Contractor gains: `title`, `pronouns`, `nationality`, `shareCode`, `rtwRoute` (all `String?`),
`profileSubmittedAt`, `nameChangedAt` (`DateTime?`), `nameChangedFrom` (`String?`, the previous
full name, shown on the flag).

## A. Profile form (`/portal/profile`)

Sections: About you (Title, first/last name editable, Known as, Pronouns, Nationality) · Contact
(email, phone, address, postcode, DOB, NI) · Emergency contact (name, phone, relationship).

- Title: Mr, Mrs, Miss, Ms, Mx, Dr, Prefer not to say. Pronouns: He/him, She/her, They/them,
  Prefer not to say. Nationality: country list + Prefer not to say.
- Removed from the worker's view (data kept, staff still see it): Next of Kin, Work Details,
  Assignment History.
- **Save and finish later**: saves whatever is filled in, nothing mandatory.
- **Submit**: every field required; lists what is missing by name; sets `profileSubmittedAt` the
  first time; then goes to Documents. Editable afterwards; no re-submit.
- Name change by the worker: sets `nameChangedAt` + `nameChangedFrom`, writes Activity. Staff see an
  amber badge on the profile header with **Mark as checked** (clears both), and a contractor-list
  filter "Name changes to check". No email.
- Staff form + profile show Title, Pronouns, Nationality and "Profile submitted <date>" / "Not yet
  submitted".

## B. Right to Work (top of `/portal/documents`)

"Do you have a UK or Irish passport?" (Irish added: it is valid RTW on its own and the type is
already "Passport — UK or Ireland").

| Route (`rtwRoute`) | Required |
|---|---|
| `uk-irish-passport` | Passport — UK or Ireland (expiry required) |
| `passport-share-code` | Passport — Other Nationality (expiry required) + typed share code |
| `birth-cert-ni` | Birth Certificate + National Insurance Proof |

- Share code typed, stored in `shareCode`, validated as 9 letters/digits ignoring spaces. Staff see
  it in full on the RTW tab; the worker's view masks all but the last 3.
- Uploads go through `/api/documents` as today (Pending records for staff to verify).
- Ticks per required item; progress kept between visits.
- Banner = checklist "Your details · Right to Work · Cards"; gone when details submitted and RTW
  complete.
- Not included: the red RTW flag on the staff profile header (waits on Jen's RTW rule).

## C. Documents + Compliance tab

Documents page: Right to Work → "Your cards and certificates" (required-documents checklist moved
from the Compliance tab, per-row status/expiry/upload) → "Upload another card or certificate" with
PRL's wording → uploaded files.

- Expiry **required** on worker uploads of expiring types; the only alternative is ticking "This
  document has no expiry date" (existing `indefiniteExpiry`). Never asked for non-expiring types
  (Birth Certificate, National Insurance Proof, P45, P60, Bank Details, Proof of Address, CV, …).
- Enforced server-side in `/api/documents` for contractor sessions; staff uploads unchanged.
- Compliance tab removed from the bottom bar; `/portal/compliance` redirects to Documents; home
  links repointed. Code switched off, not deleted.

## Testing

Pure functions with node:test, each mutation-checked: profile completeness (missing-field list),
name-change detection, RTW route requirements + completeness, share-code validation, "type needs
expiry" (asserted over every type in the taxonomy, not a copied list), contractor-upload expiry
validation.
