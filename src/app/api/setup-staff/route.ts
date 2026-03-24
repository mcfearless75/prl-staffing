import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

const STAFF_USERS = [
  { name: "Marianne Cusack", email: "marianne@prlsitesolutions.co.uk", role: "admin" },
  { name: "Jenni Connors", email: "jenni@prlsitesolutions.co.uk", role: "admin" },
  { name: "Helen Ostensen", email: "helen@prlsitesolutions.co.uk", role: "admin" },
  { name: "Accounts PRL", email: "accounts@prlsitesolutions.co.uk", role: "admin" },
  { name: "Keenan Thomas", email: "keenan@prlsitesolutions.co.uk", role: "admin" },
  { name: "Adella Thomas", email: "adella@prlsitesolutions.co.uk", role: "admin" },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  const expectedKey = process.env.ADMIN_SECRET || "prl-setup-2026"; // fallback for local dev only
  if (key !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: string[] = [];
  // Temporary password - they'll use forgot password to set their own
  const tempPasswordHash = await bcrypt.hash("prl-temp-2026", 10);

  for (const staff of STAFF_USERS) {
    const existing = await prisma.user.findUnique({
      where: { email: staff.email },
    });

    if (existing) {
      // Update role to admin if not already
      await prisma.user.update({
        where: { email: staff.email },
        data: { name: staff.name, role: staff.role },
      });
      results.push(`${staff.name} (${staff.email}) - already exists, role updated to admin`);
    } else {
      await prisma.user.create({
        data: {
          email: staff.email,
          name: staff.name,
          passwordHash: tempPasswordHash,
          role: staff.role,
        },
      });
      results.push(`${staff.name} (${staff.email}) - CREATED`);
    }
  }

  return NextResponse.json({
    message: "Staff setup complete",
    results,
    note: "All users should use the 'Forgot Password' link on the login page to set their own password.",
  });
}
