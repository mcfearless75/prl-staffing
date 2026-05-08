/**
 * Backfill missing ComplianceRecords for contractors who have uploaded documents
 * but no corresponding ComplianceRecord was created (historical data gap).
 *
 * Run: node scripts/backfill-compliance-records.mjs
 * Safe to re-run: skips records that already exist.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Maps Document.type → ComplianceRecord.type
const TYPE_MAP = {
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

async function main() {
  console.log("=== Compliance Backfill ===\n");

  // Fetch all documents that should have a compliance record
  const docs = await prisma.document.findMany({
    where: { type: { in: Object.keys(TYPE_MAP) } },
    orderBy: [{ contractorId: "asc" }, { type: "asc" }, { version: "desc" }],
  });

  console.log(`Found ${docs.length} compliance-related documents across all contractors.\n`);

  // Fetch all existing compliance records for quick lookup
  const existingRecords = await prisma.complianceRecord.findMany({
    select: { contractorId: true, type: true },
  });
  const existingSet = new Set(existingRecords.map((r) => `${r.contractorId}::${r.type}`));

  let created = 0;
  let skipped = 0;
  const seen = new Set(); // dedupe: one record per contractor+complianceType

  for (const doc of docs) {
    const complianceType = TYPE_MAP[doc.type];
    if (!complianceType) continue;

    const key = `${doc.contractorId}::${complianceType}`;

    // Already exists in DB or already processed this contractor+type
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

    console.log(`  ✓ Created [${complianceType}] for contractor ${doc.contractorId} (from ${doc.type}: ${doc.fileName})`);
    created++;
  }

  console.log(`\n=== Done ===`);
  console.log(`Created: ${created} new ComplianceRecords`);
  console.log(`Skipped: ${skipped} (already existed)`);
}

main()
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
