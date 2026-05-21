/**
 * One-off bulk upload script: pushes all Audit folder documents to R2
 * and seeds the Policy table in the database.
 *
 * Usage:
 *   1. Get your R2 credentials from the Railway dashboard (Variables tab)
 *   2. Set them in your shell:
 *        $env:R2_ACCOUNT_ID="xxxx"
 *        $env:R2_ACCESS_KEY_ID="xxxx"
 *        $env:R2_SECRET_ACCESS_KEY="xxxx"
 *        $env:R2_BUCKET_NAME="prl-documents"
 *        $env:DATABASE_URL="postgresql://..."   (also from Railway)
 *   3. Run:  npx tsx scripts/upload-policies.ts
 *
 *   Already uploaded files are skipped (idempotent — safe to re-run).
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const AUDIT_FOLDER = process.argv[2] ||
  "C:\\Users\\LAPTOP80\\prlsitesolutions.co.uk\\PRL Site Solutions Hub - Documents\\Audit";

// ─── Document catalogue ────────────────────────────────────────────────────
// Maps source filename → { display name, category, description, isPublic }
// Edit isPublic here to control what workers can see on /policy-documents
const CATALOGUE: Record<string, {
  name: string;
  category: string;
  description?: string;
  isPublic: boolean;
  version?: string;
  sortOrder?: number;
}> = {
  "(#2471465219) TWIMC - Policy Level (002).pdf": {
    name: "Policy Level Statement (v2)",
    category: "Compliance & Ethics",
    isPublic: true,
    sortOrder: 1,
  },
  "TWIMC - Policy Level.pdf": {
    name: "Policy Level Statement (v1)",
    category: "Compliance & Ethics",
    isPublic: false,
    sortOrder: 2,
  },
  "8. PRL Site Solutions Anti Bribery Policy.pdf": {
    name: "Anti-Bribery Policy (signed)",
    category: "Compliance & Ethics",
    isPublic: true,
    sortOrder: 10,
  },
  "Section 7.1 - PRL-Anti-Bribery-and-Corruption-Policy.docx": {
    name: "Anti-Bribery and Corruption Policy",
    category: "Compliance & Ethics",
    isPublic: true,
    sortOrder: 11,
  },
  "Section 7.1 - PRL-CCO-Policy-Statement.docx": {
    name: "Corporate Criminal Offence Policy Statement",
    category: "Compliance & Ethics",
    isPublic: false,
    sortOrder: 12,
  },
  "Section 7.1 - PRL-RAMS-Corporate-Criminal-Offence.docx": {
    name: "RAMS: Corporate Criminal Offence",
    category: "Compliance & Ethics",
    isPublic: false,
    sortOrder: 13,
  },
  "Section 7.1 - PRL-Gifts-and-Hospitality-Policy.docx": {
    name: "Gifts and Hospitality Policy",
    category: "Compliance & Ethics",
    isPublic: true,
    sortOrder: 14,
  },
  "Section 7.1 - PRL-Gifts-and-Hospitality-Register.docx": {
    name: "Gifts and Hospitality Register",
    category: "Compliance & Ethics",
    isPublic: false,
    sortOrder: 15,
  },
  "Section 6.1 - PRL Site Solutions Modern Slavery Policy.pdf": {
    name: "Modern Slavery Policy (signed)",
    category: "Compliance & Ethics",
    isPublic: true,
    sortOrder: 20,
  },
  "Section 6.1 - PRL-RAMS-Modern-Slavery.docx": {
    name: "RAMS: Modern Slavery",
    category: "Compliance & Ethics",
    isPublic: false,
    sortOrder: 21,
  },
  "Section 8.5 - Whistleblowing Policy PRL - WBP1.docx": {
    name: "Whistleblowing Policy",
    category: "Compliance & Ethics",
    isPublic: true,
    sortOrder: 25,
  },
  "Sections 8.1_2 - Policies - signed.pdf": {
    name: "Signed Policies Declaration",
    category: "Compliance & Ethics",
    isPublic: false,
    sortOrder: 30,
  },
  "Data & Cyber Policy signed.pdf": {
    name: "Data & Cyber Policy (signed)",
    category: "Data & Privacy",
    isPublic: false,
    sortOrder: 10,
  },
  "Data  Cyber Policy signed.pdf": {
    name: "Data & Cyber Policy (signed, alt)",
    category: "Data & Privacy",
    isPublic: false,
    sortOrder: 11,
  },
  "GDPR Policy signed.pdf": {
    name: "GDPR Policy (signed)",
    category: "Data & Privacy",
    isPublic: false,
    sortOrder: 12,
  },
  "Section 7.3 - Data-Protection-Policy.docx": {
    name: "Data Protection Policy",
    category: "Data & Privacy",
    isPublic: true,
    sortOrder: 13,
  },
  "Section 8.4 -  H&S Policy 26-27.pdf": {
    name: "Health & Safety Policy 2026–27",
    category: "Health & Safety",
    isPublic: true,
    version: "2026-27",
    sortOrder: 10,
  },
  "Section 7.3 - PRL-Business-Continuity-Disaster-Recovery-Plan.docx": {
    name: "Business Continuity & Disaster Recovery Plan",
    category: "Business Operations",
    description: "BCP/DRP covering M365, IT hardware, and operational resilience",
    isPublic: false,
    version: "1.1",
    sortOrder: 10,
  },
  "Misc - ISO Accreditation.pdf": {
    name: "ISO 9001 Accreditation",
    category: "Accreditations",
    isPublic: true,
    sortOrder: 10,
  },
  "Section 7.3 - CE_Insurance.pdf": {
    name: "Cyber Essentials Insurance Certificate",
    category: "Accreditations",
    isPublic: false,
    sortOrder: 20,
  },
  "Section 7.3 - CyberEssentials_PRL.pdf": {
    name: "Cyber Essentials Certificate",
    category: "Accreditations",
    isPublic: false,
    sortOrder: 21,
  },
  "Section 7.3 - Registration Certificate - ZC110047.pdf": {
    name: "ICO Registration Certificate (ZC110047)",
    category: "Accreditations",
    isPublic: false,
    sortOrder: 30,
  },
};

// Files to skip entirely (internal working docs, not policies)
const SKIP = new Set([
  "FPSSummary26-05-20-12-00-06 PRL.xlsx",
  "NRP PRL Contract CIS.pdf",
  "PRL_NRP_DD_2026 Complaince.docx",
  "Pre-audit information request - agency audit (updated April 2026) (003).docx",
  "Section 7.2 - CIS Summary 26-05-11-32-52 PRL.xlsx",
]);

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME || "prl-documents";

  if (!accountId || !accessKeyId || !secretAccessKey) {
    console.error("❌ Missing R2 env vars. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY");
    process.exit(1);
  }

  const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  const prisma = new PrismaClient();

  const files = fs.readdirSync(AUDIT_FOLDER).filter((f) => !SKIP.has(f));
  console.log(`\n📁 Found ${files.length} files to process\n`);

  for (const filename of files) {
    if (!CATALOGUE[filename]) {
      console.log(`⚠️  Skipping (not in catalogue): ${filename}`);
      continue;
    }

    const meta = CATALOGUE[filename];
    const ext = path.extname(filename).toLowerCase().slice(1);
    const r2Key = `policies/${filename}`;
    const filePath = path.join(AUDIT_FOLDER, filename);
    const fileBuffer = fs.readFileSync(filePath);
    const fileSize = fileBuffer.length;

    const contentTypeMap: Record<string, string> = {
      pdf: "application/pdf",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };

    // Check if already in DB
    const existing = await prisma.policy.findFirst({ where: { r2Key } });
    if (existing) {
      console.log(`✅ Already uploaded: ${meta.name}`);
      continue;
    }

    // Upload to R2
    process.stdout.write(`⬆️  Uploading: ${meta.name}...`);
    await r2.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: r2Key,
      Body: fileBuffer,
      ContentType: contentTypeMap[ext] || "application/octet-stream",
    }));
    process.stdout.write(" done\n");

    // Seed DB record
    await prisma.policy.create({
      data: {
        name: meta.name,
        description: meta.description || null,
        category: meta.category,
        filename,
        r2Key,
        fileType: ext,
        fileSize,
        version: meta.version || null,
        isPublic: meta.isPublic,
        sortOrder: meta.sortOrder || 0,
        uploadedBy: "bulk-upload",
      },
    });

    console.log(`   📄 DB record created (public: ${meta.isPublic})`);
  }

  await prisma.$disconnect();
  console.log("\n✅ Upload complete.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
