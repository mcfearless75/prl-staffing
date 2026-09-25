/**
 * "Request workers" enquiries from the public website (prlsitesolutions.co.uk).
 *
 * The website is static (GitHub Pages), so its form posts cross-origin to
 * /api/enquiry here. Pure functions only — the route does the I/O.
 */

export const ENQUIRY_ALLOWED_ORIGINS = [
  "https://prlsitesolutions.co.uk",
  "https://www.prlsitesolutions.co.uk",
];

export function isAllowedEnquiryOrigin(origin: string | null): boolean {
  return !!origin && ENQUIRY_ALLOWED_ORIGINS.includes(origin);
}

/** Humans take longer than this to fill five fields; form-filling bots don't. */
export const MIN_FILL_MS = 3000;

const LIMITS = {
  name: 100,
  company: 150,
  email: 200,
  phone: 40,
  workers: 20,
  location: 150,
  startDate: 60,
  message: 3000,
  page: 200,
} as const;

export interface ClientEnquiry {
  name: string;
  company: string;
  email: string;
  phone: string;
  workers: string | null;
  location: string | null;
  startDate: string | null;
  message: string;
  /** Website path the form was sent from, e.g. /energy-from-waste-recruitment/ */
  page: string | null;
}

export type EnquiryResult =
  | { ok: true; enquiry: ClientEnquiry }
  // `spam: true` means answer the bot with a fake success and send nothing.
  | { ok: false; spam: true }
  | { ok: false; spam: false; error: string };

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

function clean(value: unknown, max: number, multiline = false): string | null {
  if (typeof value !== "string") return null;
  // Control characters become spaces — including CR/LF on single-line fields, so
  // nothing can smuggle extra header-like lines into the email subject.
  const s = (multiline ? value.replace(/\r\n?/g, "\n") : value)
    .replace(multiline ? /[\u0000-\u0009\u000B-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g, " ")
    .trim();
  if (!s) return null;
  return s.slice(0, max);
}

export function validateClientEnquiry(body: unknown, now: number): EnquiryResult {
  if (!body || typeof body !== "object") {
    return { ok: false, spam: false, error: "Invalid request" };
  }
  const b = body as Record<string, unknown>;

  // Honeypot: a field hidden from people that bots fill in.
  if (typeof b.website === "string" && b.website.trim() !== "") return { ok: false, spam: true };
  const startedAt = Number(b.startedAt);
  if (Number.isFinite(startedAt) && now - startedAt < MIN_FILL_MS) return { ok: false, spam: true };

  const name = clean(b.name, LIMITS.name);
  const company = clean(b.company, LIMITS.company);
  const email = clean(b.email, LIMITS.email);
  const phone = clean(b.phone, LIMITS.phone);
  const message = clean(b.message, LIMITS.message, true);

  const missing = [
    !name && "your name",
    !company && "company",
    !email && "email",
    !phone && "phone number",
    !message && "what you need",
  ].filter(Boolean);
  if (missing.length) {
    return { ok: false, spam: false, error: `Please fill in ${missing.join(", ")}.` };
  }
  if (!EMAIL_RE.test(email!)) {
    return { ok: false, spam: false, error: "Please enter a valid email address." };
  }
  if ((phone!.match(/\d/g) || []).length < 7) {
    return { ok: false, spam: false, error: "Please enter a valid phone number." };
  }

  return {
    ok: true,
    enquiry: {
      name: name!,
      company: company!,
      email: email!,
      phone: phone!,
      message: message!,
      workers: clean(b.workers, LIMITS.workers),
      location: clean(b.location, LIMITS.location),
      startDate: clean(b.startDate, LIMITS.startDate),
      page: clean(b.page, LIMITS.page),
    },
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function enquiryEmailSubject(e: ClientEnquiry): string {
  return `Website enquiry: ${e.company} — ${e.name}`;
}

export function enquiryEmailHtml(e: ClientEnquiry): string {
  const rows: [string, string | null][] = [
    ["Name", e.name],
    ["Company", e.company],
    ["Email", e.email],
    ["Phone", e.phone],
    ["Workers needed", e.workers],
    ["Site location", e.location],
    ["Start date", e.startDate],
    ["Sent from page", e.page],
  ];
  const cell = "border:1px solid #e5e7eb;padding:8px 12px;font-size:14px;vertical-align:top";
  const tableRows = rows
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="${cell};font-weight:600;background:#f9fafb;white-space:nowrap">${k}</td><td style="${cell}">${escapeHtml(v!)}</td></tr>`)
    .join("");
  return `<div style="font-family:Arial,sans-serif;max-width:640px">
<h2 style="color:#005f8c;margin:0 0 8px">New enquiry from the website</h2>
<p style="margin:0 0 16px;color:#555;font-size:14px">Sent from the "Request workers" form on prlsitesolutions.co.uk. Reply to this email to answer ${escapeHtml(e.name)} directly.</p>
<table style="border-collapse:collapse;width:100%">${tableRows}</table>
<h3 style="margin:20px 0 8px;font-size:15px">What they need</h3>
<p style="white-space:pre-wrap;font-size:14px;line-height:1.5;margin:0">${escapeHtml(e.message)}</p>
</div>`;
}
