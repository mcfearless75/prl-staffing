/**
 * One-time admin endpoint to backfill missing ComplianceRecords for contractors
 * who have uploaded documents but no corresponding ComplianceRecord was created.
 *
 * GET /api/admin/backfill-compliance
 * Auth: staff session required
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

const TYPE_MAP: Record<string, string> = {
  "Passport": "Right to Work",
  "Share Code": "Right to Work",
  "CSCS": "CSCS",
  "CCNSG": "CCNSG",
  "NPORS": "NPORS",
  "DBS": "DBS",
  "Insurance": "Insurance",
  "Qualification": "Qualification",
  "Right to Work": "Right to Work",
  "IR35 Assessment": "IR35 Assessment",
};

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch all compliance-related documents
  const docs = await prisma.document.findMany({
    where: { type: { in: Object.keys(TYPE_MAP) } },
    orderBy: [{ contractorId: "asc" }, { version: "desc" }],
  });

  // Fetch all existing compliance records
  const existingRecords = await prisma.complianceRecord.findMany({
    select: { contractorId: true, type: true },
  });
  const existingSet = new Set(existingRecords.map((r) => `${r.contractorId}::${r.type}`));

  const results: string[] = [];
  const seen = new Set<string>();
  let created = 0;
  let skipped = 0;

  for (const doc of docs) {
    const complianceType = TYPE_MAP[doc.type];
    if (!complianceType) continue;

    const key = `${doc.contractorId}::${complianceType}`;

    if (existingSet.has(key) || seen.has(key)) {
      skipped++;
      continue;
    }

    seen.add(key);

    await prisma.complianceRecord.create({
      data: {
        contractorId: doc.contractorId,
        type: complianceType,
        documentName: doc.fileName,
        filePath: doc.storageKey || null,
        status: "Pending",
        notes: `Backfilled from uploaded document "${doc.fileName}" (${doc.type}) — awaiting staff verification.`,
      },
    });

    results.push(`Created [${complianceType}] for contractor ${doc.contractorId} from ${doc.type}: ${doc.fileName}`);
    created++;
  }

  return NextResponse.json({
    success: true,
    summary: { created, skipped, totalDocsScanned: docs.length },
    details: results,
  });
}
