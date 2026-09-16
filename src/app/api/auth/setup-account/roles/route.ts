import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { listActiveJobRoles } from "@/lib/job-roles";
import { requireContractor } from "@/lib/require-staff";

/**
 * GET — lists active job roles for the setup-account roles step.
 * Unauthenticated but read-only: role names are not sensitive data.
 */
export async function GET() {
  try {
    const roles = await listActiveJobRoles();
    return NextResponse.json({ roles });
  } catch (err) {
    console.error("setup-account/roles GET error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

/**
 * POST — persists the contractor's selected job roles during account setup.
 *
 * SECURITY: this endpoint requires an authenticated NextAuth session. The
 * client signs in (via the credentials provider) immediately after the
 * password step succeeds, then calls this route — contractorId is derived
 * solely from session.user.contractorId, the same pattern used by
 * requireSessionContractorId() in src/app/portal/timesheets/actions.ts and
 * src/app/portal/holiday/actions.ts. No client-supplied identifier (email or
 * contractorId) is trusted; without a valid session this route returns 401.
 */
export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const { allowed } = checkRateLimit(`setup-account-roles:${ip}`, 20, 15 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
    }

    const guard = await requireContractor();
    if (!guard.ok) {
      return NextResponse.json({ error: "Not authenticated." }, { status: guard.reason === "forbidden" ? 403 : 401 });
    }
    const { contractorId } = guard;

    const { roleIds } = await request.json();

    if (!Array.isArray(roleIds) || roleIds.some((id) => typeof id !== "string")) {
      return NextResponse.json({ error: "roleIds must be an array of strings" }, { status: 400 });
    }

    const contractor = await prisma.contractor.findUnique({
      where: { id: contractorId },
      select: { id: true, jobTitle: true },
    });

    if (!contractor) {
      return NextResponse.json(
        { error: "No contractor account found for this session." },
        { status: 404 }
      );
    }

    const requestedIds = [...new Set(roleIds)];
    const validRoles = requestedIds.length
      ? await prisma.jobRole.findMany({
          where: { id: { in: requestedIds }, active: true },
          select: { id: true, name: true },
        })
      : [];
    const validIds = new Set(validRoles.map((r) => r.id));

    await prisma.$transaction(async (tx) => {
      await tx.contractorJobRole.deleteMany({
        where: { contractorId: contractor.id, jobRoleId: { notIn: [...validIds] } },
      });
      if (validIds.size > 0) {
        await tx.contractorJobRole.createMany({
          data: [...validIds].map((jobRoleId) => ({ contractorId: contractor.id, jobRoleId })),
          skipDuplicates: true,
        });
      }
    });

    // Seed jobTitle from the first selected role, only when currently empty.
    if (!contractor.jobTitle && requestedIds.length > 0) {
      const primaryId = requestedIds.find((id) => validIds.has(id));
      const primaryRole = validRoles.find((r) => r.id === primaryId);
      if (primaryRole) {
        await prisma.contractor.update({
          where: { id: contractor.id },
          data: { jobTitle: primaryRole.name },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("setup-account/roles POST error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
