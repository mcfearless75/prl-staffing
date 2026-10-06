import { prisma } from "@/lib/db";
import { escapeHtml } from "@/lib/utils";

/**
 * A staff member's own contact details (User.phone / User.jobTitle, edited on
 * /settings/my-details), for signing off emails and messages sent to workers.
 * Jen, 2026-10-06.
 */
export interface StaffContact {
  name: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
}

export const JOB_TITLE_MAX = 100;

export async function getStaffContact(userId: string): Promise<StaffContact | null> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, phone: true, jobTitle: true },
  });
  return u ? { name: u.name, email: u.email, phone: u.phone, jobTitle: u.jobTitle } : null;
}

/**
 * Loose UK phone check: landline or mobile, with or without +44 / spaces /
 * brackets / dashes. Returns the number tidied (single spaces) or null if it
 * doesn't look like a UK number. "" is not a number — callers treat blank as
 * "clear the field" before calling this.
 */
export function normaliseUkPhone(raw: string): string | null {
  const tidy = raw.replace(/\s+/g, " ").trim();
  if (!/^[0-9+()\-\s]+$/.test(tidy)) return null;
  const digits = tidy.replace(/[^\d+]/g, "");
  // 0 + 9–10 digits (01xx / 02x / 03 / 07 / 08), or +44 / 0044 with the leading 0 dropped (optionally "(0)").
  const national = digits.replace(/^(\+44|0044)0?/, "0");
  if (!/^0\d{9,10}$/.test(national)) return null;
  if (digits.lastIndexOf("+") > 0) return null;
  return tidy;
}

/** Plain-text sign-off block: name, job title, phone, email — blanks skipped. */
export function formatSignOffText(c: StaffContact): string {
  return [c.name, c.jobTitle, c.phone ? `Tel: ${c.phone}` : null, c.email, "PRL Site Solutions"]
    .filter(Boolean)
    .join("\n");
}

/** HTML sign-off block for emails. Every value is escaped. */
export function formatSignOffHtml(c: StaffContact): string {
  const lines = [
    `<strong>${escapeHtml(c.name)}</strong>`,
    c.jobTitle ? escapeHtml(c.jobTitle) : null,
    c.phone ? `Tel: <a href="tel:${escapeHtml(c.phone.replace(/[^\d+]/g, ""))}">${escapeHtml(c.phone)}</a>` : null,
    `<a href="mailto:${escapeHtml(c.email)}">${escapeHtml(c.email)}</a>`,
    "PRL Site Solutions",
  ].filter(Boolean);
  return `<p style="margin:16px 0 0;line-height:1.5">${lines.join("<br>")}</p>`;
}

/**
 * The signed-in staff user's own User id. By session id first; by email as a
 * fallback (a Microsoft sign-in only carries our id when the email matched a
 * User at sign-in time). Server-only — never expose as a server action.
 */
export async function resolveOwnUserId(user: { id?: string; email?: string | null }): Promise<string | null> {
  if (user.id) {
    const byId = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true } });
    if (byId) return byId.id;
  }
  if (user.email) {
    const byEmail = await prisma.user.findUnique({ where: { email: user.email }, select: { id: true } });
    if (byEmail) return byEmail.id;
  }
  return null;
}
