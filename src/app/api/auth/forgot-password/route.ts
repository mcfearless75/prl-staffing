import { prisma } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { checkRateLimit } from "@/lib/rate-limit";
import { greetingName } from "@/lib/contractor-name";
import { emailMatches } from "@/lib/contractor-email";

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

    const { email: typed } = await request.json();

    if (!typed || typeof typed !== "string") {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    // Who is this? A contractor login, a staff user, or — the case the app
    // invite depends on — a contractor with NO login yet (imported from the
    // spreadsheet). The invite email tells those people to use "Forgot your
    // password?" to set their first password; this used to skip them, reply
    // "a link has been sent", and send nothing. /api/auth/reset-password
    // already creates the missing login when the link is used.
    //
    // `email` is the address the token is issued against, so it must be the
    // STORED form: reset-password looks the login up by exact match.
    let email: string | null = null;
    let name = "";

    const contractorLogin = await prisma.contractorLogin.findFirst({
      where: { email: emailMatches(typed) },
      include: { contractor: true },
    });
    if (contractorLogin) {
      email = contractorLogin.email;
      name = greetingName(contractorLogin.contractor);
    } else {
      const staffUser = await prisma.user.findFirst({
        where: { email: emailMatches(typed) },
      });
      if (staffUser) {
        email = staffUser.email;
        name = staffUser.name;
      } else {
        const contractor = await prisma.contractor.findFirst({
          where: { email: emailMatches(typed) },
          include: { contractorLogin: true },
        });
        if (contractor?.email) {
          // A login stored under another spelling of the address would make
          // reset-password try to create a second one — issue against it.
          email = contractor.contractorLogin?.email ?? contractor.email;
          name = greetingName(contractor);
        }
      }
    }

    if (!email) {
      return NextResponse.json({
        message: "If that email exists, a reset link has been sent.",
      });
    }

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

    // The account-enumeration guard above already returned the generic message for
    // unknown emails, so reaching here with a failed send means the account exists
    // and its previous tokens have just been deleted — telling the user "sent" would
    // leave them waiting on an email that will never arrive.
    if (!result.success) {
      console.error(`Failed to send reset email to ${email}:`, result.error);
      return NextResponse.json(
        {
          error:
            "The password reset service is temporarily unavailable. Please try again shortly, or contact admin@prlsitesolutions.co.uk for help.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "If that email exists, a reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
