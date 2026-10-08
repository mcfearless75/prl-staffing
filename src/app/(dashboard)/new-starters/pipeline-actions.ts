"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/require-staff";
import { emailMatches } from "@/lib/contractor-email";
import { logActivity } from "@/lib/activity-log";
import { logAssignmentActivity } from "@/lib/assignment-activity";
import { LIVE_ASSIGNMENT_STATUSES } from "@/lib/assignment-statuses";
import { doNotEmployBlock } from "@/lib/do-not-employ";
import { sendAppInvite } from "@/lib/app-invite";
import { notifyReadyToStart } from "@/lib/new-starter-notify";
import { agreementDate } from "@/lib/supply-agreement-html";
import {
  canComplete,
  docsVerifiedBlocked,
  parseNewStarterInput,
  type CompletionMode,
  type PlacementSnapshot,
} from "@/lib/new-starter-pipeline";
import { checkComplianceForAssignment } from "../assignments/actions";

/**
 * Server actions for the new-starter pipeline on /new-starters. Every one is
 * staff-only and re-checks the placement's state on the server — the buttons
 * on the page are a convenience, not the rule.
 */

export type PipelineResult = {
  ok?: string;
  error?: string;
  /** Ask staff to confirm, then call again with the confirmation set. */
  confirm?: string;
  /** Compliance gate: staff must give an override note to proceed. */
  needsOverride?: string;
};

const ACTIVE_PLACEMENT = { completedAt: null, cancelledAt: null } as const;
// Statuses "Documents verified" may move on from. Anyone else was verified already.
const UNVERIFIED = ["New Starter", "Applied", "Looking"];

async function staffActor() {
  const guard = await requireStaff();
  if (!guard.ok) return null;
  const u = guard.session.user;
  return { id: u.id ?? null, name: u.name ?? null, email: u.email ?? null, label: u.name || u.email || "staff" };
}

function refresh() {
  revalidatePath("/new-starters");
  revalidatePath("/contractors");
  revalidatePath("/");
}

async function liveWorkCount(contractorId: string): Promise<number> {
  return prisma.assignment.count({
    where: { contractorId, status: { in: [...LIVE_ASSIGNMENT_STATUSES] } },
  });
}

async function loadActivePlacement(placementId: string) {
  if (typeof placementId !== "string" || !placementId) return null;
  return prisma.newStarterPlacement.findFirst({
    where: { id: placementId, ...ACTIVE_PLACEMENT },
    include: {
      contractor: { select: { id: true, firstName: true, lastName: true, status: true, approvedAt: true } },
      company: { select: { name: true } },
    },
  });
}

// ─── Add ───────────────────────────────────────────────────────────────────

export async function addNewStarter(raw: Record<string, unknown>, confirmLiveWork = false): Promise<PipelineResult> {
  const actor = await staffActor();
  if (!actor) return { error: "Only PRL staff can add new starters." };

  const parsed = parseNewStarterInput(raw ?? {});
  if (!parsed.ok) return { error: parsed.error };
  const input = parsed.value;

  const [company, site, jobRole, staffUser] = await Promise.all([
    prisma.company.findFirst({ where: { id: input.companyId, isActive: true }, select: { id: true, name: true } }),
    input.siteId
      ? prisma.site.findFirst({ where: { id: input.siteId, companyId: input.companyId, isActive: true }, select: { id: true } })
      : Promise.resolve(null),
    prisma.jobRole.findFirst({
      where: { name: { equals: input.role, mode: "insensitive" }, active: true },
      select: { name: true },
    }),
    prisma.user.findUnique({ where: { email: input.email }, select: { id: true } }),
  ]);
  if (!company) return { error: "That company was not found, or is no longer active." };
  if (input.siteId && !site) return { error: "That site does not belong to the chosen company." };
  if (!jobRole) return { error: "Choose a role from the list." };
  if (staffUser) return { error: "That email belongs to a PRL staff account. Use the person's own email address." };

  const existing = await prisma.contractor.findFirst({
    where: { email: emailMatches(input.email) },
    select: { id: true, firstName: true, lastName: true, phone: true, status: true },
  });

  let liveWork = 0;
  if (existing) {
    const dne = await doNotEmployBlock(existing.id);
    if (dne) return { error: dne };
    const open = await prisma.newStarterPlacement.count({ where: { contractorId: existing.id, ...ACTIVE_PLACEMENT } });
    if (open > 0) return { error: `${existing.firstName} ${existing.lastName} is already in the new-starter pipeline.` };
    liveWork = await liveWorkCount(existing.id);
    if (liveWork > 0 && !confirmLiveWork) {
      return {
        confirm: `${existing.firstName} ${existing.lastName} (${input.email}) is already on PRISM and currently working (${liveWork} live job${liveWork === 1 ? "" : "s"}). Add this new placement for them anyway?`,
      };
    }
  }

  const today = new Date().toLocaleDateString("en-GB");
  const placement = await prisma.$transaction(async (tx) => {
    let contractorId: string;
    if (existing) {
      contractorId = existing.id;
      await tx.contractor.update({
        where: { id: existing.id },
        data: {
          // Someone working elsewhere stays Active; anyone else (an applicant,
          // a past worker) re-enters as a New Starter until verified.
          ...(liveWork > 0 ? {} : { status: "New Starter" }),
          phone: existing.phone || input.phone,
        },
      });
    } else {
      const created = await tx.contractor.create({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phone: input.phone,
          status: "New Starter",
          jobTitle: jobRole.name,
          notes: `Added as a new starter by ${actor.label} on ${today}.`,
        },
        select: { id: true },
      });
      contractorId = created.id;
    }
    return tx.newStarterPlacement.create({
      data: {
        contractorId,
        companyId: company.id,
        siteId: site?.id ?? null,
        role: jobRole.name,
        startDate: input.startDate,
        payRate: input.payRate,
        chargeRate: input.chargeRate,
        rateBasis: input.rateBasis,
        inductionRequired: input.inductionRequired,
        createdBy: actor.label,
      },
      select: { id: true, contractorId: true },
    });
  });

  await logActivity(
    existing ? "New starter added (existing record)" : "New starter added",
    "Contractor",
    placement.contractorId,
    `${company.name} — ${jobRole.name}, starting ${agreementDate(input.startDate)}`
  );

  const invite = await sendAppInvite(placement.contractorId, actor);
  refresh();
  if (!invite.ok) {
    return { ok: `Added, but the app invite could not be sent (${invite.error}). Use "Resend invite" to try again.` };
  }
  return { ok: `Added ${input.firstName} ${input.lastName} and sent the app invite to ${invite.email}.` };
}

// ─── Row actions ───────────────────────────────────────────────────────────

export async function resendNewStarterInvite(placementId: string): Promise<PipelineResult> {
  const actor = await staffActor();
  if (!actor) return { error: "Only PRL staff can do this." };
  const placement = await loadActivePlacement(placementId);
  if (!placement) return { error: "This placement is no longer open." };
  const invite = await sendAppInvite(placement.contractorId, actor);
  refresh();
  return invite.ok ? { ok: `App invite sent to ${invite.email}.` } : { error: invite.error };
}

export async function markNewStarterDocsVerified(placementId: string): Promise<PipelineResult> {
  const actor = await staffActor();
  if (!actor) return { error: "Only PRL staff can do this." };
  const placement = await loadActivePlacement(placementId);
  if (!placement) return { error: "This placement is no longer open." };

  // Not while anything they uploaded is still waiting (Jenni, 08-10-26).
  // Checked here too, so a page opened before the upload can't skip it.
  const pendingDocCount = await prisma.complianceRecord.count({
    where: { contractorId: placement.contractorId, status: "Pending" },
  });
  const blocked = docsVerifiedBlocked({ pendingDocCount });
  if (blocked) return { error: blocked };

  // Conditional on the status, so a double click or a stale page can't
  // demote someone who has already moved on.
  const moved = await prisma.contractor.updateMany({
    where: { id: placement.contractorId, status: { in: UNVERIFIED } },
    data: { status: "Onboarding" },
  });
  if (moved.count === 0) return { error: "Their documents are already marked verified." };

  await logActivity("New starter documents verified", "Contractor", placement.contractorId, "Status Onboarding — agreement next");
  refresh();
  return { ok: "Moved to Onboarding. Send the agreement next." };
}

export async function completeNewStarter(
  placementId: string,
  mode: CompletionMode,
  overrideNote?: string
): Promise<PipelineResult> {
  const actor = await staffActor();
  if (!actor) return { error: "Only PRL staff can do this." };
  if (!["induction-done", "no-induction", "complete"].includes(mode)) return { error: "Unknown action." };

  const placement = await loadActivePlacement(placementId);
  if (!placement) return { error: "This placement is no longer open." };
  const agreement = placement.supplyAgreementId
    ? await prisma.supplyAgreement.findUnique({ where: { id: placement.supplyAgreementId }, select: { signedAt: true } })
    : null;
  const snapshot: PlacementSnapshot = {
    contractorStatus: placement.contractor.status,
    pendingDocCount: 0,
    agreement,
    inductionRequired: placement.inductionRequired,
  };
  const blocked = canComplete(snapshot, mode);
  if (blocked) return { error: blocked };

  const dne = await doNotEmployBlock(placement.contractorId);
  if (dne) return { error: dne };

  // The same mandatory-document gate as every other way of placing someone
  // (assignments/actions.ts), with the same "override with a note" escape.
  const check = await checkComplianceForAssignment({
    contractorId: placement.contractorId,
    companyId: placement.companyId,
    role: placement.role,
  });
  const note = typeof overrideNote === "string" ? overrideNote.trim().slice(0, 1000) : "";
  if (!check.allMet && !note) {
    return {
      needsOverride: `Missing mandatory compliance: ${check.missingTypes.join(", ")}. Give a reason to place them anyway, or cancel and verify their documents first.`,
    };
  }

  const name = `${placement.contractor.firstName} ${placement.contractor.lastName}`;
  const how =
    mode === "induction-done" ? "induction done" : mode === "no-induction" ? "no induction needed" : "no induction required";
  const notes = [
    `Created from the new-starter pipeline by ${actor.label} (${how}).`,
    !check.allMet ? `Compliance override: ${note}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    await prisma.$transaction(async (tx) => {
      // Claim the placement first: a double click finds it already completed.
      const claimed = await tx.newStarterPlacement.updateMany({
        where: { id: placement.id, ...ACTIVE_PLACEMENT },
        data: {
          completedAt: new Date(),
          ...(mode === "induction-done" ? { inductionDoneAt: new Date() } : {}),
          ...(mode === "no-induction" ? { inductionSkipped: true } : {}),
        },
      });
      if (claimed.count === 0) throw new Error("ALREADY_DONE");

      const assignment = await tx.assignment.create({
        data: {
          contractorId: placement.contractorId,
          companyId: placement.companyId,
          siteId: placement.siteId,
          role: placement.role,
          startDate: placement.startDate,
          status: "Placed",
          payRate: placement.payRate,
          chargeRate: placement.chargeRate,
          rateBasis: placement.rateBasis,
          notes,
        },
        select: { id: true },
      });
      await tx.newStarterPlacement.update({ where: { id: placement.id }, data: { assignmentId: assignment.id } });
      await tx.contractor.update({
        where: { id: placement.contractorId },
        data: {
          status: "Active",
          // The canonical "accepted onto PRL's books" stamp (see /applicants).
          ...(placement.contractor.approvedAt ? {} : { approvedAt: new Date() }),
        },
      });
    });
  } catch (err) {
    if (err instanceof Error && err.message === "ALREADY_DONE") return { error: "This placement was already completed." };
    throw err;
  }

  const start = agreementDate(placement.startDate);
  await logAssignmentActivity("Assigned to a client", placement.contractorId, placement.companyId, "Placed", `— new starter, ${how}`);
  await logActivity("New starter ready to start", "Contractor", placement.contractorId, `${placement.company.name}, starting ${start}`);
  await notifyReadyToStart(name, start, placement.company.name);
  refresh();
  return { ok: `${name} is ready to start on ${start} at ${placement.company.name}.` };
}

export async function cancelNewStarter(placementId: string): Promise<PipelineResult> {
  const actor = await staffActor();
  if (!actor) return { error: "Only PRL staff can do this." };
  const placement = await loadActivePlacement(placementId);
  if (!placement) return { error: "This placement is no longer open." };

  const claimed = await prisma.newStarterPlacement.updateMany({
    where: { id: placement.id, ...ACTIVE_PLACEMENT },
    data: { cancelledAt: new Date() },
  });
  if (claimed.count === 0) return { error: "This placement is no longer open." };

  // A withdrawn person must not be able to sign an agreement still in their inbox.
  if (placement.supplyAgreementId) {
    await prisma.supplyAgreement.updateMany({
      where: { id: placement.supplyAgreementId, signedAt: null },
      data: { signToken: null },
    });
  }

  // Someone still working elsewhere keeps their status; anyone else is no
  // longer coming, so Inactive.
  const live = await liveWorkCount(placement.contractorId);
  if (live === 0) {
    await prisma.contractor.update({ where: { id: placement.contractorId }, data: { status: "Inactive" } });
  }

  await logActivity(
    "New starter cancelled",
    "Contractor",
    placement.contractorId,
    `${placement.company.name} — withdrew before starting${live === 0 ? "; status Inactive" : ""}`
  );
  refresh();
  return { ok: "Cancelled." };
}
