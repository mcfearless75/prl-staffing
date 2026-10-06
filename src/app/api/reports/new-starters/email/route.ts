import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import { sendEmail } from "@/lib/email";
import { escapeHtml } from "@/lib/utils";
import {
  auditDetails,
  describeFilters,
  parseNewStarterFilters,
  parseRecipients,
  reportFileStem,
} from "@/lib/reports/new-starter-report";
import { companyNamesFor, getNewStarterReport } from "@/lib/reports/new-starter-query";
import { buildNewStarterPdf } from "@/lib/reports/new-starter-pdf";
import { requireNewStarterReportAccess } from "../../_lib/new-starter-access";

export const dynamic = "force-dynamic";

const MAX_MESSAGE = 2000;

/**
 * POST /api/reports/new-starters/email
 * Body: { query: "<the report's filter query string>", to: "a@x, b@y", message?: string }
 *
 * Regenerates the PDF server-side from the filters (never trusts a client
 * file), emails it as an attachment and CCs the sender.
 */
export async function POST(request: Request) {
  const guard = await requireNewStarterReportAccess();
  if (!guard.ok) return guard.response;

  let body: { query?: unknown; to?: unknown; message?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = parseNewStarterFilters(new URLSearchParams(typeof body.query === "string" ? body.query : ""));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const filters = parsed.filters;

  const recipients = parseRecipients(typeof body.to === "string" ? body.to : "");
  if (!recipients.ok) return NextResponse.json({ error: recipients.error }, { status: 400 });

  const message = typeof body.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE) : "";
  const sender = guard.session.user;

  const rows = await getNewStarterReport(filters);
  const summary = describeFilters(filters, await companyNamesFor(filters.companyIds));
  const pdf = await buildNewStarterPdf(rows, {
    filterSummary: summary,
    generatedAt: new Date(),
    generatedBy: sender.name,
  });

  const messageHtml = message
    ? `<p style="color:#333;line-height:1.6;margin:0 0 16px;">${escapeHtml(message).replace(/\r?\n/g, "<br>")}</p>`
    : "";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #1F4E79; margin: 0 0 16px; font-size: 20px;">PRL Site Solutions</h1>
      ${messageHtml}
      <p style="color:#555;line-height:1.6;margin:0 0 8px;">
        Please find attached the New Starter Report: ${rows.length} starter${rows.length === 1 ? "" : "s"}.
      </p>
      <p style="color:#777;font-size:12px;line-height:1.5;margin:0 0 16px;">${escapeHtml(summary)}</p>
      <p style="color:#999;font-size:11px;margin:0;">
        Sent by ${escapeHtml(sender.name || sender.email || "PRL Site Solutions")}.
        The attachment contains National Insurance numbers: please handle it as confidential.
      </p>
    </div>`;

  const result = await sendEmail({
    to: recipients.recipients,
    cc: sender.email ? [sender.email] : undefined,
    replyTo: sender.email || undefined,
    subject: `New Starter Report: ${filters.from.split("-").reverse().join("/")} to ${filters.to.split("-").reverse().join("/")}`,
    html,
    template: "new-starter-report",
    attachments: [
      { filename: `${reportFileStem(filters)}.pdf`, content: Buffer.from(pdf), contentType: "application/pdf" },
    ],
  });

  await logActivity(
    result.success ? "Emailed New Starter Report" : "New Starter Report email failed",
    "Report",
    undefined,
    auditDetails(filters, rows.length, { to: recipients.recipients, cc: sender.email ?? null })
  );

  if (!result.success) {
    return NextResponse.json({ error: result.error || "The email could not be sent." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, rows: rows.length, to: recipients.recipients, cc: sender.email ?? null });
}
