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
    const rawKey = searchParams.get("key");

    if (!documentId && !rawKey) {
      return NextResponse.json({ error: "Missing document ID" }, { status: 400 });
    }

    // Security: contractors can only download their own documents
    const contractorId = (session.user as { contractorId?: string })?.contractorId;
    const isStaff = !contractorId;

    let storageKey: string;
    let fileName: string;
    let mimeType: string;

    if (documentId) {
      const document = await prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        return NextResponse.json({ error: "Document not found" }, { status: 404 });
      }

      if (!isStaff && document.contractorId !== contractorId) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }

      storageKey = document.storageKey;
      fileName = document.fileName || "download";
      mimeType = document.mimeType;
    } else {
      // Raw R2 key lookup — used by ComplianceRecord.filePath, which stores
      // the storage key directly rather than a Document row. Staff-only:
      // this page has no per-contractor ownership check available.
      if (!isStaff) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
      if (!rawKey!.startsWith("contractors/")) {
        return NextResponse.json({ error: "Invalid document key" }, { status: 400 });
      }

      storageKey = rawKey!;
      fileName = rawKey!.split("/").pop() || "document";
      const ext = fileName.split(".").pop()?.toLowerCase();
      const EXT_MIME: Record<string, string> = {
        pdf: "application/pdf",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
      };
      mimeType = (ext && EXT_MIME[ext]) || "application/octet-stream";
    }

    // Fetch from R2
    const buffer = await getFromR2(storageKey);

    // If view=true, serve inline (for viewing in browser) instead of download
    const viewMode = searchParams.get("view") === "true";
    const safeName = fileName.replace(/[^\w.\-]/g, "_");
    const disposition = viewMode ? "inline" : `attachment; filename="${safeName}"`;

    const ALLOWED_INLINE_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/gif", "image/webp"];
    const safeMime = viewMode && ALLOWED_INLINE_TYPES.includes(mimeType)
      ? mimeType
      : "application/octet-stream";

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": safeMime,
        "Content-Disposition": disposition,
        "Content-Length": buffer.length.toString(),
        ...(viewMode ? { "Cache-Control": "private, max-age=300" } : {}),
      },
    });
  } catch (error) {
    console.error("Document download error:", error);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
