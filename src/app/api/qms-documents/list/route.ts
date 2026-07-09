import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const guard = await requireStaff();
    if (!guard.ok) return NextResponse.json({ error: "Unauthorized" }, { status: guard.reason === "forbidden" ? 403 : 401 });

    const documents = await prisma.qmsDocument.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Failed to fetch QMS documents:", error);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}
