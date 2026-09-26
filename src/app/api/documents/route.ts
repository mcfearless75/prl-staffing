import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { uploadToR2 } from "@/lib/r2";
import { validateWorkerExpiry } from "@/lib/doc-expiry";
import { auth } from "@/lib/auth";
import { isValidComplianceType } from "@/lib/compliance-types";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// Non-compliance document types this route also needs to accept, which sit
// outside the compliance taxonomy in src/lib/compliance-types.ts. All 14 of
// the original hard-coded DOC_TYPES turned out to already exist inside the
// taxonomy (CV, Other, P45, P60 etc), so this legacy allow-list is empty —
// kept named/explicit so a genuinely non-taxonomy type has an obvious home.
// "Receipt" (expense receipts, Sprint C) is deliberately non-compliance —
// it must NOT trigger the ComplianceRecord auto-link block below.
const LEGACY_NON_TAXONOMY_TYPES: string[] = ["Receipt"];

function isValidDocType(type: string): boolean {
  return isValidComplianceType(type) || LEGACY_NON_TAXONOMY_TYPES.includes(type);
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string;
    const contractorId = formData.get("contractorId") as string;
    const notes = formData.get("notes") as string | null;

    if (!file || !type || !contractorId) {
      return NextResponse.json(
        { error: "Missing file, type, or contractorId" },
        { status: 400 }
      );
    }

    if (!isValidDocType(type)) {
      return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum 10MB." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed. Use PDF, images, or Word documents." },
        { status: 400 }
      );
    }

    // Security: Contractors can only upload to their own profile
    const sessionUser = session.user as { contractorId?: string; userType?: string };
    if (sessionUser.userType === "contractor" && sessionUser.contractorId !== contractorId) {
      return NextResponse.json({ error: "Unauthorized — you can only upload to your own profile" }, { status: 403 });
    }

    // Workers must give an in-date expiry (or tick "no expiry") on card types.
    // Checked before anything is stored, so a refused upload leaves no file.
    // Staff uploads are not subject to this.
    let workerExpiry: { expiryDate: Date | null; indefinite: boolean } | null = null;
    if (sessionUser.userType === "contractor") {
      const check = validateWorkerExpiry({
        type,
        expiryDate: (formData.get("expiryDate") as string | null) || null,
        noExpiry: formData.get("noExpiry") === "true",
      });
      if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
      workerExpiry = check;
    }
    const expiryFields = workerExpiry
      ? workerExpiry.indefinite
        ? { expiryDate: null, indefiniteExpiry: true }
        : workerExpiry.expiryDate
          ? { expiryDate: workerExpiry.expiryDate, indefiniteExpiry: false }
          : {}
      : {};

    // Check contractor exists
    const contractor = await prisma.contractor.findUnique({
      where: { id: contractorId },
    });
    if (!contractor) {
      return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
    }

    // Check for existing document of same type (for versioning)
    const existing = await prisma.document.findFirst({
      where: { contractorId, type },
      orderBy: { version: "desc" },
    });
    const version = existing ? existing.version + 1 : 1;

    // Generate storage key
    const ext = file.name.split(".").pop() || "pdf";
    const timestamp = Date.now();
    const storageKey = `contractors/${contractorId}/${type.toLowerCase().replace(/\s+/g, "-")}/${timestamp}-v${version}.${ext}`;

    // Upload to R2
    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadToR2(storageKey, buffer, file.type);

    // Who uploaded
    const uploadedBy =
      (session.user as { contractorId?: string }).contractorId
        ? "contractor"
        : session.user.email || "unknown";

    // Save to database
    const document = await prisma.document.create({
      data: {
        contractorId,
        type,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        storageKey,
        version,
        uploadedBy,
        notes: notes || null,
      },
    });

    // Auto-update ComplianceRecord for any type in the compliance taxonomy
    // (previously only a hard-coded 10-type subset triggered this)
    const isComplianceDoc = isValidComplianceType(type);

    if (isComplianceDoc) {
      // Map document types to compliance types — Passport / Share Code have
      // historically rolled up into the umbrella "Right to Work" record type
      const complianceType =
        type === "Passport" || type === "Share Code" ? "Right to Work"
        : type;

      // Check for existing compliance record
      const existingCompliance = await prisma.complianceRecord.findFirst({
        where: { contractorId, type: complianceType },
      });

      if (existingCompliance) {
        // Update existing record — mark as Pending review (staff will verify)
        await prisma.complianceRecord.update({
          where: { id: existingCompliance.id },
          data: {
            status: "Pending",
            documentName: file.name,
            filePath: storageKey,
            ...expiryFields,
            notes: `Document uploaded by contractor (v${version}) on ${new Date().toISOString().split("T")[0]}. Awaiting verification.`,
          },
        });
      } else {
        // Create new compliance record
        await prisma.complianceRecord.create({
          data: {
            contractorId,
            type: complianceType,
            documentName: file.name,
            status: "Pending", // Staff needs to verify
            filePath: storageKey,
            ...expiryFields,
            notes: `Document uploaded by contractor (v${version}) on ${new Date().toISOString().split("T")[0]}. Awaiting verification.`,
          },
        });
      }
    }

    return NextResponse.json({
      message: "Document uploaded successfully",
      document: {
        id: document.id,
        type: document.type,
        fileName: document.fileName,
        version: document.version,
      },
      complianceUpdated: isComplianceDoc,
    });
  } catch (error) {
    console.error("Document upload error:", error);
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 }
    );
  }
}

// Get documents for a contractor
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const contractorId = searchParams.get("contractorId");

    if (!contractorId) {
      return NextResponse.json({ error: "Missing contractorId" }, { status: 400 });
    }

    // Security: Contractors can only view their own documents
    const sessionUser = session.user as { contractorId?: string; userType?: string };
    if (sessionUser.userType === "contractor" && sessionUser.contractorId !== contractorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const documents = await prisma.document.findMany({
      where: { contractorId },
      orderBy: [{ type: "asc" }, { version: "desc" }],
    });

    return NextResponse.json({ documents });
  } catch (error) {
    console.error("Document fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}
