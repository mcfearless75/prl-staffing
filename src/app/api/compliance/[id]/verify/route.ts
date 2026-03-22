import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const record = await prisma.complianceRecord.findUnique({
      where: { id },
    });

    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    await prisma.complianceRecord.update({
      where: { id },
      data: {
        status: "Verified",
        notes: record.notes
          ? `${record.notes}\n\nVerified by ${session.user.email} on ${new Date().toISOString().split("T")[0]}`
          : `Verified by ${session.user.email} on ${new Date().toISOString().split("T")[0]}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Verify compliance error:", error);
    return NextResponse.json({ error: "Failed to verify" }, { status: 500 });
  }
}
