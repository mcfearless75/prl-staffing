import { prisma } from "@/lib/db";
import { requireContractor } from "@/lib/require-staff";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { normaliseKnownAs } from "@/lib/contractor-name";
import { missingProfileFields, nameChange } from "@/lib/profile-completion";
import { NATIONALITY_OPTIONS, PRONOUN_OPTIONS, TITLE_OPTIONS, pickOption } from "@/lib/profile-options";

function text(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/**
 * The worker's App Invite Form. mode "save" writes whatever is filled in
 * ("Save and finish later"); mode "submit" writes only if every required field
 * is present, and stamps profileSubmittedAt the first time.
 */
export async function PUT(request: Request) {
  try {
    const guard = await requireContractor();
    if (!guard.ok) {
      return NextResponse.json({ error: "Not authenticated" }, { status: guard.reason === "forbidden" ? 403 : 401 });
    }
    const { contractorId: sessionContractorId } = guard;

    const body = await request.json();
    const { contractorId, mode } = body;

    // Security: contractors can only update their own profile
    if (contractorId !== sessionContractorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const existing = await prisma.contractor.findUnique({
      where: { id: contractorId },
      select: { firstName: true, lastName: true, nameChangedAt: true, nameChangedFrom: true, profileSubmittedAt: true },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Contractor.email is non-nullable and unique — it is the portal sign-in
    // identity, so a blank value can never be written.
    const normalizedEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!normalizedEmail) {
      return NextResponse.json(
        { error: "Email address is required — it is how you sign in to the portal." },
        { status: 400 }
      );
    }

    // A blank legal name is never written; blank means "leave as it was".
    const firstName = text(body.firstName) ?? existing.firstName;
    const lastName = text(body.lastName) ?? existing.lastName;

    const data = {
      title: pickOption(body.title, TITLE_OPTIONS),
      firstName,
      lastName,
      knownAs: normaliseKnownAs(body.knownAs, firstName),
      pronouns: pickOption(body.pronouns, PRONOUN_OPTIONS),
      nationality: pickOption(body.nationality, NATIONALITY_OPTIONS),
      phone: text(body.phone),
      email: normalizedEmail,
      address: text(body.address),
      postcode: text(body.postcode),
      dateOfBirth: text(body.dateOfBirth) ? new Date(body.dateOfBirth) : null,
      niNumber: text(body.niNumber),
      emergencyContactName: text(body.emergencyContactName),
      emergencyContactPhone: text(body.emergencyContactPhone),
      emergencyContactRelation: text(body.emergencyContactRelation),
    };

    if (data.dateOfBirth && isNaN(data.dateOfBirth.getTime())) {
      return NextResponse.json({ error: "Date of birth is not a valid date." }, { status: 400 });
    }

    const submitting = mode === "submit";
    if (submitting) {
      const missing = missingProfileFields({
        ...data,
        dateOfBirth: data.dateOfBirth ? "set" : null,
      });
      if (missing.length > 0) {
        return NextResponse.json(
          { error: `Please complete: ${missing.join(", ")}.`, missing },
          { status: 400 }
        );
      }
    }

    const change = nameChange(existing, { firstName, lastName });

    try {
      await prisma.contractor.update({
        where: { id: contractorId },
        data: {
          ...data,
          ...(change.changed
            ? {
                nameChangedAt: new Date(),
                // Keep the ORIGINAL name while a check is still open, so two
                // quick edits don't hide what staff need to compare against.
                nameChangedFrom: existing.nameChangedAt ? existing.nameChangedFrom : change.from,
              }
            : {}),
          ...(submitting && !existing.profileSubmittedAt ? { profileSubmittedAt: new Date() } : {}),
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return NextResponse.json(
          { error: "That email address is already in use by another worker." },
          { status: 409 }
        );
      }
      throw error;
    }

    // Log the activity
    try {
      const entries: string[] = [
        submitting ? "Contractor submitted their profile via portal" : "Contractor updated their own profile via portal",
      ];
      if (change.changed) entries.push(`Name changed by worker: ${change.from} → ${firstName} ${lastName}`);
      for (const details of entries) {
        await prisma.activityLog.create({
          data: {
            action: "UPDATE",
            entityType: "Contractor",
            entityId: contractorId,
            details,
            userId: sessionContractorId,
            userEmail: normalizedEmail,
          },
        });
      }
    } catch {
      // Don't fail the update if logging fails
    }

    return NextResponse.json({ success: true, submitted: submitting });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
