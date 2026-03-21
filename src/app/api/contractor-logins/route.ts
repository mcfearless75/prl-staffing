import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

/**
 * Create contractor login accounts
 * GET /api/contractor-logins?key=prl-seed-2026&limit=50
 * Creates login for active contractors who don't have one yet
 * Default password: contractor123
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  if (key !== "prl-seed-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find active contractors without a login
    const contractors = await prisma.contractor.findMany({
      where: {
        status: "Active",
        contractorLogin: null,
      },
      take: limit,
      orderBy: { lastName: "asc" },
    });

    const passwordHash = await bcrypt.hash("contractor123", 10);
    let created = 0;
    let skipped = 0;
    const results: string[] = [];

    for (const c of contractors) {
      try {
        // Check if email already used
        const existing = await prisma.contractorLogin.findUnique({
          where: { email: c.email },
        });
        if (existing) {
          skipped++;
          continue;
        }

        await prisma.contractorLogin.create({
          data: {
            contractorId: c.id,
            email: c.email,
            passwordHash,
          },
        });
        created++;
        results.push(`${c.firstName} ${c.lastName} (${c.email})`);
      } catch {
        skipped++;
      }
    }

    return NextResponse.json({
      message: "Contractor logins processed",
      created,
      skipped,
      defaultPassword: "contractor123",
      remainingWithoutLogin: await prisma.contractor.count({
        where: { status: "Active", contractorLogin: null },
      }),
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
