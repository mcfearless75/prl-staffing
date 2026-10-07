import { prisma } from "@/lib/db";
import { requireContractor } from "@/lib/require-staff";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { normaliseKnownAs } from "@/lib/contractor-name";
import { missingProfileFields, nameChange } from "@/lib/profile-completion";
import { NATIONALITY_OPTIONS, PRONOUN_OPTIONS, TITLE_OPTIONS, pickOption } from "@/lib/profile-options";
import { postcodeGeoReset, refreshGeocode } from "@/lib/geo-refresh";
import { logActivity } from "@/lib/activity-log";
import { describeProfileChanges } from "@/lib/profile-changes";
import { sendEmail } from "@/lib/email";
import { escapeHtml } from "@/lib/utils";
import { UPLOAD_ALERT_TO } from "@/lib/upload-notification";

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
      select: {
        nameChangedAt: true,
        nameChangedFrom: true,
        profileSubmittedAt: true,
        // Every field the worker can edit, so the Activity tab can say what changed.
        title: true,
        firstName: true,
        lastName: true,
        knownAs: true,
        pronouns: true,
        nationality: true,
        email: true,
        phone: true,
        address: true,
        postcode: true,
        dateOfBirth: true,
        niNumber: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        emergencyContactRelation: true,
      },
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
          ...postcodeGeoReset(existing.postcode, data.postcode),
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
    await refreshGeocode("contractor", contractorId);

    // Log the activity, naming the fields that changed (Erica, 2026-10-07).
    // Field names, not values — same rule as staff edits (profile-changes.ts):
    // the Activity tab is seen by all staff and these include NI and DOB.
    try {
      const firstSubmit = submitting && !existing.profileSubmittedAt;
      const changes = describeProfileChanges(existing, data);
      if (firstSubmit) {
        await logActivity("Profile updated by worker", "Contractor", contractorId, "Contractor submitted their profile via portal");
      } else if (changes) {
        // logActivity takes the worker's name and login email from the session.
        await logActivity("Profile updated by worker", "Contractor", contractorId, `Changed: ${changes}`);
        // Once submitted, any later change (new address, married name…) is
        // emailed to the office so it's not only discoverable in Activity.
        if (existing.profileSubmittedAt) {
          const appUrl = process.env.NEXTAUTH_URL || "https://www.prismworkforce.online";
          await sendEmail({
            to: UPLOAD_ALERT_TO,
            subject: `${firstName} ${lastName} changed their details in the app`,
            template: "profile-change-alert",
            html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1f2937;line-height:1.6;">
  <p><strong>${escapeHtml(`${firstName} ${lastName}`)}</strong> has changed their details in the PRISM app:</p>
  <p><strong>${escapeHtml(changes)}</strong></p>
  <p>Open their profile to see the new details.</p>
  <p><a href="${appUrl}/contractors/${contractorId}" style="display:inline-block;background:#1F4E79;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">Open their profile</a></p>
</div>`,
          });
        }
      }
      if (change.changed) {
        await logActivity("Profile updated by worker", "Contractor", contractorId, `Name changed by worker: ${change.from} → ${firstName} ${lastName}`);
      }
    } catch {
      // Don't fail the update if logging or the office email fails
    }

    return NextResponse.json({ success: true, submitted: submitting });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
