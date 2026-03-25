import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";

// GET handler: Quick verify from contractor detail page (redirects back)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const redirectTo = searchParams.get("redirect") || "/compliance";

    const record = await prisma.complianceRecord.findUnique({ where: { id } });
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

    // Use NextResponse.redirect with the public URL to avoid 0.0.0.0 on Railway
    const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || "";
    if (baseUrl) {
      return NextResponse.redirect(new URL(redirectTo, baseUrl));
    }
    // Fallback: use next/navigation redirect (works server-side)
    redirect(redirectTo);
  } catch (error) {
    // Re-throw Next.js redirect errors
    if (error instanceof Error && (error.message === "NEXT_REDIRECT" || (error as any)?.digest?.startsWith("NEXT_REDIRECT"))) throw error;
    console.error("Quick verify error:", error);
    return NextResponse.json({ error: "Failed to verify" }, { status: 500 });
  }
}

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
