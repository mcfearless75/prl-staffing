/**
 * Import new contractors from the "update missing emails" batch (April 2026).
 * Run: node scripts/import-contractors.mjs
 *
 * - Skips records already in the DB (email unique constraint)
 * - Skips records with no email (8 people — handle manually)
 * - Uses skipDuplicates so safe to run multiple times
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Raw data from: "update missing emails.xlsx" — 91 contractors with valid emails
// Name split: first word = firstName, remainder = lastName
function splitName(fullName) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

const RAW = [
  ["Adam strode", "Strodeltd@outlook.com"],
  ["Aiden Hibbert", "aidenh2490@gmail.com"],
  ["Amandeep singh Sulman", "amandeeps211997@gmail.com"],
  ["Amit Amit", "ns542150@gmail.com"],
  ["Amit Kumar", "amitmann110@gmail.com"],
  ["Amritpal Amritpal", "Amrit8441@gmail.com"],
  ["Ankit sharma", "sankit202211@gmail.com"],
  ["Arbaz Khan", "arbazkhana553@gmail.com"],
  ["Ben Cross", "crossland22rov@gmail.com"],
  ["Blakes Enemo", "enemo.blakes@gmail.com"],
  ["Charles Deppner", "chaz-deppner@hotmail.co.uk"],
  ["Chris Ainscough", "chris.aa778@gmail.com"],
  ["Colin Ohare", "colin@cpoh.co.uk"],
  ["Connor GO", "connorgo98@outlook.com"],
  ["Craig McDermott", "Craigmacca85@hotmail.co.uk"],
  ["Daniel Dunphy", "dandunphy@hotmail.co.uk"],
  ["Daniel Metcalfe", "dannyD500@hotmail.co.uk"],
  ["Danny Gardner", "dancg717@gmail.com"],
  ["Danny Wood", "dannywood91@hotmail.co.uk"],
  ["David Blackburn", "dayblackburn92@gmail.com"],
  ["Dylan Culshaw", "dylaninglesby@gmail.com"],
  ["Elliot Patrick", "e.patrick26@icloud.com"],
  ["Emanuel Ciorobitca", "emanuelciorobitca@yahoo.com"],
  ["Ethan Quinn", "ethanquinn215@icloud.com"],
  ["Eddie Jones", "jonesedd74@yahoo.co.uk"],
  ["Eddie Michael Jones", "Eddie.m.j@icloud.com"],
  ["Edward Wright", "Exwright98@gmail.com"],
  ["Gary Smith", "gary.smith81@icloud.com"],
  ["George Chambers", "georgechambers97@hotmail.co.uk"],
  ["Harpal Singh", "harpalpurewal15@gmail.com"],
  ["Harry Hall", "harryh903@outlook.com"],
  ["Hilary Chima", "Hilc1211@gmail.com"],
  ["Ian Ross", "Ianross197@gmail.com"],
  ["Inder jeet Singh", "Indersandhu4013@gmail.com"],
  ["James Devine", "jackbailey1293@gmail.com"],
  ["James Farrell", "james11iphone13@icloud.com"],
  ["Jerimiah Nartey", "hansonjeremiah281@gmail.com"],
  ["John Shields", "johnowens2004@icloud.com"],
  ["Johnnie Adderley Mcguirk", "Johnnieadd05@gmail.com"],
  ["Johnny Brannigan", "johnybrannigan@hotmail.com"],
  ["Josh Davies", "joshuadavies2216@gmail.com"],
  ["Keiran Sealey", "kieranpaulsealey@hotmail.com"],
  ["Kev Hazlett", "Kevinhazlett35@gmail.com"],
  ["Kevin Durnley", "kevindurney2022@gmail.com"],
  ["Kevin Hughes", "kevhughes613@gmail.com"],
  ["Kia Herbert", "kai.herbert257@aol.com"],
  ["Kieran Thompson", "kieranthompson12@gmail.com"],
  ["Lakhvir Kumar", "kumarlakhvir559@gmail.com"],
  ["Lee Murray", "lmurraylfc@icloud.com"],
  ["Leon Dettlaff", "Dettlaffleon@gmail.com"],
  ["Lewis Holmes", "Lewiss1878@gmail.com"],
  ["Liam Baugh", "liambaugh123@icloud.com"],
  ["Liam Brophy", "liambrophy1996@icloud.com"],
  ["Louis Bedwell", "louisbedwell89@outlook.com"],
  ["Lovejeet Singh", "Lovejeet19252@gmail.com"],
  ["Luke Tester", "ltester91@googlemail.com"],
  ["Masroor Zaidi", "masroorz@yahoo.com"],
  ["Matthew Ryan", "matthewryan84@yahoo.com"],
  ["Mehair Ali", "Mehairali2018@outlook.com"],
  ["Michael Boyle", "mike_boyle08@outlook.com"],
  ["Michael Rodney", "michaelrodney10@gmail.com"],
  ["Mike Rathmill", "mrathmill@yahoo.com"],
  ["Octavia Dutch", "octaviandutu24@gmail.com"],
  ["Patrick Doherty", "doherty-patrick3@sky.com"],
  ["Patrick Whitington", "patrickelec@hotmail.com"],
  ["Paul McLoughlin", "paulmcloughlin47@yahoo.com"],
  ["Paul Tillett", "paultillett79@hotmail.com"],
  ["Peter Robbins", "safetypeter@hotmail.com"],
  ["Peter Walsh", "peterwalsh77@yahoo.co.uk"],
  ["Ray Hanratty", "rahanratty03@outlook.com"],
  ["Reece Lloyd", "lloydreece16@gmail.com"],
  ["Rob Povall", "robpovall@hotmail.com"],
  ["Sam Ilkovics", "Samilkovics@yahoo.com"],
  ["Sam Mock", "Sam.m98@outlook.com"],
  ["Sean Weatherall", "seanwether@gmail.com"],
  ["Shaun Holmes", "sholmeselectricalltd@gmail.com"],
  ["Sheamus Brennan", "Sheamusbrennan5@gmail.com"],
  ["Sonya Kirova", "sonita1705@gmail.com"],
  ["Stephen Cavanagh", "Stetcav@gmail.com"],
  ["Steve Gallagher", "ste_gallagher72@live.com"],
  ["Surjan Singh", "singhsurjan027@gmail.com"],
  ["Tyler Heijm", "tylerheijm1997@hotmail.com"],
  ["Varinder Singh", "Varinder2603@gmail.com"],
  ["Zach Dobby", "zachdobie@icloud.com"],
  ["Michael Shelly", "Taylashelley88@icloud.com"],
  ["Daniel Stuart", "Dannystuart12@gmail.com"],
  ["Lukas Kuchnio", "Lukaskuchnio@gmail.com"],
  ["Peter Thompson", "petertomo65@gmail.com"],
  ["Gary Bates", "Garybatesy250@gmail.com"],
  ["Theo Bridge", "Theodorebridge10@outlook.com"],
  ["Yousef Mehr", "Yousef.a.mehr@gmail.com"],
];

// Contractors with no email — log for manual follow-up
const NO_EMAIL = [
  "Callum Roberts",
  "Dylan Kearney",
  "Jimmy McAllister",
  "Layton Mitchell",
  "Micheal Murphy",
  "Neil Houghton",
  "Nitish Sahni",
  "Paul Schumann",
];

async function main() {
  console.log(`\n📋 PRISM — New Contractor Import (April 2026 batch)`);
  console.log(`${"─".repeat(55)}`);
  console.log(`  Total with emails : ${RAW.length}`);
  console.log(`  Skipped (no email): ${NO_EMAIL.length}`);
  console.log(`${"─".repeat(55)}\n`);

  const data = RAW.map(([fullName, email]) => {
    const { firstName, lastName } = splitName(fullName);
    return {
      firstName,
      lastName,
      email: email.trim(),
      status: "Active",
    };
  });

  // Deduplicate within the batch by email (case-insensitive)
  const seen = new Set();
  const deduped = data.filter((c) => {
    const key = c.email.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (deduped.length < data.length) {
    console.log(`  ⚠  Removed ${data.length - deduped.length} duplicate email(s) within batch\n`);
  }

  // Check which emails already exist in the DB
  const emails = deduped.map((c) => c.email.toLowerCase());
  const existing = await prisma.contractor.findMany({
    where: { email: { in: emails } },
    select: { email: true, firstName: true, lastName: true },
  });

  const existingEmails = new Set(existing.map((c) => c.email.toLowerCase()));
  const toCreate = deduped.filter((c) => !existingEmails.has(c.email.toLowerCase()));
  const alreadyIn = deduped.filter((c) => existingEmails.has(c.email.toLowerCase()));

  console.log(`  Already in DB    : ${alreadyIn.length}`);
  console.log(`  New to create    : ${toCreate.length}`);
  console.log();

  if (toCreate.length === 0) {
    console.log("✅  Nothing to import — all contractors already exist in the database.\n");
    return;
  }

  // Use placeholder email format for DB where email must be unique
  const result = await prisma.contractor.createMany({
    data: toCreate,
    skipDuplicates: true,
  });

  console.log(`✅  Created ${result.count} new contractors\n`);

  console.log("New contractors added:");
  toCreate.forEach((c, i) => {
    console.log(`  ${String(i + 1).padStart(2, " ")}. ${c.firstName} ${c.lastName} — ${c.email}`);
  });

  if (alreadyIn.length > 0) {
    console.log("\nAlready existed (skipped):");
    alreadyIn.forEach((c) => console.log(`      ${c.firstName} ${c.lastName} — ${c.email}`));
  }

  console.log("\n⚠  Contractors with NO EMAIL (manual follow-up needed):");
  NO_EMAIL.forEach((name) => console.log(`      ${name}`));

  console.log(`\n${"─".repeat(55)}`);
  console.log(`  Done. Go to /campaign and send the welcome email.`);
  console.log(`${"─".repeat(55)}\n`);
}

main()
  .catch((e) => {
    console.error("\n❌ Import failed:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
