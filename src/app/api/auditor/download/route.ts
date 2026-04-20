import { prisma } from "@/lib/db";
import { getFromR2 } from "@/lib/r2";
import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

function getJwtSecret() {
  const secret = process.env.AUDITOR_JWT_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("No JWT secret configured");
  return new TextEncoder().encode(secret);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("id");
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify auditor JWT
    try {
      await jwtVerify(token, getJwtSecret());
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!documentId) {
      return NextResponse.json({ error: "Missing document ID" }, { status: 400 });
    }

    const document = await prisma.qmsDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (!document.r2Key) {
      return NextResponse.json({ error: "No file stored for this document" }, { status: 404 });
    }

    const buffer = await getFromR2(document.r2Key);

    const mimeTypes: Record<string, string> = {
      pdf: "application/pdf",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      doc: "application/msword",
      xls: "application/vnd.ms-excel",
      ppt: "application/vnd.ms-powerpoint",
    };

    const contentType = mimeTypes[document.fileType] || "application/octet-stream";

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${document.fileName}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Auditor download error:", error);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
