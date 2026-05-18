/**
 * Create / reset the NQA auditor account with a magic-link token.
 * Run once: npx tsx scripts/reset-auditor.ts
 * Requires DATABASE_URL in your environment.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

const EMAIL    = "steven.cooper@nqa.com";
const NAME     = "Steven Cooper";
const ORG      = "NQA";
const LOGO     = "/nqa-logo.svg";
const BASE_URL = "https://www.prismworkforce.online";

async function main() {
  // Dummy hash — account uses magic link, password field is required in schema
  const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
  const loginToken   = crypto.randomBytes(32).toString("hex");

  const auditor = await prisma.auditorUser.upsert({
    where:  { email: EMAIL },
    update: {
      name: NAME, organisation: ORG, logoUrl: LOGO,
      passwordHash, loginToken,
    },
    create: {
      email: EMAIL, name: NAME, organisation: ORG,
      logoUrl: LOGO, role: "auditor",
      passwordHash, loginToken,
    },
  });

  const link = `${BASE_URL}/auditor/link/${auditor.loginToken}`;

  console.log("\n✅  NQA auditor account ready");
  console.log(`    Email:  ${auditor.email}`);
  console.log(`    Access: ${link}`);
  console.log("\n    Share the link above with Steven — no password needed.\n");
}

main()
  .catch((e) => { console.error("❌ ", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
