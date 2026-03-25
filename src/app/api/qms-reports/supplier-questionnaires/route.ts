import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
