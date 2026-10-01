import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/require-staff";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const guard = await requireStaff();
  if (!guard.ok) return NextResponse.json({ error: "Unauthorized" }, { status: guard.reason === "forbidden" ? 403 : 401 });

  let ids: string[] | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    ids = body?.ids;
  } catch {
    ids = undefined;
  }

  // Read first: updateMany returns only a count, and the profile Activity tab
  // needs to know whose documents were verified, and which.
  const where = ids && ids.length > 0 ? { id: { in: ids } } : { status: "Pending" };
  const targets = await prisma.complianceRecord.findMany({ where, select: { contractorId: true, type: true } });
  const result = await prisma.complianceRecord.updateMany({ where, data: { status: "Verified" } });

  const byContractor = new Map<string, string[]>();
  for (const t of targets) byContractor.set(t.contractorId, [...(byContractor.get(t.contractorId) ?? []), t.type]);
  const user = guard.session.user;
  await prisma.activityLog
    .createMany({
      data: [...byContractor].map(([contractorId, types]) => ({
        userId: user.id ?? null,
        userName: user.name || "Staff",
        userEmail: user.email ?? null,
        action: "Document verified (bulk)",
        entityType: "Contractor",
        entityId: contractorId,
        details: types.join(", "),
      })),
    })
    .catch(() => console.error("bulk-verify: activity log failed"));

  return NextResponse.json({ success: true, updated: result.count });
}
