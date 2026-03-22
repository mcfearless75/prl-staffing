import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { uploadToR2 } from "@/lib/r2";
import { auth } from "@/lib/auth";

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

const DOC_TYPES = [
  "CSCS",
  "CV",
  "P45",
  "P60",
  "Passport",
  "DBS",
  "Insurance",
  "Qualification",
  "Right to Work",
  "IR35 Assessment",
  "Other",
];

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

    if (!DOC_TYPES.includes(type)) {
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

    // Auto-update ComplianceRecord when compliance-related docs are uploaded
    const COMPLIANCE_DOC_TYPES = [
      "CSCS", "DBS", "Insurance", "Qualification", "Right to Work", "IR35 Assessment", "Passport",
    ];

    if (COMPLIANCE_DOC_TYPES.includes(type)) {
      // Map document types to compliance types
      const complianceType = type === "Passport" ? "Right to Work" : type;

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
      complianceUpdated: COMPLIANCE_DOC_TYPES.includes(type),
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
