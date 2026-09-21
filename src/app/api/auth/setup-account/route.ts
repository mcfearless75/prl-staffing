import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { emailMatches } from "@/lib/contractor-email";

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
      where: { email: emailMatches(normalised) },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!contractor) {
      return NextResponse.json(
        { error: "No contractor account found for this email. Please contact PRL Site Solutions." },
        { status: 404 }
      );
    }

    // SECURITY: this endpoint is unauthenticated (email + password only), so it
    // may only ACTIVATE an account that has no login yet. If a login already
    // exists, overwriting the password here would be an account-takeover vector
    // for anyone who knows the email — send them through the token-verified
    // "forgot password" flow instead.
    const existingLogin = await prisma.contractorLogin.findUnique({
      where: { contractorId: contractor.id },
    });

    if (existingLogin) {
      return NextResponse.json(
        {
          error:
            "This account is already set up. To change your password, use “Forgot your password?” on the login page.",
          alreadyActivated: true,
        },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

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
    await prisma.activityLog.create({
      data: {
        action: "Contractor Account Activated",
        entityType: "Contractor",
        entityId: contractor.id,
        details: `${contractor.firstName} ${contractor.lastName} activated their portal account`,
        userEmail: normalised,
        userName: `${contractor.firstName} ${contractor.lastName}`,
      },
    }).catch(() => {/* non-critical */});

    return NextResponse.json({ success: true, firstName: contractor.firstName });
  } catch (err) {
    console.error("setup-account error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
