import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";
import { NextResponse } from "next/server";

function profileComplete(c: {
  phone: string | null;
  address: string | null;
  postcode: string | null;
  dateOfBirth: Date | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  niNumber: string | null;
}): { complete: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!c.phone) missing.push("Phone number");
  if (!c.address) missing.push("Home address");
  if (!c.postcode) missing.push("Postcode");
  if (!c.dateOfBirth) missing.push("Date of birth");
  if (!c.emergencyContactName) missing.push("Emergency contact name");
  if (!c.emergencyContactPhone) missing.push("Emergency contact phone");
  if (!c.niNumber) missing.push("NI number");
  return { complete: missing.length === 0, missing };
}

export async function GET() {
  try {
    const guard = await requireStaff();
    if (!guard.ok) return NextResponse.json({ error: "Unauthorized" }, { status: guard.reason === "forbidden" ? 403 : 401 });

    const contractors = await prisma.contractor.findMany({
      where: {
        NOT: { email: { contains: "prl-placeholder" } },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        address: true,
        postcode: true,
        dateOfBirth: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        niNumber: true,
        inviteSentAt: true,
        inviteOpenedAt: true,
        profileCompletionSentAt: true,
        contractorLogin: {
          select: { id: true, email: true, lastLoginAt: true },
        },
        compliances: {
          select: { id: true, status: true, filePath: true },
        },
      },
      orderBy: [{ inviteSentAt: "desc" }, { lastName: "asc" }],
    });

    const total = contractors.length;
    const sent = contractors.filter((c) => c.inviteSentAt !== null).length;
    const opened = contractors.filter((c) => c.inviteOpenedAt !== null).length;
    const activated = contractors.filter((c) => c.contractorLogin !== null).length;
    const pending = contractors.filter((c) => c.inviteSentAt === null).length;

    // Profile completion stats (activated contractors only)
    const activatedContractors = contractors.filter((c) => c.contractorLogin !== null);
    const profileCompleteCount = activatedContractors.filter((c) => profileComplete(c).complete).length;
    const hasDocuments = activatedContractors.filter(
      (c) => c.compliances.some((d) => d.filePath)
    ).length;
    const noComplianceCount = contractors.filter((c) => c.compliances.length === 0).length;

    const list = contractors.map((c) => {
      const { complete, missing } = profileComplete(c);
      const docsUploaded = c.compliances.some((d) => d.filePath);
      return {
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.contractorLogin?.email || c.email,
        inviteSentAt: c.inviteSentAt,
        inviteOpenedAt: c.inviteOpenedAt,
        profileCompletionSentAt: c.profileCompletionSentAt ?? null,
        isActivated: c.contractorLogin !== null,
        lastLoginAt: c.contractorLogin?.lastLoginAt ?? null,
        profileComplete: complete,
        missingFields: missing,
        docsUploaded,
      };
    });

    return NextResponse.json({
      total, sent, opened, activated, pending,
      profileCompleteCount,
      hasDocuments,
      noComplianceCount,
      contractors: list,
    });
  } catch (err) {
    console.error("Campaign status error:", err);
    return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 });
  }
}
