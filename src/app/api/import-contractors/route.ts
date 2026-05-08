import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

// ── April 2026 new-user batch ──────────────────────────────────────────────
const APRIL_BATCH: [string, string][] = [
  ["Adam Strode", "Strodeltd@outlook.com"],
  ["Aiden Hibbert", "aidenh2490@gmail.com"],
  ["Amandeep Singh Sulman", "amandeeps211997@gmail.com"],
  ["Amit Amit", "ns542150@gmail.com"],
  ["Amit Kumar", "amitmann110@gmail.com"],
  ["Amritpal Amritpal", "Amrit8441@gmail.com"],
  ["Ankit Sharma", "sankit202211@gmail.com"],
  ["Arbaz Khan", "arbazkhana553@gmail.com"],
  ["Ben Cross", "crossland22rov@gmail.com"],
  ["Blakes Enemo", "enemo.blakes@gmail.com"],
  ["Charles Deppner", "chaz-deppner@hotmail.co.uk"],
  ["Chris Ainscough", "chris.aa778@gmail.com"],
  ["Colin Ohare", "colin@cpoh.co.uk"],
  ["Connor Go", "connorgo98@outlook.com"],
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
  ["Inder Jeet Singh", "Indersandhu4013@gmail.com"],
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

const NO_EMAIL_BATCH = [
  "Jimmy McAllister", "Layton Mitchell", "Micheal Murphy", "Nitish Sahni",
];

// ── May 2026 batch (missing emails now resolved + new contractors) ─────────
const MAY_BATCH: [string, string][] = [
  ["Callum Roberts",   "callum_roberts1@icloud.com"],
  ["Dylan Kearney",    "dylankearney92@gmail.com"],
  ["Neil Houghton",    "neilhoughton1969@btinternet.com"],
  ["Paul Schumann",    "paul_schumann@hotmail.co.uk"],
  ["Liam Lawson",      "Leelaw5050@hotmail.com"],
  ["Natish Sahni",     "Indersandhu4013@gmail.com"],
  ["Gary Morris",      "garymorris2468@gmail.com"],
  ["Simon Dodsworth",  "Simondoddy19@gmail.com"],
  ["Jamie Woods",      "Jamie23woods@gmail.com"],
];

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let batchName = "April 2026";
    let batchData = APRIL_BATCH;
    try {
      const body = await request.json();
      if (body?.batch === "may") { batchName = "May 2026"; batchData = MAY_BATCH; }
    } catch { /* no body — default to April */ }

    const data = batchData.map(([fullName, email]) => {
      const parts = fullName.trim().split(/\s+/);
      return {
        firstName: parts[0],
        lastName: parts.length > 1 ? parts.slice(1).join(" ") : parts[0],
        email: email.trim(),
        status: "Active",
      };
    });

    // Deduplicate within batch by lowercase email
    const seen = new Set<string>();
    const deduped = data.filter((c) => {
      const key = c.email.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Find which already exist in DB
    const existingSet = new Set(
      (await prisma.contractor.findMany({
        where: { email: { in: deduped.map((c) => c.email) } },
        select: { email: true },
      })).map((c) => c.email.toLowerCase())
    );

    const toCreate = deduped.filter((c) => !existingSet.has(c.email.toLowerCase()));

    const result = await prisma.contractor.createMany({
      data: toCreate,
      skipDuplicates: true,
    });

    await prisma.activityLog.create({
      data: {
        userId: (session.user as { id?: string }).id,
        userName: session.user.name,
        userEmail: session.user.email,
        action: `Bulk Contractor Import — ${batchName} Batch`,
        entityType: "Contractor",
        details: JSON.stringify({
          batchTotal: batchData.length,
          created: result.count,
          alreadyExisted: deduped.length - toCreate.length,
          noEmail: NO_EMAIL_BATCH,
          importedAt: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      created: result.count,
      alreadyExisted: deduped.length - toCreate.length,
      batchTotal: batchData.length,
      noEmail: NO_EMAIL_BATCH,
      createdNames: toCreate.map((c) => `${c.firstName} ${c.lastName}`),
    });
  } catch (err) {
    console.error("Import error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

type ContractorRow = {
  name: string;
  phone: string | null;
  ni: string | null;
  email: string | null;
  job: string | null;
  site: string | null;
  company: string | null;
  rate: number | null;
  type: string | null;
};

// Normalize company names (fix typos/duplicates from spreadsheet)
const COMPANY_MAP: Record<string, string> = {
  Metlen: "Metlen",
  Metlan: "Metlen",
  " Metlen": "Metlen",
  "Metlen ": "Metlen",
  Sml: "SML",
  Think: "Think Safety",
  Enki: "Enki",
  Imech: "iMech",
  Vermont: "Vermont",
  Ince: "Ince",
  Shotton: "Shotton",
  "Kappa Delta": "Kappa Delta",
  Knutsford: "Knutsford",
  "W&B": "Ward & Burke",
  "W & B": "Ward & Burke",
  "Ward & Burke": "Ward & Burke",
};

function normalizeCompany(raw: string | null): string {
  if (!raw) return "Unknown";
  const trimmed = raw.trim();
  return COMPANY_MAP[trimmed] || trimmed;
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  const expectedKey = process.env.ADMIN_SECRET;
  if (!expectedKey || key !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Read the JSON data file
    const dataPath = join(process.cwd(), "contractor-data.json");
    const raw = readFileSync(dataPath, "utf-8");
    const contractors: ContractorRow[] = JSON.parse(raw);

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Create/upsert companies first
    const companyNames = [
      ...new Set(contractors.map((c) => normalizeCompany(c.company))),
    ];
    const companyIds: Record<string, string> = {};

    for (const name of companyNames) {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const existing = await prisma.company.findFirst({
        where: { name },
      });
      if (existing) {
        companyIds[name] = existing.id;
      } else {
        const company = await prisma.company.create({
          data: { name },
        });
        companyIds[name] = company.id;
      }
    }

    // Import contractors
    for (const c of contractors) {
      try {
        const nameParts = c.name.trim().split(/\s+/);
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(" ") || "Unknown";

        // Generate a unique email if none provided
        const email =
          c.email ||
          `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/\s+/g, "")}@prl-placeholder.co.uk`;

        // Check if already exists
        const existing = await prisma.contractor.findUnique({
          where: { email },
        });

        if (existing) {
          skipped++;
          continue;
        }

        // Determine IR35 based on payment type
        let ir35Status: string | null = null;
        if (c.type === "CIS") ir35Status = "Outside";
        else if (c.type === "PAYE" || c.type === "UMBRELLA")
          ir35Status = "Inside";
        else if (c.type === "LIMITED") ir35Status = "Outside";
        else if (c.type === "DEL") ir35Status = "TBD";

        const contractor = await prisma.contractor.create({
          data: {
            firstName,
            lastName,
            email,
            phone: c.phone,
            jobTitle: c.job,
            payRate: c.rate,
            niNumber: c.ni,
            status: "Active",
            ir35Status,
          },
        });

        // Create active assignment if we have company and job info
        const companyName = normalizeCompany(c.company);
        const companyId = companyIds[companyName];

        if (companyId && c.job) {
          await prisma.assignment.create({
            data: {
              contractorId: contractor.id,
              companyId,
              role: c.job,
              location: c.site,
              startDate: new Date(),
              status: "Active",
            },
          });
        }

        created++;
      } catch (err) {
        console.error(`Import error for ${c.name}:`, err);
        errors.push(`${c.name}: import failed`);
      }
    }

    return NextResponse.json({
      message: `Import complete`,
      created,
      skipped,
      totalInFile: contractors.length,
      companiesCreated: companyNames.length,
      errors: errors.length > 0 ? errors.slice(0, 20) : undefined,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "An internal error occurred" }, { status: 500 });
  }
}
