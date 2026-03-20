import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (key !== "prl-seed-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if admin already exists
    const existing = await prisma.user.findUnique({
      where: { email: "admin@prl.co.uk" },
    });

    if (existing) {
      return NextResponse.json({ message: "Database already seeded", userId: existing.id });
    }

    // Create admin user
    const passwordHash = await bcrypt.hash("admin123", 10);
    const admin = await prisma.user.create({
      data: {
        email: "admin@prl.co.uk",
        name: "Admin User",
        passwordHash,
        role: "admin",
      },
    });

    return NextResponse.json({ message: "Admin user created", userId: admin.id });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
