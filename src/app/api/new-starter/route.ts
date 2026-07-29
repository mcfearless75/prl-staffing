import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { maskNI } from "@/lib/utils";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      firstName, lastName, email, phone, gender, dob,
      country, address, city, postcode, niNumber,
      employmentStartDate, employeeStatement, signature,
    } = body;

    if (!firstName || !lastName || !email || !phone || !gender || !dob || !employmentStartDate) {
      return NextResponse.json(
        { error: "Please fill in all required fields." },
        { status: 400 }
      );
    }

    if (!employeeStatement) {
      return NextResponse.json(
        { error: "Please select an Employee Statement (A, B, or C)." },
        { status: 400 }
      );
    }

    if (!signature) {
      return NextResponse.json(
        { error: "Please provide your signature." },
        { status: 400 }
      );
    }

    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // Create the submission record — this is the entry staff see in PRISM
    const submission = await prisma.newStarterSubmission.create({
      data: {
        firstName,
        lastName,
        email: typeof email === "string" ? email.toLowerCase().trim() : email,
        phone,
        gender: gender || null,
        dob: dob || null,
        country: country || null,
        address: address || null,
        city: city || null,
        postcode: postcode || null,
        niNumber: niNumber || null,
        employmentStartDate,
        employeeStatement,
        signature,
      },
    });

    // Save to ActivityLog
    await prisma.activityLog.create({
      data: {
        action: "NEW_STARTER_SUBMITTED",
        entityType: "NewStarter",
        entityId: submission.id,
        userName: `${firstName} ${lastName}`,
        userEmail: email,
        details: JSON.stringify({ ...body, niNumber: maskNI(body.niNumber) }),
        ipAddress,
      },
    });

    // Send branded HTML email
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.EMAIL_FROM || "PRL Site Solutions <noreply@prlsitesolutions.online>";

    if (apiKey) {
      const resend = new Resend(apiKey);

      const statementLabels: Record<string, string> = {
        A: "Statement A - First job since 6 April, no JSA/ESA/IB received",
        B: "Statement B - Had another job since 6 April, no P45, and/or received JSA/ESA/IB",
        C: "Statement C - Has another job and/or receives State, Works or Private Pension",
      };

      const emailHtml = `
        <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;">
          <div style="background:#005f8c;color:#fff;padding:20px 24px;border-radius:8px 8px 0 0;">
            <h1 style="margin:0;font-size:20px;">New Starter Checklist Submitted</h1>
            <p style="margin:4px 0 0;font-size:13px;opacity:0.9;">PRL Site Solutions -- Recruitment</p>
          </div>
          <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
            <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:12px 16px;margin-bottom:20px;">
              <p style="margin:0;font-size:13px;color:#92400e;">
                <strong>New starter checklist</strong> received on ${new Date().toLocaleDateString("en-GB")} at ${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>

            <h2 style="font-size:15px;color:#005f8c;border-bottom:2px solid #005f8c;padding-bottom:4px;margin:20px 0 12px;">Personal Details</h2>
            <table style="width:100%;font-size:13px;">
              <tr><td style="padding:4px 0;color:#666;width:180px;">Name:</td><td style="padding:4px 0;font-weight:600;">${escapeHtml(firstName)} ${escapeHtml(lastName)}</td></tr>
              <tr><td style="padding:4px 0;color:#666;">Email:</td><td style="padding:4px 0;"><a href="mailto:${escapeHtml(email)}" style="color:#005f8c;">${escapeHtml(email)}</a></td></tr>
              <tr><td style="padding:4px 0;color:#666;">Phone:</td><td style="padding:4px 0;"><a href="tel:${escapeHtml(phone)}" style="color:#005f8c;">${escapeHtml(phone)}</a></td></tr>
              <tr><td style="padding:4px 0;color:#666;">Gender:</td><td style="padding:4px 0;">${escapeHtml(gender)}</td></tr>
              <tr><td style="padding:4px 0;color:#666;">Date of Birth:</td><td style="padding:4px 0;">${dob ? new Date(dob).toLocaleDateString("en-GB") : ""}</td></tr>
              ${country ? `<tr><td style="padding:4px 0;color:#666;">Country/Region:</td><td style="padding:4px 0;">${escapeHtml(country)}</td></tr>` : ""}
              ${address ? `<tr><td style="padding:4px 0;color:#666;">Address:</td><td style="padding:4px 0;">${escapeHtml(address)}${city ? `, ${escapeHtml(city)}` : ""}${postcode ? ` ${escapeHtml(postcode)}` : ""}</td></tr>` : ""}
              ${niNumber ? `<tr><td style="padding:4px 0;color:#666;">NI Number:</td><td style="padding:4px 0;">${escapeHtml(niNumber)}</td></tr>` : ""}
            </table>

            <h2 style="font-size:15px;color:#005f8c;border-bottom:2px solid #005f8c;padding-bottom:4px;margin:20px 0 12px;">Employment</h2>
            <table style="width:100%;font-size:13px;">
              <tr><td style="padding:4px 0;color:#666;width:180px;">Start Date:</td><td style="padding:4px 0;font-weight:600;">${employmentStartDate ? new Date(employmentStartDate).toLocaleDateString("en-GB") : ""}</td></tr>
              <tr><td style="padding:4px 0;color:#666;">Employee Statement:</td><td style="padding:4px 0;font-weight:600;">${escapeHtml(statementLabels[employeeStatement] || employeeStatement)}</td></tr>
            </table>

            <h2 style="font-size:15px;color:#005f8c;border-bottom:2px solid #005f8c;padding-bottom:4px;margin:20px 0 12px;">Declaration</h2>
            <table style="width:100%;font-size:13px;">
              <tr><td style="padding:4px 0;color:#666;width:180px;">Signature:</td><td style="padding:4px 0;font-weight:600;">${escapeHtml(signature)}</td></tr>
              <tr><td style="padding:4px 0;color:#666;">Declaration Confirmed:</td><td style="padding:4px 0;">Yes</td></tr>
            </table>

            <div style="margin-top:24px;padding:16px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;text-align:center;">
              <p style="margin:0 0 8px;font-size:13px;color:#0369a1;">Review this submission in the PRL Site Solutions dashboard</p>
              <a href="${process.env.NEXTAUTH_URL || "https://prl-staffing-production.up.railway.app"}"
                style="display:inline-block;background:#005f8c;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;">
                Open Dashboard
              </a>
            </div>
          </div>
          <p style="text-align:center;font-size:11px;color:#999;margin-top:16px;">
            PRL Site Solutions | 0800 772 3959 | info@prlsitesolutions.co.uk
          </p>
        </div>
      `;

      try {
        await resend.emails.send({
          from: fromEmail,
          to: [
            "helen@prlsitesolutions.co.uk",
            "adella@prlsitesolutions.co.uk",
          ],
          subject: `New Starter Checklist: ${escapeHtml(firstName)} ${escapeHtml(lastName)}`,
          html: emailHtml,
        });
      } catch (emailErr) {
        console.error("Failed to send new starter notification email:", emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      id: submission.id,
      message: "Starter checklist submitted successfully",
    });
  } catch (error) {
    console.error("New starter submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit. Please try again." },
      { status: 500 }
    );
  }
}
