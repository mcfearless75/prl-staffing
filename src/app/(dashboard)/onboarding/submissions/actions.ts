"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";

async function requireStaffSession() {
  const session = await auth();
  if (!session?.user || (session.user as { userType?: string }).userType !== "staff") {
    redirect("/login");
  }
  return session;
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
      where: { email: contactEmail },
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
        notes: `Created from onboarding submission on ${new Date().toLocaleDateString("en-GB")}. Company: ${submission.companyName}.`,
      },
    });

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

export async function updateSubmissionStatus(formData: FormData) {
  try {
    const session = await requireStaffSession();
    const submissionId = formData.get("submissionId") as string;
    const status = formData.get("status") as string;

    await prisma.supplyAgreement.update({
      where: { id: submissionId },
      data: {
        status,
        reviewedBy: session?.user?.email || "admin",
        reviewedAt: new Date(),
      },
    });

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

    // Generate password reset token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Delete any existing tokens
    await prisma.passwordResetToken.deleteMany({ where: { email } });

    // Create new token
    await prisma.passwordResetToken.create({
      data: { email, token, expiresAt },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "https://prl-staffing-production.up.railway.app";
    const resetUrl = `${baseUrl}/set-password?token=${token}`;

    // Send welcome email
    const result = await sendPasswordResetEmail(email, name.split(" ")[0] || "there", resetUrl, true);

    if (!result.success) {
      console.error("Failed to send app invite:", result.error);
    }

    revalidatePath(`/onboarding/submissions`);
  } catch (error) {
    console.error("Failed to send app invite:", error);
    throw new Error("Failed to send app invite. Please try again.");
  }
}
