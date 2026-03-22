import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getFromR2 } from "@/lib/r2";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("id");

    if (!documentId) {
      return NextResponse.json({ error: "Missing document ID" }, { status: 400 });
    }

    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Security: contractors can only download their own documents
    const contractorId = (session.user as { contractorId?: string })?.contractorId;
    const isStaff = !contractorId;

    if (!isStaff && document.contractorId !== contractorId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Fetch from R2
    const buffer = await getFromR2(document.storageKey);

    // Return file with proper headers for download
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": document.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${document.fileName}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Document download error:", error);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
