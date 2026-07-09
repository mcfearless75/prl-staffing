import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { uploadToR2 } from "@/lib/r2";
import { auth } from "@/lib/auth";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

const ALLOWED_COMPLIANCE_TYPES = ["Right to Work", "CSCS", "Insurance"];

export async function POST(request: NextRequest) {
  try {
    // Middleware does not run on /api/* — the route must enforce auth itself
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();

    const contractorId = formData.get("contractorId") as string | null;
    const type = formData.get("type") as string | null;
    const file = formData.get("file") as File | null;

    if (!contractorId || !type) {
      return NextResponse.json(
        { error: "Missing contractorId or document type" },
        { status: 400 }
      );
    }

    // Security: Contractors can only upload to their own profile
    const sessionUser = session.user as { contractorId?: string; userType?: string };
    if (sessionUser.userType === "contractor" && sessionUser.contractorId !== contractorId) {
      return NextResponse.json(
        { error: "Unauthorized — you can only upload to your own profile" },
        { status: 403 }
      );
    }

    if (!ALLOWED_COMPLIANCE_TYPES.includes(type)) {
      return NextResponse.json(
        { error: "Invalid compliance document type" },
        { status: 400 }
      );
    }

    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum 10MB." },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed. Use PDF, JPG, or PNG." },
        { status: 400 }
      );
    }

    // Verify contractor exists
    const contractor = await prisma.contractor.findUnique({
      where: { id: contractorId },
      select: { id: true },
    });

    if (!contractor) {
      return NextResponse.json(
        { error: "Contractor not found" },
        { status: 404 }
      );
    }

    // Generate storage key — matches pattern used in /api/documents
    const ext = file.name.split(".").pop() || "pdf";
    const timestamp = Date.now();
    const storageKey = `contractors/${contractorId}/compliance/${type.toLowerCase().replace(/\s+/g, "-")}/${timestamp}.${ext}`;

    // Upload to R2
    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadToR2(storageKey, buffer, file.type);

    const today = new Date().toISOString().split("T")[0];
    const uploadNote =
      sessionUser.userType === "contractor"
        ? `Uploaded by contractor via self-service link on ${today}. Awaiting verification.`
        : `Uploaded by staff via compliance upload page on ${today}. Awaiting verification.`;

    // Upsert compliance record — update if exists, create if not
    const existingRecord = await prisma.complianceRecord.findFirst({
      where: { contractorId, type },
    });

    if (existingRecord) {
      await prisma.complianceRecord.update({
        where: { id: existingRecord.id },
        data: {
          documentName: file.name,
          filePath: storageKey,
          status: "Pending",
          notes: uploadNote,
        },
      });
    } else {
      await prisma.complianceRecord.create({
        data: {
          contractorId,
          type,
          documentName: file.name,
          filePath: storageKey,
          status: "Pending",
          notes: uploadNote,
        },
      });
    }

    // Redirect back to upload page with success indicator
    const redirectUrl = new URL(
      `/compliance/upload?contractorId=${encodeURIComponent(contractorId)}&success=true`,
      request.url
    );
    return NextResponse.redirect(redirectUrl, { status: 303 });
  } catch (error) {
    console.error("Compliance upload error:", error);
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 }
    );
  }
}
