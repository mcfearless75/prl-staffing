import { prisma } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
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
        debug: {
          emailFound: false,
          emailSent: false,
          note: `No contractorLogin or user found for: ${email}`,
        }
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
      // Return error details in development/debug
      return NextResponse.json({
        message: "If that email exists, a reset link has been sent.",
        debug: {
          emailFound: true,
          emailSent: false,
          error: result.error,
          from: process.env.EMAIL_FROM || "NOT SET - using default",
          resendKeySet: !!process.env.RESEND_API_KEY,
        }
      });
    }

    return NextResponse.json({
      message: "If that email exists, a reset link has been sent.",
      debug: {
        emailFound: true,
        emailSent: true,
        emailId: result.id,
      }
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
