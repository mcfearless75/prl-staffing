import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  const expectedKey = process.env.ADMIN_SECRET || "prl-seed-2026"; // fallback for local dev only
  if (key !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const passwordHash = await bcrypt.hash("prl2026!", 10);
    const results: string[] = [];

    // Three user accounts
    const users = [
      { email: "admin@prlsitesolutions.co.uk", name: "Admin", role: "admin" },
      { email: "adella@prlsitesolutions.co.uk", name: "Adella", role: "manager" },
      { email: "accounts@prlsitesolutions.co.uk", name: "Accounts", role: "manager" },
    ];

    for (const user of users) {
      const existing = await prisma.user.findUnique({
        where: { email: user.email },
      });

      if (existing) {
        results.push(`${user.email}: already exists`);
      } else {
        await prisma.user.create({
          data: {
            email: user.email,
            name: user.name,
            passwordHash,
            role: user.role,
          },
        });
        results.push(`${user.email}: created (${user.role})`);
      }
    }

    return NextResponse.json({
      message: "User accounts processed",
      results,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
