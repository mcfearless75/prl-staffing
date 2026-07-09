import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { verifyAuditor } from "@/lib/auditor-auth";

export async function GET() {
  const auditor = await verifyAuditor();
  if (!auditor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const policies = await prisma.policy.findMany({
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });

  return Response.json(policies);
}
