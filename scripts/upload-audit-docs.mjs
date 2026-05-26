#!/usr/bin/env node
/**
 * Bulk upload Audit folder documents into PRISM Policy Documents store.
 *
 * Run with Railway env (recommended):
 *   railway run node scripts/upload-audit-docs.mjs
 *
 * Or with a local env file:
 *   node --env-file=.env.local scripts/upload-audit-docs.mjs
 *
 * Files already in the DB (matched by filename) are skipped.
 * All docs start as isPublic: false — toggle in PRISM /policies as needed.
 */

import { readFileSync, existsSync } from "fs";
import { join, extname } from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";

// ─── Config ───────────────────────────────────────────────────────────────────

const AUDIT_FOLDER =
  "C:/Users/LAPTOP80/prlsitesolutions.co.uk/PRL Site Solutions Hub - Documents/Audit";

const CONTENT_TYPES = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

// ─── File → Metadata Map ──────────────────────────────────────────────────────
// filename: exact name on disk
// name: display name in PRISM
// category: one of the 6 PRISM policy categories
// version: optional

const FILES = [
  {
    filename: "(#2471465219) TWIMC - Policy Level (002).pdf",
    name: "TWIMC - Policy Level (002)",
    category: "Business Operations",
  },
  {
    filename: "8. PRL Site Solutions Anti Bribery Policy.pdf",
    name: "PRL Site Solutions Anti Bribery Policy",
    category: "Compliance & Ethics",
  },
  {
    filename: "Data & Cyber Policy signed.pdf",
    name: "Data & Cyber Policy (Signed)",
    category: "Data & Privacy",
  },
  // "Data  Cyber Policy signed.pdf" is a duplicate of above — skipped
  {
    filename: "FPSSummary26-05-20-12-00-06 PRL.xlsx",
    name: "FPS Summary - PRL (May 2026)",
    category: "Business Operations",
  },
  {
    filename: "GDPR Policy signed.pdf",
    name: "GDPR Policy (Signed)",
    category: "Data & Privacy",
  },
  {
    filename: "Misc - ISO Accreditation.pdf",
    name: "ISO Accreditation",
    category: "Accreditations",
  },
  {
    filename: "NRP PRL Contract CIS.pdf",
    name: "NRP PRL Contract CIS",
    category: "Business Operations",
  },
  {
    filename: "NRP Right to Work Policy.pdf",
    name: "NRP Right to Work Policy",
    category: "Compliance & Ethics",
  },
  {
    filename: "PRL Right to Work Policy.docx",
    name: "PRL Right to Work Policy",
    category: "Compliance & Ethics",
  },
  {
    filename: "PRL_NRP_DD_2026 Complaince.docx",
    name: "PRL NRP Due Diligence 2026 - Compliance",
    category: "Business Operations",
  },
  {
    filename: "Pre-audit information request - agency audit (updated April 2026) (003).docx",
    name: "Pre-Audit Information Request - Agency Audit (April 2026)",
    category: "Business Operations",
  },
  {
    filename: "Section 2.1 - PRL-Key-Information-Document-Template.docx",
    name: "Key Information Document Template",
    category: "Worker Documents",
  },
  {
    filename: "Section 6.1 - PRL Site Solutions Modern Slavery Policy.pdf",
    name: "Modern Slavery Policy",
    category: "Compliance & Ethics",
  },
  {
    filename: "Section 6.1 - PRL-RAMS-Modern-Slavery.docx",
    name: "RAMS - Modern Slavery",
    category: "Compliance & Ethics",
  },
  {
    filename: "Section 7.1 - PRL-Anti-Bribery-and-Corruption-Policy.docx",
    name: "Anti-Bribery and Corruption Policy",
    category: "Compliance & Ethics",
  },
  {
    filename: "Section 7.1 - PRL-CCO-Policy-Statement.docx",
    name: "Corporate Criminal Offence Policy Statement",
    category: "Compliance & Ethics",
  },
  {
    filename: "Section 7.1 - PRL-Gifts-and-Hospitality-Policy.docx",
    name: "Gifts and Hospitality Policy",
    category: "Compliance & Ethics",
  },
  {
    filename: "Section 7.1 - PRL-Gifts-and-Hospitality-Register.docx",
    name: "Gifts and Hospitality Register",
    category: "Compliance & Ethics",
  },
  {
    filename: "Section 7.1 - PRL-RAMS-Corporate-Criminal-Offence.docx",
    name: "RAMS - Corporate Criminal Offence",
    category: "Compliance & Ethics",
  },
  {
    filename: "Section 7.2 - CIS Summary 26-05-11-32-52 PRL.xlsx",
    name: "CIS Summary - PRL (May 2026)",
    category: "Business Operations",
  },
  {
    filename: "Section 7.3 - CE_Insurance.pdf",
    name: "Cyber Essentials Insurance Certificate",
    category: "Accreditations",
  },
  {
    filename: "Section 7.3 - CyberEssentials_PRL.pdf",
    name: "Cyber Essentials Certificate",
    category: "Accreditations",
  },
  {
    filename: "Section 7.3 - Data-Protection-Policy.docx",
    name: "Data Protection Policy",
    category: "Data & Privacy",
  },
  {
    filename: "Section 7.3 - PRL-Business-Continuity-Disaster-Recovery-Plan.docx",
    name: "Business Continuity & Disaster Recovery Plan",
    category: "Business Operations",
  },
  {
    filename: "Section 7.3 - Registration Certificate - ZC110047.pdf",
    name: "ICO Registration Certificate ZC110047",
    category: "Accreditations",
  },
  {
    filename: "Section 8.4 -  H&S Policy 26-27.pdf",
    name: "Health & Safety Policy 2026-2027",
    category: "Health & Safety",
  },
  {
    filename: "Section 8.5 - Whistleblowing Policy PRL - WBP1.docx",
    name: "Whistleblowing Policy",
    category: "Compliance & Ethics",
  },
  {
    filename: "Section 8.6 - PRL-Worker-Handbook.docx",
    name: "Worker Handbook",
    category: "Worker Documents",
  },
  {
    filename: "Sections 2.2 and 2.3 - PRL-Agency-Workers-Regulations-Process.docx",
    name: "Agency Workers Regulations Process",
    category: "Worker Documents",
  },
  {
    filename: "Sections 8.1_2 - Policies - signed.pdf",
    name: "Policies (Signed)",
    category: "Compliance & Ethics",
  },
  {
    filename: "TWIMC - Policy Level.pdf",
    name: "TWIMC - Policy Level",
    category: "Business Operations",
  },
  {
    filename: "sexual-harassment-policy.docx",
    name: "Sexual Harassment Policy",
    category: "Health & Safety",
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  // Validate env
  const required = [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
    "DATABASE_URL",
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`\n❌ Missing env vars: ${missing.join(", ")}`);
    console.error("   Run with: railway run node scripts/upload-audit-docs.mjs\n");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
  const BUCKET = process.env.R2_BUCKET_NAME;

  // Get existing filenames to detect duplicates
  const existing = await prisma.policy.findMany({ select: { filename: true } });
  const existingNames = new Set(existing.map((p) => p.filename));

  console.log(`\n📂 PRISM Audit Folder Sync`);
  console.log(`   ${FILES.length} files in map · ${existingNames.size} already in DB\n`);

  let uploaded = 0;
  let skipped = 0;
  let notFound = 0;
  let failed = 0;

  for (const entry of FILES) {
    const filePath = join(AUDIT_FOLDER, entry.filename);

    // Skip if already in DB
    if (existingNames.has(entry.filename)) {
      console.log(`⏭️  Already exists — ${entry.name}`);
      skipped++;
      continue;
    }

    // Skip if file not found on disk
    if (!existsSync(filePath)) {
      console.log(`⚠️  Not found on disk — ${entry.filename}`);
      notFound++;
      continue;
    }

    const ext = extname(entry.filename).slice(1).toLowerCase();
    const contentType = CONTENT_TYPES[ext] || "application/octet-stream";
    const safeName = entry.filename.replace(/[^a-zA-Z0-9._\- ]/g, "_");
    const r2Key = `policies/${Date.now()}-${safeName}`;

    try {
      const buffer = readFileSync(filePath);

      await r2.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: r2Key,
          Body: buffer,
          ContentType: contentType,
        })
      );

      await prisma.policy.create({
        data: {
          name: entry.name,
          description: null,
          category: entry.category,
          filename: entry.filename,
          r2Key,
          fileType: ext,
          fileSize: buffer.length,
          version: entry.version || null,
          isPublic: false,
          uploadedBy: "bulk-import",
        },
      });

      console.log(`✅ ${entry.category.padEnd(22)} ${entry.name}`);
      uploaded++;
    } catch (err) {
      console.error(`❌ Failed — ${entry.filename}: ${err.message}`);
      failed++;
    }

    // Brief pause — avoid R2 rate limits on bulk upload
    await new Promise((r) => setTimeout(r, 150));
  }

  await prisma.$disconnect();

  console.log(`\n─────────────────────────────────`);
  console.log(`✅ Uploaded : ${uploaded}`);
  console.log(`⏭️  Skipped  : ${skipped} (already in DB)`);
  console.log(`⚠️  Not found: ${notFound}`);
  console.log(`❌ Failed   : ${failed}`);
  console.log(`\nDone. Toggle visibility at prismworkforce.online/policies\n`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
