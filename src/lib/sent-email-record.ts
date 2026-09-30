// What a reminder email looks like before it goes (the preview) and the copy
// kept afterwards in ActivityLog.details, so staff can see exactly what a
// contractor was sent. Pure: no DB, no network — tested in
// tests/sent-email-record.test.ts.

/** One composed email. Preview and send both come from the same builder. */
export type ComposedEmail = { to: string; subject: string; html: string };

/** Result of a staff "preview this reminder" server action. */
export type EmailPreviewResult =
  | { ok: true; email: ComposedEmail; blockReason: string | null }
  | { ok: false; error: string };

/** The stored record: the email plus who sent it and an optional short note. */
export type SentEmailRecord = ComposedEmail & { by: string; note?: string };

/** Serialise a sent email for ActivityLog.details. */
export function buildSentEmailRecord(record: SentEmailRecord): string {
  const out: SentEmailRecord = { by: record.by, to: record.to, subject: record.subject, html: record.html };
  if (record.note) out.note = record.note;
  return JSON.stringify(out);
}

/**
 * Read a stored email back out of ActivityLog.details. Returns null for
 * anything that isn't one — older plain-text entries ("by x@y"), other JSON
 * shapes, or malformed text — so callers fall back to the old display.
 */
export function parseSentEmailRecord(details: string | null | undefined): SentEmailRecord | null {
  if (!details || details.trimStart()[0] !== "{") return null;
  let data: unknown;
  try {
    data = JSON.parse(details);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const d = data as Record<string, unknown>;
  if (typeof d.to !== "string" || typeof d.subject !== "string" || typeof d.html !== "string" || !d.html) return null;
  const record: SentEmailRecord = {
    by: typeof d.by === "string" ? d.by : "",
    to: d.to,
    subject: d.subject,
    html: d.html,
  };
  if (typeof d.note === "string" && d.note) record.note = d.note;
  return record;
}
