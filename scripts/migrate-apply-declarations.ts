/**
 * Moves the /apply criminal-record answers out of plain Contractor.notes JSON
 * into the encrypted SensitiveDeclaration store, then removes them from notes.
 *
 * Dry run (counts only, needs only the database):
 *     railway run --service Postgres npx tsx scripts/migrate-apply-declarations.ts
 * Apply (also needs SENSITIVE_DATA_KEY, from the app service):
 *     ... --apply
 *
 * PII-free output: counts only. Only rewrites notes that parse as the /apply
 * JSON blob; anything else (free text, re-application history) is left alone.
 */

import { PrismaClient } from "@prisma/client";
import { encryptJson, decryptJson, loadSensitiveKey } from "../src/lib/sensitive-crypto";
import type { Declarations } from "../src/lib/declarations";

if (process.env.DATABASE_PUBLIC_URL) process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL;
if (!process.env.DATABASE_URL) {
  console.error("Run via: railway run --service Postgres npx tsx scripts/migrate-apply-declarations.ts");
  process.exit(1);
}

const APPLY = process.argv.includes("--apply");
const prisma = new PrismaClient();
const FIELDS = ["hasCriminalConviction", "hasPreviousConvictions"] as const;

async function main() {
  const rows = await prisma.contractor.findMany({
    where: { OR: FIELDS.map((f) => ({ notes: { contains: `"${f}"` } })) },
    select: { id: true, notes: true },
  });

  const parsed = rows.flatMap((r) => {
    try {
      const obj = JSON.parse(r.notes ?? "");
      return obj && typeof obj === "object" && !Array.isArray(obj) ? [{ id: r.id, obj: obj as Record<string, unknown> }] : [];
    } catch {
      return [];
    }
  });
  const withAnswers = parsed.filter((p) => FIELDS.some((f) => typeof p.obj[f] === "string" && p.obj[f]));

  console.log(`Notes mentioning the fields:        ${rows.length}`);
  console.log(`  parse as /apply JSON:              ${parsed.length}`);
  console.log(`  with an actual answer to move:     ${withAnswers.length}`);
  console.log(`  not JSON (left alone, check by hand): ${rows.length - parsed.length}`);

  if (!APPLY) {
    console.log("\nDry run — nothing written.");
    return;
  }
  const key = loadSensitiveKey();
  if (!key) {
    console.error("SENSITIVE_DATA_KEY missing or invalid — nothing written.");
    process.exit(1);
  }

  let moved = 0;
  for (const p of parsed) {
    const applyAnswers = {
      hasCriminalConviction: typeof p.obj.hasCriminalConviction === "string" ? p.obj.hasCriminalConviction : undefined,
      hasPreviousConvictions: typeof p.obj.hasPreviousConvictions === "string" ? p.obj.hasPreviousConvictions : undefined,
    };
    const stripped = { ...p.obj };
    for (const f of FIELDS) delete stripped[f];

    await prisma.$transaction(async (tx) => {
      if (applyAnswers.hasCriminalConviction || applyAnswers.hasPreviousConvictions) {
        const existing = await tx.sensitiveDeclaration.findUnique({ where: { contractorId: p.id } });
        const merged: Declarations = {
          ...(existing ? decryptJson<Declarations>(existing.payload, key) : {}),
          applyAnswers,
        };
        await tx.sensitiveDeclaration.upsert({
          where: { contractorId: p.id },
          create: { contractorId: p.id, payload: encryptJson(merged, key) },
          update: { payload: encryptJson(merged, key) },
        });
      }
      await tx.contractor.update({ where: { id: p.id }, data: { notes: JSON.stringify(stripped) } });
    });
    moved++;
  }
  console.log(`\nMoved and stripped: ${moved}`);
}

main().finally(() => prisma.$disconnect());
