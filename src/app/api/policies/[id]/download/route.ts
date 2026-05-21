import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getFromR2 } from "@/lib/r2";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const policy = await prisma.policy.findUnique({ where: { id } });
  if (!policy) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Non-public docs require auth
  if (!policy.isPublic) {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }
  }

  const buffer = await getFromR2(policy.r2Key);
  const contentType = CONTENT_TYPES[policy.fileType] || "application/octet-stream";
  const body = new Uint8Array(buffer);

  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${policy.filename}"`,
      "Content-Length": String(body.byteLength),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
