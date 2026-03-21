import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";
import { NextResponse } from "next/server";

/**
 * Create contractor login accounts and send welcome emails
 * GET /api/contractor-logins?key=prl-seed-2026&limit=50&send=true
 *
 * - Creates login for active contractors who don't have one yet
 * - Sets a random temp password (they must set their own via email link)
 * - If send=true, sends welcome email with set-password link
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const sendEmails = searchParams.get("send") === "true";

  if (key !== "prl-seed-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contractors = await prisma.contractor.findMany({
      where: {
        status: "Active",
        contractorLogin: null,
      },
      take: limit,
      orderBy: { lastName: "asc" },
    });

    // Random temp password (they'll set their own)
    const tempPassword = crypto.randomBytes(16).toString("hex");
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    let created = 0;
    let skipped = 0;
    let emailsSent = 0;
    const results: string[] = [];
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    for (const c of contractors) {
      try {
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

        // Send welcome email with password setup link
        if (sendEmails) {
          const token = crypto.randomBytes(32).toString("hex");
          await prisma.passwordResetToken.create({
            data: {
              email: c.email,
              token,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            },
          });

          const resetUrl = `${baseUrl}/set-password?token=${token}`;
          const result = await sendPasswordResetEmail(
            c.email,
            c.firstName,
            resetUrl,
            true // isNewAccount
          );

          if (result.success) {
            emailsSent++;
            results.push(`${c.firstName} ${c.lastName} (${c.email}) - email sent`);
          } else {
            results.push(`${c.firstName} ${c.lastName} (${c.email}) - created, email FAILED`);
          }
        } else {
          results.push(`${c.firstName} ${c.lastName} (${c.email}) - created (no email)`);
        }
      } catch {
        skipped++;
      }
    }

    return NextResponse.json({
      message: "Contractor logins processed",
      created,
      skipped,
      emailsSent,
      sendEmails,
      note: sendEmails
        ? "Welcome emails sent with password setup links (24h expiry)"
        : "Accounts created but NO emails sent. Add &send=true to send welcome emails.",
      remainingWithoutLogin: await prisma.contractor.count({
        where: { status: "Active", contractorLogin: null },
      }),
      results: results.slice(0, 20),
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
