import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const { allowed } = checkRateLimit(`setup-account:${ip}`, 10, 15 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    if (password.length < 10) {
      return NextResponse.json({ error: "Password must be at least 10 characters" }, { status: 400 });
    }

    const normalised = (email as string).trim().toLowerCase();

    // Find the contractor by email
    const contractor = await prisma.contractor.findFirst({
      where: { email: normalised },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!contractor) {
      return NextResponse.json(
        { error: "No contractor account found for this email. Please contact PRL Site Solutions." },
        { status: 404 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Upsert the ContractorLogin — create if not exists, update if it does
    const existingLogin = await prisma.contractorLogin.findUnique({
      where: { contractorId: contractor.id },
    });

    if (existingLogin) {
      // Already has a login record — update the password
      await prisma.contractorLogin.update({
        where: { id: existingLogin.id },
        data: {
          passwordHash,
          tokenVersion: { increment: 1 },
          failedAttempts: 0,
          lockedUntil: null,
        },
      });
    } else {
      // First time setup — create login record
      await prisma.contractorLogin.create({
        data: {
          contractorId: contractor.id,
          email: normalised,
          passwordHash,
          tokenVersion: 0,
          failedAttempts: 0,
        },
      });
    }

    return NextResponse.json({ success: true, firstName: contractor.firstName });
  } catch (err) {
    console.error("setup-account error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
