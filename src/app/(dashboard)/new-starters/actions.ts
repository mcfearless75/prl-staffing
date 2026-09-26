"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { emailMatches } from "@/lib/contractor-email";
import { refreshGeocode } from "@/lib/geo-refresh";

export type NewStarterActionState = { error?: string; ok?: string } | null;

async function requireStaffSession() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

/**
 * Convert a new starter checklist into a Subcontractor record.
 *
 * The checklist is the HMRC starter declaration — it carries the personal and
 * tax details PRL needs to actually pay someone, so converting prefills the
 * contractor rather than making staff retype it. If the email already exists we
 * link the submission to that contractor instead of creating a duplicate.
 */
export async function convertToContractor(
  submissionId: string,
  _prev: NewStarterActionState,
  _formData: FormData
): Promise<NewStarterActionState> {
  const session = await requireStaffSession();

  const submission = await prisma.newStarterSubmission.findUnique({
    where: { id: submissionId },
  });
  if (!submission) return { error: "Submission not found." };
  if (submission.status === "Processed") {
    return { error: "This checklist has already been processed." };
  }

  const email = submission.email.toLowerCase().trim();
  const dateOfBirth = submission.dob ? new Date(submission.dob) : null;

  let contractorId: string;
  let linkedExisting = false;

  // findFirst, not findUnique: the unique index is case-sensitive, so an
  // exact lookup can miss an existing person and create a second record for
  // them — which is how the duplicates merged on 2026-09-21 appeared.
  const existing = await prisma.contractor.findFirst({ where: { email: emailMatches(email) } });
  if (existing) {
    contractorId = existing.id;
    linkedExisting = true;
    // Only fill gaps — never overwrite details staff have already curated.
    await prisma.contractor.update({
      where: { id: existing.id },
      data: {
        phone: existing.phone || submission.phone,
        niNumber: existing.niNumber || submission.niNumber,
        address: existing.address || submission.address,
        postcode: existing.postcode || submission.postcode,
        dateOfBirth: existing.dateOfBirth ?? (dateOfBirth && !isNaN(dateOfBirth.getTime()) ? dateOfBirth : null),
      },
    });
  } else {
    try {
      const created = await prisma.contractor.create({
        data: {
          firstName: submission.firstName,
          lastName: submission.lastName,
          email,
          phone: submission.phone,
          status: "Active",
          niNumber: submission.niNumber || null,
          address: submission.address || null,
          postcode: submission.postcode || null,
          dateOfBirth: dateOfBirth && !isNaN(dateOfBirth.getTime()) ? dateOfBirth : null,
          notes: [
            `Created from New Starter Checklist (${new Date().toISOString().slice(0, 10)}).`,
            `HMRC employee statement: ${submission.employeeStatement}`,
            `Stated employment start date: ${submission.employmentStartDate}`,
          ].join("\n"),
        },
      });
      contractorId = created.id;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return { error: "A subcontractor with that email already exists. Refresh and try again." };
      }
      console.error("Failed to convert new starter submission:", e);
      return { error: "Could not create the subcontractor record. Please try again." };
    }
  }

  // Covers both branches: a new record, or an existing one whose blank
  // postcode was just filled from the checklist.
  await refreshGeocode("contractor", contractorId);

  await prisma.newStarterSubmission.update({
    where: { id: submissionId },
    data: {
      status: "Processed",
      contractorId,
      processedAt: new Date(),
      processedBy: session.user?.email || session.user?.name || "Unknown",
    },
  });

  await prisma.activityLog.create({
    data: {
      action: linkedExisting ? "NEW_STARTER_LINKED" : "NEW_STARTER_CONVERTED",
      entityType: "Contractor",
      entityId: contractorId,
      userName: session.user?.name || "Staff",
      userEmail: session.user?.email || "unknown",
      details: `New starter checklist for ${submission.firstName} ${submission.lastName} ${
        linkedExisting ? "linked to existing" : "converted to"
      } subcontractor record.`,
    },
  });

  revalidatePath("/new-starters");
  revalidatePath("/contractors");
  redirect(`/contractors/${contractorId}`);
}

export async function rejectSubmission(
  submissionId: string,
  _prev: NewStarterActionState,
  formData: FormData
): Promise<NewStarterActionState> {
  const session = await requireStaffSession();
  const reason = ((formData.get("reason") as string) || "").trim();

  await prisma.newStarterSubmission.update({
    where: { id: submissionId },
    data: {
      status: "Rejected",
      notes: reason || null,
      processedAt: new Date(),
      processedBy: session.user?.email || session.user?.name || "Unknown",
    },
  });

  revalidatePath("/new-starters");
  return { ok: "Checklist rejected." };
}

export async function reopenSubmission(
  submissionId: string,
  _prev: NewStarterActionState,
  _formData: FormData
): Promise<NewStarterActionState> {
  await requireStaffSession();

  await prisma.newStarterSubmission.update({
    where: { id: submissionId },
    data: { status: "New", processedAt: null, processedBy: null },
  });

  revalidatePath("/new-starters");
  return { ok: "Checklist reopened." };
}

export async function saveNotes(
  submissionId: string,
  _prev: NewStarterActionState,
  formData: FormData
): Promise<NewStarterActionState> {
  await requireStaffSession();
  const notes = ((formData.get("notes") as string) || "").trim();

  await prisma.newStarterSubmission.update({
    where: { id: submissionId },
    data: { notes: notes || null },
  });

  revalidatePath("/new-starters");
  return { ok: "Notes saved." };
}
