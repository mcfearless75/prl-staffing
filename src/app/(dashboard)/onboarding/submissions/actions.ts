"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendEmail, sendPasswordResetEmail, ONBOARDING_REPLY_TO } from "@/lib/email";
import { escapeHtml } from "@/lib/utils";
import { createSetPasswordUrl } from "@/lib/set-password-link";
import { findPotentialDuplicates, describeReasons } from "@/lib/duplicate-check";
import { refreshGeocode } from "@/lib/geo-refresh";

async function requireStaffSession() {
  const session = await auth();
  if (!session?.user || (session.user as { userType?: string }).userType !== "staff") {
    redirect("/login");
  }
  return session;
}

/**
 * Set-password link + welcome email. Shared by the manual "Send App Invite"
 * button and approval — approval used to create the login with a random
 * password and send nothing, so an approved subcontractor had an account they
 * could not get into until someone also clicked Send App Invite.
 */
async function issueAppInvite(email: string, name: string) {
  const resetUrl = await createSetPasswordUrl(email);

  const result = await sendPasswordResetEmail(email, name.split(" ")[0] || "there", resetUrl, true);
  if (!result.success) {
    console.error("Failed to send app invite:", result.error);
  }
  return result;
}

export async function approveAndCreateContractor(formData: FormData) {
  try {
    const session = await requireStaffSession();
    const submissionId = formData.get("submissionId") as string;

    const submission = await prisma.supplyAgreement.findUnique({
      where: { id: submissionId },
    });

    if (!submission) throw new Error("Submission not found");

    const contactEmail = submission.contactEmail.toLowerCase().trim();

    // Check if contractor already exists with this email
    const existing = await prisma.contractor.findFirst({
      // Case-insensitive: submissions are lower-cased at the door now, but rows
      // predating that are stored as typed, and an exact compare missed them.
      where: { email: { equals: contactEmail, mode: "insensitive" } },
    });

    if (existing) {
      // Just update status
      await prisma.supplyAgreement.update({
        where: { id: submissionId },
        data: {
          status: "Approved",
          reviewedBy: session?.user?.email || "admin",
          reviewedAt: new Date(),
        },
      });
      revalidatePath("/onboarding/submissions");
      redirect(`/onboarding/submissions/${submissionId}`);
    }

    // Parse names
    const nameParts = submission.contactName.trim().split(/\s+/);
    const firstName = submission.firstName || nameParts[0] || "Unknown";
    const lastName = submission.lastName || nameParts.slice(1).join(" ") || "Unknown";

    /**
     * Same person, different email address.
     *
     * The check above only catches a reused address. This is the case that
     * actually produced a duplicate: a second record created for somebody
     * already in the book under another address.
     *
     * Only an `exact` match stops the approval — that means a matching National
     * Insurance number, which is unique to a person, so a collision is either
     * the same person or a typo and both need a human. Weaker signals (a shared
     * phone, a common name) are recorded on the submission for the reviewer to
     * see, never blocked: site workers really do share a landline and a surname.
     */
    const bookForMatching = await prisma.contractor.findMany({
      select: {
        id: true, ref: true, firstName: true, lastName: true, email: true,
        status: true, phone: true, niNumber: true, dateOfBirth: true,
      },
    });
    const matches = findPotentialDuplicates(
      {
        email: contactEmail,
        firstName,
        lastName,
        phone: submission.contactPhone,
        niNumber: submission.niNumber,
        dateOfBirth: submission.dateOfBirth,
      },
      bookForMatching
    );
    const blocking = matches.find((m) => m.confidence === "exact");
    if (blocking) {
      throw new Error(
        `This looks like an existing subcontractor: ${blocking.record.firstName} ` +
          `${blocking.record.lastName}` +
          `${blocking.record.ref ? ` (${blocking.record.ref})` : ""} — ` +
          `matched on ${describeReasons(blocking.reasons)}. ` +
          `Update that record instead of creating a new one. If they really are ` +
          `two different people, correct the NI number on one of them first.`
      );
    }
    const duplicateNote = matches.length
      ? ` Possible duplicates flagged at approval: ${matches
          .map((m) => `${m.record.firstName} ${m.record.lastName}${m.record.ref ? ` (${m.record.ref})` : ""} [${describeReasons(m.reasons)}]`)
          .join("; ")}.`
      : "";

    // Create contractor
    const contractor = await prisma.contractor.create({
      data: {
        firstName,
        lastName,
        email: contactEmail,
        phone: submission.contactPhone || null,
        status: "Active",
        jobTitle: submission.supplyOf || null,
        niNumber: submission.niNumber || null,
        utrNumber: submission.utrNumber || null,
        address: submission.address || null,
        postcode: submission.postcode || null,
        dateOfBirth: submission.dateOfBirth || null,
        emergencyContactName: submission.emergencyContactName || null,
        emergencyContactPhone: submission.emergencyContactPhone || null,
        emergencyContactRelation: submission.emergencyContactRelation || null,
        ir35Status: "TBD",
        notes: `Created from onboarding submission on ${new Date().toLocaleDateString("en-GB")}. Company: ${submission.companyName}.${duplicateNote}`,
      },
    });

    await refreshGeocode("contractor", contractor.id);

    // Create login account with random temp password
    const tempPassword = crypto.randomBytes(16).toString("hex");
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    await prisma.contractorLogin.create({
      data: {
        contractorId: contractor.id,
        email: contactEmail,
        passwordHash,
      },
    });

    // Update submission status
    await prisma.supplyAgreement.update({
      where: { id: submissionId },
      data: {
        status: "Approved",
        reviewedBy: session?.user?.email || "admin",
        reviewedAt: new Date(),
        notes: `Contractor created: ${firstName} ${lastName} (${contractor.id})`,
      },
    });

    // Invite them straight away. A failed send must not undo the approval —
    // the contractor exists, and Send App Invite remains on the page to retry.
    try {
      await issueAppInvite(contactEmail, `${firstName} ${lastName}`);
    } catch (inviteErr) {
      console.error(`Approval invite failed for ${contactEmail}:`, inviteErr);
    }

    // Log activity
    try {
      await prisma.activityLog.create({
        data: {
          action: "CREATE",
          entityType: "Contractor",
          entityId: contractor.id,
          userId: (session?.user as { id?: string })?.id || null,
          userEmail: session?.user?.email || "system",
          details: `New contractor created from onboarding: ${firstName} ${lastName} (${submission.companyName})`,
        },
      });
    } catch {
      // Don't fail if activity log fails
    }

    revalidatePath("/onboarding/submissions");
    revalidatePath("/contractors");
    redirect(`/onboarding/submissions/${submissionId}`);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to approve submission:", error);
    throw new Error("Failed to approve and create contractor. Please try again.");
  }
}

async function sendRejectionEmail(email: string, name: string, companyName: string) {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#005f8c;color:#fff;padding:20px 24px;border-radius:8px 8px 0 0;">
        <h1 style="margin:0;font-size:20px;">Your Subcontractor Agreement</h1>
        <p style="margin:4px 0 0;font-size:13px;opacity:0.9;">PRL Site Solutions — Recruitment Specialists</p>
      </div>
      <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
        <p style="font-size:14px;color:#333;">Hi ${escapeHtml(name.split(" ")[0] || "there")},</p>
        <p style="font-size:14px;color:#333;">
          Thank you for submitting a subcontractor agreement for <strong>${escapeHtml(companyName)}</strong>.
          We've reviewed it and unfortunately we're unable to take it forward at this time.
        </p>
        <p style="font-size:14px;color:#333;">
          If you think something was missing or incorrect, or you'd like to discuss it, please get in touch
          and we'll be happy to talk it through.
        </p>
        <p style="font-size:13px;color:#666;margin-top:20px;">
          Call us on <strong>0800 772 3959</strong> or email
          <a href="mailto:info@prlsitesolutions.co.uk" style="color:#005f8c;">info@prlsitesolutions.co.uk</a>.
        </p>
      </div>
      <p style="text-align:center;font-size:11px;color:#999;margin-top:16px;">
        PRL Site Solutions | 0800 772 3959 | info@prlsitesolutions.co.uk
      </p>
    </div>
  `;

  try {
    const result = await sendEmail({
      to: email,
      subject: "Your subcontractor agreement — PRL Site Solutions",
      html,
      template: "supply-agreement-rejected",
      replyTo: ONBOARDING_REPLY_TO,
    });
    if (!result.success) console.error(`Failed to send rejection email to ${email}:`, result.error);
  } catch (err) {
    console.error(`Failed to send rejection email to ${email}:`, err);
  }
}

export async function updateSubmissionStatus(formData: FormData) {
  try {
    const session = await requireStaffSession();
    const submissionId = formData.get("submissionId") as string;
    const status = formData.get("status") as string;

    const previous = await prisma.supplyAgreement.findUnique({
      where: { id: submissionId },
      select: { status: true },
    });

    const submission = await prisma.supplyAgreement.update({
      where: { id: submissionId },
      data: {
        status,
        reviewedBy: session?.user?.email || "admin",
        reviewedAt: new Date(),
      },
    });

    // Tell the submitter. Before this a rejected supplier heard nothing and
    // was left waiting on the "we'll be in touch" receipt. Only on the
    // transition, so a repeat click does not send a second email; a failed
    // send does not undo the rejection.
    if (status === "Rejected" && previous?.status !== "Rejected") {
      await sendRejectionEmail(submission.contactEmail, submission.contactName, submission.companyName);
    }

    revalidatePath("/onboarding/submissions");
    redirect(`/onboarding/submissions/${submissionId}`);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to update submission status:", error);
    throw new Error("Failed to update status. Please try again.");
  }
}

export async function sendAppInvite(formData: FormData) {
  try {
    await requireStaffSession();
    const email = ((formData.get("email") as string) || "").toLowerCase().trim();
    const name = (formData.get("name") as string) || "";

    if (!email) throw new Error("Email is required");

    await issueAppInvite(email, name);

    revalidatePath(`/onboarding/submissions`);
  } catch (error) {
    console.error("Failed to send app invite:", error);
    throw new Error("Failed to send app invite. Please try again.");
  }
}
