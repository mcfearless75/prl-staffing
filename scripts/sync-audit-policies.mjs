#!/usr/bin/env node
/**
 * sync-audit-policies.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Syncs the local Audit folder → PRISM Policy Documents store.
 *
 * What it does:
 *   ✅ Uploads files that are new (not yet in DB)
 *   ✅ Re-uploads files whose size has changed (updated on disk)
 *   🗑  Marks removed files as archived (soft-delete — does NOT delete from R2)
 *   ⏭  Skips unchanged files
 *
 * Run manually:
 *   railway run node scripts/sync-audit-policies.mjs
 *
 * Run with local env file:
 *   node --env-file=.env.local scripts/sync-audit-policies.mjs
 *
 * For scheduled runs: see scripts/sync-audit-policies.bat
 */

import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, extname, basename } from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";

// ─── Config ───────────────────────────────────────────────────────────────────

const AUDIT_FOLDER =
  "C:/Users/LAPTOP80/prlsitesolutions.co.uk/PRL Site Solutions Hub - Documents/Audit";

// Subdirectories to ignore (they contain payroll/tax data, not policies)
const IGNORE_DIRS = new Set(["PAYE", "VAT"]);

// File extensions we accept
const VALID_EXTS = new Set(["pdf", "docx", "doc", "xlsx", "xls", "pptx", "ppt"]);

const CONTENT_TYPES = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ppt: "application/vnd.ms-powerpoint",
};

// ─── Category detection ───────────────────────────────────────────────────────
// Returns one of the 6 PRISM policy categories based on filename heuristics.

function detectCategory(filename) {
  const f = filename.toLowerCase();
  if (/gdpr|data.protect|cyber|data.*policy|privacy/.test(f)) return "Data & Privacy";
  if (/h.?s|health.*safety|safety.*health/.test(f)) return "Health & Safety";
  if (/iso|accreditat|certif|registration|cyber.essentials|insurance/.test(f))
    return "Accreditations";
  if (/handbook|key.information|agency.worker|worker.doc|kid|awr/.test(f))
    return "Worker Documents";
  if (/anti.brib|bribery|modern.slavery|gdpr|cco|corporate.criminal|gifts|hospitality|whistleblow|right.to.work|sexual.harass|policy|compliance|ethical|conduct/.test(f))
    return "Compliance & Ethics";
  return "Business Operations";
}

// ─── Name derivation ─────────────────────────────────────────────────────────
// Strips section prefixes and file extension to produce a readable display name.

function deriveName(filename) {
  return filename
    .replace(/\.[^.]+$/, "")                          // remove extension
    .replace(/^Section[s]?\s[\d._]+\s+-\s+/i, "")    // "Section 7.1 - "
    .replace(/^[\d.]+\.\s+/, "")                      // "8. "
    .replace(/^Misc\s+-\s+/i, "")                     // "Misc - "
    .replace(/^PRL[-_\s]+/i, "PRL ")                  // normalise PRL prefix
    .replace(/[-_]+/g, " ")                           // dashes/underscores → spaces
    .replace(/\s{2,}/g, " ")                          // collapse whitespace
    .trim();
}

// ─── Scan folder ─────────────────────────────────────────────────────────────
// Returns flat list of { filename, fullPath, ext, sizeBytes } for top-level files only.
// (Subdirectories are intentionally ignored unless IGNORE_DIRS allows them.)

function scanFolder(dir) {
  if (!existsSync(dir)) {
    throw new Error(`Audit folder not found: ${dir}`);
  }
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory()) continue; // skip subdirs
    const ext = extname(entry.name).slice(1).toLowerCase();
    if (!VALID_EXTS.has(ext)) continue;
    const fullPath = join(dir, entry.name);
    const stat = statSync(fullPath);
    files.push({
      filename: entry.name,
      fullPath,
      ext,
      sizeBytes: stat.size,
    });
  }
  return files;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  // Validate env
  const required = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "DATABASE_URL"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`\n❌ Missing env vars: ${missing.join(", ")}`);
    console.error("   Run with: railway run node scripts/sync-audit-policies.mjs\n");
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

  console.log(`\n📂 PRISM Audit Policy Sync — ${new Date().toLocaleString("en-GB")}`);
  console.log(`   Folder: ${AUDIT_FOLDER}\n`);

  // Scan disk
  let diskFiles;
  try {
    diskFiles = scanFolder(AUDIT_FOLDER);
  } catch (err) {
    console.error(`❌ ${err.message}`);
    await prisma.$disconnect();
    process.exit(1);
  }

  // Load existing DB records (uploadedBy = bulk-import or sync = our records)
  const existing = await prisma.policy.findMany({
    where: { uploadedBy: { in: ["bulk-import", "sync"] } },
    select: { id: true, filename: true, fileSize: true, r2Key: true },
  });

  const dbByFilename = new Map(existing.map((p) => [p.filename, p]));
  const diskFilenames = new Set(diskFiles.map((f) => f.filename));

  let uploaded = 0;
  let updated = 0;
  let skipped = 0;
  let archived = 0;
  let failed = 0;

  // ── Upload new / re-upload changed ──────────────────────────────────────────
  for (const file of diskFiles) {
    const dbRecord = dbByFilename.get(file.filename);
    const isNew = !dbRecord;
    const isChanged = dbRecord && dbRecord.fileSize !== file.sizeBytes;

    if (!isNew && !isChanged) {
      skipped++;
      continue;
    }

    const contentType = CONTENT_TYPES[file.ext] || "application/octet-stream";
    const safeName = file.filename.replace(/[^a-zA-Z0-9._\- ]/g, "_");
    const r2Key = `policies/${Date.now()}-${safeName}`;

    try {
      const buffer = readFileSync(file.fullPath);

      await r2.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: r2Key,
          Body: buffer,
          ContentType: contentType,
        })
      );

      const category = detectCategory(file.filename);
      const name = deriveName(file.filename);

      if (isNew) {
        await prisma.policy.create({
          data: {
            name,
            description: null,
            category,
            filename: file.filename,
            r2Key,
            fileType: file.ext,
            fileSize: file.sizeBytes,
            version: null,
            isPublic: false,
            uploadedBy: "sync",
          },
        });
        console.log(`✅ NEW     ${category.padEnd(22)} ${name}`);
        uploaded++;
      } else {
        // Update existing record with new R2 key + size
        await prisma.policy.update({
          where: { id: dbRecord.id },
          data: { r2Key, fileSize: file.sizeBytes, updatedAt: new Date() },
        });
        console.log(`🔄 UPDATED ${category.padEnd(22)} ${name}`);
        updated++;
      }
    } catch (err) {
      console.error(`❌ FAILED  ${file.filename}: ${err.message}`);
      failed++;
    }

    // Brief pause between uploads
    await new Promise((r) => setTimeout(r, 100));
  }

  // ── Soft-archive records whose file has been removed from disk ───────────────
  for (const [filename, record] of dbByFilename) {
    if (!diskFilenames.has(filename)) {
      // File removed from OneDrive — mark as archived (hide from UI)
      try {
        await prisma.policy.update({
          where: { id: record.id },
          data: { isPublic: false, uploadedBy: "sync-archived" },
        });
        console.log(`🗑  REMOVED ${filename}`);
        archived++;
      } catch (err) {
        console.error(`❌ Archive failed for ${filename}: ${err.message}`);
        failed++;
      }
    }
  }

  await prisma.$disconnect();

  const timestamp = new Date().toISOString();
  console.log(`\n─────────────────────────────────────────────`);
  console.log(`✅ New      : ${uploaded}`);
  console.log(`🔄 Updated  : ${updated}`);
  console.log(`⏭  Unchanged: ${skipped}`);
  console.log(`🗑  Removed  : ${archived}`);
  console.log(`❌ Failed   : ${failed}`);
  console.log(`🕐 Completed: ${timestamp}`);
  console.log(`─────────────────────────────────────────────\n`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
