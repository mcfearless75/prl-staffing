import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";
import { NextResponse } from "next/server";

export async function GET() {
  const guard = await requireStaff();
  if (!guard.ok) return NextResponse.json({ error: "Unauthorized" }, { status: guard.reason === "forbidden" ? 403 : 401 });

  const logs = await prisma.activityLog.findMany({
    where: { action: "SUPPLIER_QUESTIONNAIRE" },
    orderBy: { createdAt: "desc" },
  });

  const responses = logs.map((log) => {
    let details = {};
    try {
      details = JSON.parse(log.details || "{}");
    } catch {
      // ignore parse errors
    }
    return {
      id: log.id,
      createdAt: log.createdAt,
      ...details,
    };
  });

  return NextResponse.json(responses);
}
