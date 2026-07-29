"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sendEmail, PAY_QUERY_RECIPIENTS } from "@/lib/email";
import { logActivity } from "@/lib/activity-log";
import type { CreatePayQueryInput } from "./types";

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Best-effort staff notification, mirroring src/app/api/payment-query/route.ts.
 * The pay query record is already committed before this runs — a failed send must
 * never block query submission; the staff Pay Queries hub is the source of truth
 * regardless of email delivery. Failures land in EmailLog via sendEmail().
 */
async function notifyStaffOfPayQuery(query: {
  id: string;
  ticketNumber: string;
  operativeName: string;
  email: string;
  weekEnding: string;
  queryType: string;
  explanation: string;
}): Promise<void> {
  const safeOperativeName = escapeHtml(query.operativeName);
  const safeWeekEnding = escapeHtml(query.weekEnding);
  const safeQueryType = escapeHtml(query.queryType);
  const safeExplanation = escapeHtml(query.explanation);
  const viewUrl = `${process.env.NEXTAUTH_URL || "https://www.prismworkforce.online"}/payment-queries/${query.id}`;

  const emailResult = await sendEmail({
    to: PAY_QUERY_RECIPIENTS,
    subject: `Payment Query ${query.ticketNumber}: ${safeOperativeName} — Week ending ${safeWeekEnding}`,
    template: "payment-query",
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#005f8c;color:#fff;padding:20px 24px;border-radius:8px 8px 0 0;">
          <h1 style="margin:0;font-size:18px;">Payment Query ${query.ticketNumber}</h1>
        </div>
        <div style="background:#fff;border:1px solid #e5e7eb;padding:24px;border-radius:0 0 8px 8px;">
          <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:12px;margin-bottom:16px;">
            <p style="margin:0;font-size:13px;color:#92400e;"><strong>${safeOperativeName}</strong> — ${safeQueryType}</p>
          </div>
          <p style="font-size:13px;color:#666;margin:0 0 12px;">Submitted via the contractor portal for week ending <strong>${safeWeekEnding}</strong>.</p>
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:12px;"><p style="margin:0;font-size:13px;">${safeExplanation}</p></div>
          <a href="${viewUrl}" style="display:inline-block;background:#005f8c;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:13px;margin-top:12px;">View in PRISM →</a>
        </div></div>`,
  });

  if (!emailResult.success) {
    console.error(
      `Portal pay-query staff notification failed for ${query.ticketNumber} (${query.email}):`,
      emailResult.error
    );
  }
}

/**
 * Resolves the logged-in contractor's own contractorId from the session.
 * Never trust a contractorId passed in from client input — the session is
 * the sole source of truth for "who am I".
 */
async function requireSessionContractorId(): Promise<string> {
  const session = await auth();
  const contractorId = (session?.user as { contractorId?: string })?.contractorId;
  if (!contractorId) redirect("/login");
  return contractorId;
}

/**
 * Next PQ ticket number (PQ-001, PQ-002, ...).
 *
 * Computes the max from ALL existing ticket numbers (parsed as integers),
 * not a lexicographic (string) sort — same max-parse pattern as
 * getNextInvoiceNumber in (dashboard)/billing/actions.ts.
 */
async function getNextPayQueryTicketNumber(): Promise<string> {
  const queries = await prisma.paymentQuery.findMany({ select: { ticketNumber: true } });
  const maxNum = queries.reduce((max, q) => {
    const n = parseInt(q.ticketNumber.replace("PQ-", ""), 10);
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
  return `PQ-${String(maxNum + 1).padStart(3, "0")}`;
}

/**
 * Creates a pay query on behalf of the session contractor.
 *
 * Identity fields (operative name, email, phone, role) are always read
 * server-side from the contractor's own record — never from the form —
 * so a contractor cannot submit a query impersonating someone else.
 */
export async function createPortalPayQuery(input: CreatePayQueryInput): Promise<void> {
  const contractorId = await requireSessionContractorId();

  if (!input.weekEnding || !input.explanation?.trim() || !input.signature?.trim()) {
    throw new Error("Week ending, explanation and signature are required.");
  }

  const contractor = await prisma.contractor.findUnique({
    where: { id: contractorId },
    select: { firstName: true, lastName: true, email: true, phone: true, jobTitle: true },
  });
  if (!contractor) redirect("/login");

  const ticketNumber = await getNextPayQueryTicketNumber();
  const filteredHours = (input.hours || []).filter((h) => h.date);

  const query = await prisma.paymentQuery.create({
    data: {
      ticketNumber,
      operativeName: `${contractor.firstName} ${contractor.lastName}`,
      email: contractor.email,
      phone: contractor.phone,
      role: contractor.jobTitle,
      weekEnding: input.weekEnding,
      queryType: input.queryType,
      totalHoursClaimed: input.totalHoursClaimed || null,
      totalOvertimeClaimed: input.totalOvertimeClaimed || null,
      totalHoursPaid: input.totalHoursPaid || null,
      hours: filteredHours.length > 0 ? JSON.stringify(filteredHours) : null,
      explanation: input.explanation,
      signature: input.signature,
      status: "Open",
    },
  });

  await logActivity(
    "PAYMENT_QUERY",
    "PaymentQuery",
    query.id,
    `Payment query ${ticketNumber} submitted via portal: ${input.queryType}`
  );

  await notifyStaffOfPayQuery({
    id: query.id,
    ticketNumber,
    operativeName: query.operativeName,
    email: query.email,
    weekEnding: query.weekEnding,
    queryType: query.queryType,
    explanation: query.explanation,
  });

  revalidatePath("/portal/pay-query");
  redirect(`/portal/pay-query?success=${ticketNumber}`);
}
