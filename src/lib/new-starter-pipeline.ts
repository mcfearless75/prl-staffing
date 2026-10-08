/**
 * Jen's "Scenario 1" new-starter pipeline (2026-10-06), as pure rules.
 *
 * Staff add a person on /new-starters with the job already agreed (company,
 * site, role, start date, rates). The person gets the app invite, uploads
 * their documents, staff verify them, PRL sends the agreement, the person signs
 * it online, and once inducted (or if no induction is needed) the placement
 * becomes a real Assignment and the person Active.
 *
 * Imports nothing that touches Prisma, so the rules can be tested without a
 * database and the page, the server actions and the public signing page all
 * answer "where is this person?" the same way.
 */
import { isPlaceholderEmail } from "@/lib/placeholder-email";

export const PIPELINE_STAGES = ["invited", "docs", "onboarding", "induction"] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

/**
 * Who works each stage (Jenni, 2026-10-08). Once documents are verified the
 * person is someone else's job: they leave New Starters and appear, and count,
 * under Onboarding, so the person sending agreements sees a number to action.
 * Together these must cover every stage exactly once.
 */
export const NEW_STARTER_STAGES: readonly PipelineStage[] = ["invited", "docs"];
export const ONBOARDING_STAGES: readonly PipelineStage[] = ["onboarding", "induction"];

export const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  invited: "Invited — waiting for documents",
  docs: "Documents uploaded — waiting verification",
  onboarding: "Onboarding — agreement",
  induction: "Induction — signed, waiting induction",
};

/** Where the agreement is, for the onboarding stage (and the stages after it). */
export type AgreementState = "to-send" | "sent" | "signed";

export interface PlacementSnapshot {
  /** The contractor's current status (see contractor-statuses.ts). */
  contractorStatus: string;
  /** Compliance records the person uploaded that staff have not reviewed yet. */
  pendingDocCount: number;
  /** The agreement linked to this placement, if one has been sent. */
  agreement: { signedAt: Date | null } | null;
  inductionRequired: boolean;
}

/**
 * Statuses that mean "documents not verified yet". Anyone else being placed
 * (a reused worker who is Active on another job, say) was verified before and
 * goes straight to the agreement.
 */
const AWAITING_VERIFICATION: readonly string[] = ["New Starter", "Applied", "Looking"];

export function agreementState(agreement: PlacementSnapshot["agreement"]): AgreementState {
  if (!agreement) return "to-send";
  return agreement.signedAt ? "signed" : "sent";
}

/**
 * The stage a live placement is at. A signed agreement wins over everything:
 * once the person has signed, all that is left is the induction.
 */
export function derivePipelineStage(p: PlacementSnapshot): PipelineStage {
  if (agreementState(p.agreement) === "signed") return "induction";
  if (AWAITING_VERIFICATION.includes(p.contractorStatus)) {
    return p.pendingDocCount > 0 ? "docs" : "invited";
  }
  return "onboarding";
}

export type PipelineAction =
  | "resend-invite"
  | "docs-verified"
  | "send-agreement"
  | "resend-agreement"
  | "induction-done"
  | "no-induction"
  | "complete"
  | "cancel";

/** The row buttons for a placement, in display order. Cancel is always offered. */
export function pipelineActions(p: PlacementSnapshot): PipelineAction[] {
  const stage = derivePipelineStage(p);
  if (stage === "invited" || stage === "docs") return ["resend-invite", "docs-verified", "cancel"];
  if (stage === "onboarding") {
    return [agreementState(p.agreement) === "sent" ? "resend-agreement" : "send-agreement", "cancel"];
  }
  return p.inductionRequired ? ["induction-done", "no-induction", "cancel"] : ["complete", "cancel"];
}

/** How a placement is completed. Only valid once the agreement is signed. */
export type CompletionMode = "induction-done" | "no-induction" | "complete";

export function canComplete(p: PlacementSnapshot, mode: CompletionMode): string | null {
  if (agreementState(p.agreement) !== "signed") return "The agreement has not been signed yet.";
  if (mode === "complete" && p.inductionRequired) return "This placement needs an induction first.";
  if (mode !== "complete" && !p.inductionRequired) return "No induction was required — use Complete.";
  return null;
}

// ─── Add new starter: server-side validation ───────────────────────────────

export const RATE_BASES = ["Hourly", "Daily"] as const;
export type RateBasis = (typeof RATE_BASES)[number];

export interface NewStarterInput {
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string;
  companyId: string;
  siteId: string | null;
  role: string;
  /** Midnight UTC of the chosen calendar day. */
  startDate: Date;
  payRate: number;
  chargeRate: number | null;
  rateBasis: RateBasis;
  inductionRequired: boolean;
}

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const PHONE_RE = /^\+?[0-9 ()-]{7,20}$/;
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const MAX_RATE = 10_000;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** A yyyy-mm-dd calendar date (as an <input type="date"> sends it), or null. */
export function parseIsoDay(v: unknown): Date | null {
  const s = str(v);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  // Rejects 2026-02-31, which Date would roll into March.
  if (d.getUTCFullYear() !== Number(m[1]) || d.getUTCMonth() !== Number(m[2]) - 1 || d.getUTCDate() !== Number(m[3])) {
    return null;
  }
  return d;
}

function parseRate(v: unknown): number | null {
  const s = typeof v === "number" ? String(v) : str(v).replace(/^£/, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const n = Number(s);
  return n > 0 && n <= MAX_RATE ? n : null;
}

/**
 * Validates the "+ Add new starter" form. Pure — whether the company, site and
 * role actually exist is checked against the database by the caller.
 *
 * `today` bounds the start date: a start more than a year either side is a
 * typo, not a placement.
 */
export function parseNewStarterInput(
  raw: Record<string, unknown>,
  today: Date = new Date()
): { ok: true; value: NewStarterInput } | { ok: false; error: string } {
  const firstName = str(raw.firstName);
  const lastName = str(raw.lastName);
  if (!firstName || firstName.length > 100) return { ok: false, error: "First name is required (up to 100 characters)." };
  if (!lastName || lastName.length > 100) return { ok: false, error: "Last name is required (up to 100 characters)." };

  const email = str(raw.email).toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) return { ok: false, error: "Enter a valid email address." };
  if (isPlaceholderEmail(email)) return { ok: false, error: "That is a placeholder address — enter the person's real email." };

  const phone = str(raw.phone);
  if (phone && !PHONE_RE.test(phone)) return { ok: false, error: "Enter a valid phone number." };

  const companyId = str(raw.companyId);
  if (!ID_RE.test(companyId)) return { ok: false, error: "Choose a company." };
  const siteId = str(raw.siteId);
  if (siteId && !ID_RE.test(siteId)) return { ok: false, error: "Choose a valid site." };

  const role = str(raw.role);
  if (!role || role.length > 100) return { ok: false, error: "Choose a role." };

  const startDate = parseIsoDay(raw.startDate);
  if (!startDate) return { ok: false, error: "Enter a valid start date." };
  const yearMs = 366 * 24 * 60 * 60 * 1000;
  if (Math.abs(startDate.getTime() - today.getTime()) > yearMs) {
    return { ok: false, error: "The start date must be within a year of today." };
  }

  const payRate = parseRate(raw.payRate);
  if (payRate === null) return { ok: false, error: "Enter the pay rate in pounds, e.g. 18.50." };
  const chargeRaw = typeof raw.chargeRate === "number" ? String(raw.chargeRate) : str(raw.chargeRate);
  const chargeRate = chargeRaw ? parseRate(chargeRaw) : null;
  if (chargeRaw && chargeRate === null) return { ok: false, error: "Enter the charge rate in pounds, or leave it blank." };

  const rateBasis = str(raw.rateBasis);
  if (!(RATE_BASES as readonly string[]).includes(rateBasis)) return { ok: false, error: "Choose Hourly or Daily." };

  return {
    ok: true,
    value: {
      firstName,
      lastName,
      phone: phone || null,
      email,
      companyId,
      siteId: siteId || null,
      role,
      startDate,
      payRate,
      chargeRate,
      rateBasis: rateBasis as RateBasis,
      // Ticked by default: only an explicit false turns the induction off.
      inductionRequired: raw.inductionRequired !== false && raw.inductionRequired !== "false",
    },
  };
}

// ─── Public agreement signing ──────────────────────────────────────────────

/** A signing link stops working this many days after the agreement was sent. */
export const SIGN_LINK_TTL_DAYS = 30;

export type SignLinkState = "ready" | "invalid" | "expired" | "signed";

export function signLinkState(
  agreement: { createdAt: Date; signedAt: Date | null } | null,
  now: Date = new Date()
): SignLinkState {
  if (!agreement) return "invalid";
  if (agreement.signedAt) return "signed";
  const ageMs = now.getTime() - agreement.createdAt.getTime();
  return ageMs > SIGN_LINK_TTL_DAYS * 24 * 60 * 60 * 1000 ? "expired" : "ready";
}

/** Tokens are 32 random bytes as base64url — 43 characters. */
export function isWellFormedSignToken(token: unknown): token is string {
  return typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token);
}

/** The typed signature, or an error. Requires a first and last name and the tick. */
export function parseSignature(raw: { name?: unknown; agree?: unknown }): { ok: true; name: string } | { ok: false; error: string } {
  const name = str(raw.name).replace(/\s+/g, " ");
  if (name.length < 3 || name.length > 120 || !name.includes(" ")) {
    return { ok: false, error: "Type your full name (first and last) to sign." };
  }
  if (raw.agree !== true) return { ok: false, error: "Tick the box to confirm you have read and agree." };
  return { ok: true, name };
}
