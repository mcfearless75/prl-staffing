/**
 * Full data export of every table to gzipped NDJSON, one file per model, plus
 * a manifest with row counts. A safety copy independent of Railway (and the
 * data half of a migration: the schema half is prisma/migrations).
 *
 *     railway run --service Postgres npx tsx scripts/export-db-json.ts <output-dir>
 *
 * The output contains personal data. Write it OUTSIDE the repo, keep it on an
 * encrypted disk, and delete it once it is no longer needed. Encrypted health
 * and criminal-record answers stay encrypted in the export.
 */
import { Prisma, PrismaClient } from "@prisma/client";
import { createWriteStream, mkdirSync, writeFileSync } from "fs";
import { createGzip } from "zlib";
import path from "path";

if (process.env.DATABASE_PUBLIC_URL) process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL;
const outDir = process.argv[2];
if (!process.env.DATABASE_URL || !outDir) {
  console.error("Usage: railway run --service Postgres npx tsx scripts/export-db-json.ts <output-dir>");
  process.exit(1);
}
if (path.resolve(outDir).startsWith(path.resolve(__dirname, ".."))) {
  console.error("Refusing to write personal data inside the repository. Choose a folder outside it.");
  process.exit(1);
}

const prisma = new PrismaClient();
const PAGE = 1000;

function delegateName(model: string) {
  return model.charAt(0).toLowerCase() + model.slice(1);
}

async function exportModel(model: Prisma.DMMF.Model): Promise<number> {
  const idFields = model.fields.filter((f) => f.isId).map((f) => f.name);
  const orderField = idFields[0] ?? model.primaryKey?.fields[0] ?? model.fields.find((f) => f.kind === "scalar")!.name;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const delegate = (prisma as any)[delegateName(model.name)];
  const gz = createGzip();
  const file = createWriteStream(path.join(outDir, `${model.name}.ndjson.gz`));
  gz.pipe(file);

  let count = 0;
  for (let skip = 0; ; skip += PAGE) {
    const rows = await delegate.findMany({ orderBy: { [orderField]: "asc" }, skip, take: PAGE });
    for (const r of rows) gz.write(JSON.stringify(r) + "\n");
    count += rows.length;
    if (rows.length < PAGE) break;
  }
  gz.end();
  await new Promise<void>((resolve) => file.on("finish", () => resolve()));
  return count;
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const manifest: Record<string, number> = {};
  for (const model of Prisma.dmmf.datamodel.models) {
    manifest[model.name] = await exportModel(model);
  }
  const total = Object.values(manifest).reduce((a, b) => a + b, 0);
  writeFileSync(
    path.join(outDir, "manifest.json"),
    JSON.stringify({ exportedAt: new Date().toISOString(), tables: manifest, totalRows: total }, null, 2)
  );
  console.log(`Exported ${Object.keys(manifest).length} tables, ${total} rows.`);
  const big = Object.entries(manifest).sort((a, b) => b[1] - a[1]).slice(0, 8);
  for (const [t, n] of big) console.log(`  ${t.padEnd(28)} ${n}`);
}

main().finally(() => prisma.$disconnect());
