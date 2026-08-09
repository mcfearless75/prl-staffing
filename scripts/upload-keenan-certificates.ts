/**
 * Upload Keenan Thomas training certificates to QMS (R2 + QmsDocument table)
 * Run with: npx ts-node scripts/upload-keenan-certificates.ts
 */

import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load local env overrides if present (won't override Railway env)
dotenv.config({ path: path.join(__dirname, "../.env.local") });
dotenv.config({ path: path.join(__dirname, "../.env") });

const SOURCE_DIR =
  "C:\\Users\\LAPTOP80\\prlsitesolutions.co.uk\\PRL Site Solutions Hub - Documents\\07 - Company Profile and Branding";

const DOCS = [
  {
    localFile: "beaconrisk_keenanthomas_display_screen_equipment_awareness_2026-05_certificate (1).pdf",
    fileName: "DSE Awareness Certificate – Keenan Thomas (May 2026)",
    folder: "Training & Competency",
    subfolder: "Management Team",
    r2Key: "qms/training/keenan-thomas-dse-awareness-2026-05.pdf",
  },
  {
    localFile: "beaconrisk_keenanthomas_modern_slavery_2026-05_certificate.pdf",
    fileName: "Modern Slavery Certificate – Keenan Thomas (May 2026)",
    folder: "Training & Competency",
    subfolder: "Management Team",
    r2Key: "qms/training/keenan-thomas-modern-slavery-2026-05.pdf",
  },
  {
    localFile: "beaconrisk_keenanthomas_sexual_harassment_in_the_workplace_2026-05_certificate.pdf",
    fileName: "Sexual Harassment Awareness Certificate – Keenan Thomas (May 2026)",
    folder: "Training & Competency",
    subfolder: "Management Team",
    r2Key: "qms/training/keenan-thomas-sexual-harassment-2026-05.pdf",
  },
];

async function main() {
  // Dynamic imports so env vars are loaded first
  const { PrismaClient } = await import("@prisma/client");
  const { S3Client, PutObjectCommand, HeadObjectCommand } = await import("@aws-sdk/client-s3");

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });

  const bucket = process.env.R2_BUCKET_NAME!;

  for (const doc of DOCS) {
    const filePath = path.join(SOURCE_DIR, doc.localFile);

    if (!fs.existsSync(filePath)) {
      console.error(`  ✗ File not found: ${filePath}`);
      continue;
    }

    const fileBuffer = fs.readFileSync(filePath);
    const fileSize = fileBuffer.length;

    console.log(`\nProcessing: ${doc.fileName}`);

    // Check if already in R2
    try {
      await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: doc.r2Key }));
      console.log(`  → Already in R2, skipping upload`);
    } catch {
      // Not found — upload
      await r2.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: doc.r2Key,
          Body: fileBuffer,
          ContentType: "application/pdf",
          ContentDisposition: `attachment; filename="${doc.fileName}.pdf"`,
        })
      );
      console.log(`  ✓ Uploaded to R2: ${doc.r2Key}`);
    }

    // Check if already in DB
    const existing = await prisma.qmsDocument.findFirst({
      where: { r2Key: doc.r2Key },
    });

    if (existing) {
      console.log(`  → Already in DB (id: ${existing.id}), skipping`);
      continue;
    }

    const record = await prisma.qmsDocument.create({
      data: {
        fileName: doc.fileName,
        filePath: `${doc.folder}/${doc.subfolder}`,
        folder: doc.folder,
        subfolder: doc.subfolder,
        fileType: "pdf",
        fileSize,
        r2Key: doc.r2Key,
        uploadedBy: "Admin",
        version: 1,
      },
    });

    console.log(`  ✓ Created DB record (id: ${record.id})`);
  }

  await prisma.$disconnect();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
