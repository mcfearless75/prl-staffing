import { prisma } from "@/lib/db";
import { getFromR2 } from "@/lib/r2";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("id");

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
