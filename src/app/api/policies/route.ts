import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { uploadToR2 } from "@/lib/r2";

export const dynamic = "force-dynamic";

// GET /api/policies — public (isPublic only) or all (auth)
export async function GET(request: NextRequest) {
  const session = await auth();
  const isStaff = !!session?.user;

  const policies = await prisma.policy.findMany({
    where: isStaff ? undefined : { isPublic: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(policies);
}

// POST /api/policies — upload new policy (auth required)
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const name = formData.get("name") as string;
    const description = formData.get("description") as string | null;
    const category = formData.get("category") as string;
    const version = formData.get("version") as string | null;
    const isPublic = formData.get("isPublic") === "true";

    if (!file || !name || !category) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
    const safeName = file.name.replace(/[^a-zA-Z0-9._\- ]/g, "_");
    const r2Key = `policies/${Date.now()}-${safeName}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadToR2(r2Key, buffer, file.type || "application/octet-stream");

    const policy = await prisma.policy.create({
      data: {
        name,
        description: description || null,
        category,
        filename: file.name,
        r2Key,
        fileType: ext,
        fileSize: file.size,
        version: version || null,
        isPublic,
        uploadedBy: session.user.email || "staff",
      },
    });

    return NextResponse.json(policy);
  } catch (error) {
    console.error("Policy upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
