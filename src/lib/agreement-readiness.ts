import { prisma } from "@/lib/db";
import { emailMatches } from "@/lib/contractor-email";

/**
 * Who is ready to be sent a Subcontractor Agreement (Erica, 2026-10-01):
 * "Once we verify docs, staff should appear in onboarding for us to send the
 * subcontractors form", and a prompt on the profile as soon as they're done.
 *
 * Ready = documents verified, nothing still waiting to be checked, and no
 * agreement ever sent to their email. Agreements are matched by email because
 * that is all a SupplyAgreement row holds (onboarding/invite sets contactEmail
 * to the person's own address).
 */

/** Verified within this many days, so the list isn't every long-standing worker. */
export const READY_WINDOW_DAYS = 60;

export async function hasAgreement(email: string | null | undefined): Promise<boolean> {
  if (!email?.trim()) return false;
  return (await prisma.supplyAgreement.count({ where: { contactEmail: emailMatches(email) } })) > 0;
}

/** Should the profile offer to send the agreement right now? */
export async function shouldPromptAgreement(contractorId: string): Promise<boolean> {
  const c = await prisma.contractor.findUnique({
    where: { id: contractorId },
    select: {
      email: true,
      doNotEmploy: true,
      compliances: { select: { status: true } },
    },
  });
  if (!c || c.doNotEmploy || !c.email) return false;
  if (!c.compliances.some((r) => r.status === "Verified")) return false;
  // Still verifying a batch — ask once they've finished, not after every click.
  if (c.compliances.some((r) => r.status === "Pending")) return false;
  return !(await hasAgreement(c.email));
}

export type ReadyPerson = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string | null;
  lastVerified: Date;
};

export async function readyForAgreement(now: Date = new Date()): Promise<ReadyPerson[]> {
  const since = new Date(now.getTime() - READY_WINDOW_DAYS * 86_400_000);
  const candidates = await prisma.contractor.findMany({
    where: {
      doNotEmploy: false,
      email: { not: "" },
      compliances: { some: { status: "Verified", updatedAt: { gte: since } }, none: { status: "Pending" } },
    },
    select: {
      id: true, firstName: true, lastName: true, email: true, jobTitle: true,
      compliances: { where: { status: "Verified" }, select: { updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 1 },
    },
  });
  if (candidates.length === 0) return [];

  const sent = await prisma.supplyAgreement.findMany({
    where: { OR: candidates.map((c) => ({ contactEmail: emailMatches(c.email) })) },
    select: { contactEmail: true },
  });
  const sentTo = new Set(sent.map((s) => s.contactEmail.trim().toLowerCase()));

  return candidates
    .filter((c) => !sentTo.has(c.email.trim().toLowerCase()))
    .map((c) => ({
      id: c.id, firstName: c.firstName, lastName: c.lastName, email: c.email, jobTitle: c.jobTitle,
      lastVerified: c.compliances[0].updatedAt,
    }))
    .sort((a, b) => b.lastVerified.getTime() - a.lastVerified.getTime());
}
