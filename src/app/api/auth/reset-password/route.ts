import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { emailMatches } from "@/lib/contractor-email";

export async function POST(request: Request) {
  try {
    // Rate limit: 10 attempts per 15 minutes per IP
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const { allowed, retryAfterMs } = checkRateLimit(`reset-pw:${ip}`, 10, 15 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later.", retryAfterMs },
        { status: 429 }
      );
    }

    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: "Token and password required" }, { status: 400 });
    }

    if (password.length < 10) {
      return NextResponse.json({ error: "Password must be at least 10 characters" }, { status: 400 });
    }

    // Find valid token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 400 });
    }

    if (resetToken.used) {
      return NextResponse.json({ error: "This link has already been used" }, { status: 400 });
    }

    if (resetToken.expiresAt < new Date()) {
      return NextResponse.json({ error: "This link has expired. Please request a new one." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Update contractor login OR staff user
    const contractorLogin = await prisma.contractorLogin.findUnique({
      where: { email: resetToken.email },
    });

    let setFor: { contractorId: string; first: boolean } | null = null;
    if (contractorLogin) {
      // Existing contractor login — update password
      await prisma.contractorLogin.update({
        where: { id: contractorLogin.id },
        data: {
          passwordHash,
          tokenVersion: { increment: 1 },
          failedAttempts: 0,
          lockedUntil: null,
        },
      });
      setFor = { contractorId: contractorLogin.contractorId, first: false };
    } else {
      const user = await prisma.user.findUnique({
        where: { email: resetToken.email },
      });
      if (user) {
        // Staff user — update password
        await prisma.user.update({
          where: { id: user.id },
          data: {
            passwordHash,
            tokenVersion: { increment: 1 },
            failedAttempts: 0,
            lockedUntil: null,
          },
        });
      } else {
        // No login record yet — contractor imported from spreadsheet.
        // Find contractor by email and CREATE their login record.
        const contractor = await prisma.contractor.findFirst({
          where: { email: emailMatches(resetToken.email) },
        });
        if (contractor) {
          await prisma.contractorLogin.create({
            data: {
              contractorId: contractor.id,
              email: resetToken.email,
              passwordHash,
              tokenVersion: 0,
              failedAttempts: 0,
            },
          });
          setFor = { contractorId: contractor.id, first: true };
        } else {
          return NextResponse.json({ error: "Account not found. Please contact PRL Site Solutions." }, { status: 400 });
        }
      }
    }

    // Mark token as used
    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true },
    });

    // No session here (the emailed link IS the authentication), so name the
    // actor from the token's address rather than via logActivity.
    if (setFor) {
      await prisma.activityLog
        .create({
          data: {
            userName: "Worker (emailed link)",
            userEmail: resetToken.email,
            action: setFor.first ? "Portal login set up by worker" : "Password reset by worker",
            entityType: "Contractor",
            entityId: setFor.contractorId,
          },
        })
        .catch(() => {});
    }

    return NextResponse.json({ message: "Password set successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
