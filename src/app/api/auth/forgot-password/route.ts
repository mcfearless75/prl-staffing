import { prisma } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    // Rate limit: 5 attempts per 15 minutes per IP
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const { allowed, retryAfterMs } = checkRateLimit(`forgot-pw:${ip}`, 5, 15 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later.", retryAfterMs },
        { status: 429 }
      );
    }

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    // Check if this email exists as a contractor login OR staff user
    const contractorLogin = await prisma.contractorLogin.findUnique({
      where: { email },
      include: { contractor: true },
    });

    const staffUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!contractorLogin && !staffUser) {
      return NextResponse.json({
        message: "If that email exists, a reset link has been sent.",
      });
    }

    const name = contractorLogin
      ? `${contractorLogin.contractor.firstName}`
      : staffUser!.name;

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Delete any existing tokens for this email
    await prisma.passwordResetToken.deleteMany({ where: { email } });

    // Create new token
    await prisma.passwordResetToken.create({
      data: { email, token, expiresAt },
    });

    // Build reset URL
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/set-password?token=${token}`;

    // Send email
    const result = await sendPasswordResetEmail(email, name, resetUrl, false);

    if (!result.success) {
      console.error("Failed to send reset email:", result.error);
    }

    return NextResponse.json({
      message: "If that email exists, a reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
