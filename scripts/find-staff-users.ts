/**
 * Read-only: staff accounts whose name matches the given words, with role.
 * Used to set SENSITIVE_DATA_VIEWERS to the exact sign-in emails.
 *
 *     railway run --service Postgres npx tsx scripts/find-staff-users.ts paul adella
 */
import { PrismaClient } from "@prisma/client";

if (process.env.DATABASE_PUBLIC_URL) process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL;
const prisma = new PrismaClient();
const words = process.argv.slice(2);

async function main() {
  const users = await prisma.user.findMany({
    where: { OR: words.map((w) => ({ OR: [{ name: { contains: w, mode: "insensitive" as const } }, { email: { contains: w, mode: "insensitive" as const } }] })) },
    select: { name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });
  for (const u of users) console.log(`${u.name} | ${u.email} | ${u.role}`);
  if (users.length === 0) console.log("No matching staff accounts.");
}

main().finally(() => prisma.$disconnect());
