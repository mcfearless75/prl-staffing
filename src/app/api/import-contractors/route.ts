import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

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
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  const expectedKey = process.env.ADMIN_SECRET || "prl-import-2026"; // fallback for local dev only
  if (key !== expectedKey) {
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
        errors.push(`${c.name}: ${String(err).slice(0, 100)}`);
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
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
