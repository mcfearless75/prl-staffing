import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-staff";

/**
 * Create contractor login accounts and send welcome emails
 * GET /api/contractor-logins?limit=50&send=true — requires an admin session.
 *
 * - Creates login for active contractors who don't have one yet
 * - Sets a random temp password (they must set their own via email link)
 * - If send=true, sends welcome email with set-password link
 *
 * `send=true` mass-emails live contractors, so it is admin-gated on top of the
 * ADMIN_SECRET check. ADMIN_SECRET is not currently set in Railway, which means
 * the key check alone has been failing closed and this route is dormant — the
 * session guard is what stops it becoming wide open the day that var is added.
 */
export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: guard.reason === "forbidden" ? 403 : 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const sendEmails = searchParams.get("send") === "true";

  const expectedKey = process.env.ADMIN_SECRET;
  if (!expectedKey || key !== expectedKey) {
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

        // GDPR: Record consent for portal registration
        await prisma.consentRecord.create({
          data: {
            contractorId: c.id,
            email: c.email,
            consentType: "portal_registration",
            consentGiven: true,
            consentText:
              "Portal account created for contractor self-service access. Data processed as described in the Privacy Policy.",
            givenAt: new Date(),
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
    console.error("Contractor logins error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
