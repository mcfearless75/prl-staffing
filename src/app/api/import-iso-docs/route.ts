import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

const ISO_BASE = "C:\\Users\\LAPTOP80\\OneDrive - prlsitesolutions.co.uk\\Documents\\ISO9001 Management System\\ISO9001 Management System";

function getFileType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase().replace(".", "");
  return ext || "unknown";
}

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) return null;

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  const expectedKey = process.env.ADMIN_SECRET;
  if (!expectedKey || key !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun = searchParams.get("dry") === "true";
  const results: string[] = [];
  let created = 0;
  let skipped = 0;
  let uploaded = 0;

  try {
    // Recursively find all files
    function walkDir(dir: string, files: { fullPath: string; relativePath: string }[] = []) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(ISO_BASE, fullPath).replace(/\\/g, "/");
        if (entry.isDirectory()) {
          walkDir(fullPath, files);
        } else {
          files.push({ fullPath, relativePath });
        }
      }
      return files;
    }

    // This only works when run locally or if the files are on the server
    // For Railway deploy, we'll use a different approach
    let allFiles: { fullPath: string; relativePath: string }[];
    try {
      allFiles = walkDir(ISO_BASE);
    } catch {
      return NextResponse.json({
        error: "ISO directory not found. This endpoint must be run locally or files must be uploaded manually.",
        note: "Use the QMS Documents page to upload files individually on Railway.",
      });
    }

    const r2 = getR2Client();
    const bucket = process.env.R2_BUCKET_NAME;
    if (!bucket) {
      return NextResponse.json({ error: "R2_BUCKET_NAME environment variable is required" }, { status: 500 });
    }

    for (const file of allFiles) {
      const fileName = path.basename(file.relativePath);
      const dirPath = path.dirname(file.relativePath);
      const parts = dirPath.split("/");
      const folder = parts[0] || "Root";
      const subfolder = parts.slice(1).join("/") || null;
      const fileType = getFileType(fileName);
      const stats = fs.statSync(file.fullPath);
      const fileSize = stats.size;

      // Check if already imported
      const existing = await prisma.qmsDocument.findFirst({
        where: { fileName, folder, subfolder },
      });

      if (existing) {
        skipped++;
        results.push(`${fileName} — skipped (already exists)`);
        continue;
      }

      let r2Key: string | null = null;

      // Upload to R2 if configured
      if (r2 && !dryRun) {
        r2Key = `qms/${file.relativePath}`;
        const fileBuffer = fs.readFileSync(file.fullPath);

        try {
          await r2.send(
            new PutObjectCommand({
              Bucket: bucket,
              Key: r2Key,
              Body: fileBuffer,
              ContentType: getContentType(fileType),
            })
          );
          uploaded++;
        } catch (err) {
          console.error(`R2 upload failed for ${fileName}:`, err);
          results.push(`${fileName} — R2 upload failed`);
          r2Key = null;
        }
      }

      if (!dryRun) {
        await prisma.qmsDocument.create({
          data: {
            fileName,
            filePath: dirPath,
            folder,
            subfolder,
            fileType,
            fileSize,
            r2Key,
            uploadedBy: "system-import",
            version: 1,
          },
        });
      }

      created++;
      results.push(`${fileName} — ${dryRun ? "would create" : "created"}${r2Key ? " + uploaded to R2" : ""}`);
    }

    return NextResponse.json({
      message: dryRun ? "Dry run complete" : "Import complete",
      totalFiles: allFiles.length,
      created,
      skipped,
      uploaded,
      results,
    });
  } catch (error) {
    console.error("ISO import error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function getContentType(ext: string): string {
  const types: Record<string, string> = {
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    pdf: "application/pdf",
    doc: "application/msword",
    xls: "application/vnd.ms-excel",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
  };
  return types[ext] || "application/octet-stream";
}
