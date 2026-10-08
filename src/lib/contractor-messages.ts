/**
 * In-app messaging between PRL staff and a worker (Jen, 2026-10-06: "like the
 * school app — I get a text & email to say you have a new message on the app,
 * go and look").
 *
 * The rules live here as pure functions so they can be tested without
 * Postgres; the database side is in contractor-messages-server.ts.
 *
 * Privacy rule: the conversation lives in PRISM. The worker's email carries
 * only a short preview of a PRL message (Erica, 2026-10-07: "can it give a
 * preview of the message in the email"), so they know what it's about, and
 * links to the app to read it in full and reply. The office alert for a
 * worker's reply still carries no message text; staff see it on the bell.
 */
import { isPlaceholderEmail } from "@/lib/placeholder-email";
import { escapeHtml } from "@/lib/utils";

export const MESSAGE_TO_WORKER = "to-worker";
export const MESSAGE_FROM_WORKER = "from-worker";
export type MessageDirection = typeof MESSAGE_TO_WORKER | typeof MESSAGE_FROM_WORKER;

export const MESSAGE_MAX_LENGTH = 2000;
/** One "X replied" email to the office per worker per this many minutes. */
export const REPLY_ALERT_QUIET_MINUTES = 15;
export const REPLY_ALERT_TO = "admin@prlsitesolutions.co.uk";
export const PRL_OFFICE_PHONE = "0800 772 3959";

export interface MessageLike {
  id: string;
  direction: string;
  readAt: Date | null;
  createdAt: Date;
}

export type BodyValidation = { ok: true; body: string } | { ok: false; error: string };

/** Trim, reject empty, cap length. Counted after trimming. */
export function validateMessageBody(raw: unknown): BodyValidation {
  const body = typeof raw === "string" ? raw.trim() : "";
  if (!body) return { ok: false, error: "Message cannot be empty." };
  if (body.length > MESSAGE_MAX_LENGTH) {
    return { ok: false, error: `Message is too long — keep it under ${MESSAGE_MAX_LENGTH} characters.` };
  }
  return { ok: true, body };
}

/** Oldest first, like any chat. Ties (same millisecond) fall back to id so the order is stable. */
export function sortThread<T extends MessageLike>(messages: readonly T[]): T[] {
  return [...messages].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );
}

/**
 * Messages the viewer has not read yet. Staff care about what the worker sent;
 * the worker cares about what PRL sent. Your own messages are never unread.
 */
export function countUnread(messages: readonly MessageLike[], viewer: "staff" | "worker"): number {
  const incoming = viewer === "staff" ? MESSAGE_FROM_WORKER : MESSAGE_TO_WORKER;
  return messages.filter((m) => m.direction === incoming && m.readAt === null).length;
}

/** True when no alert has gone out inside the quiet window, so this one may. */
export function shouldSendReplyAlert(
  lastAlertAt: Date | null,
  now: Date = new Date(),
  quietMinutes: number = REPLY_ALERT_QUIET_MINUTES
): boolean {
  if (!lastAlertAt) return true;
  return now.getTime() - lastAlertAt.getTime() >= quietMinutes * 60_000;
}

/** One line, cut on a word where possible. */
export function messageSnippet(body: string, max = 90): string {
  const flat = body.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export interface ConversationInput {
  contractorId: string;
  name: string;
  lastBody: string;
  lastDirection: string;
  lastAt: Date;
}
export interface ConversationSummary extends ConversationInput {
  unread: number;
  snippet: string;
}

/** Conversations with unread worker replies first, then most recent first. */
export function summariseConversations(
  latest: readonly ConversationInput[],
  unreadByContractor: ReadonlyMap<string, number>
): ConversationSummary[] {
  return latest
    .map((c) => ({ ...c, unread: unreadByContractor.get(c.contractorId) ?? 0, snippet: messageSnippet(c.lastBody) }))
    .sort((a, b) => {
      const aHas = a.unread > 0 ? 1 : 0;
      const bHas = b.unread > 0 ? 1 : 0;
      if (aHas !== bHas) return bHas - aHas;
      return b.lastAt.getTime() - a.lastAt.getTime();
    });
}

/**
 * Where to tell the worker about a new message: their app login email (what
 * they actually sign in with), else the contractor record's. Placeholder
 * import addresses are undeliverable, so they count as "no email".
 */
export function resolveWorkerEmail(
  loginEmail: string | null | undefined,
  contractorEmail: string | null | undefined
): string | null {
  for (const candidate of [loginEmail, contractorEmail]) {
    const e = candidate?.trim();
    if (e && !isPlaceholderEmail(e)) return e;
  }
  return null;
}

/** Today's Starters "Message in app" text. */
export function checkInMessageBody(firstName: string, site: string): string {
  const where = site.trim() || "your site";
  return `Hi ${firstName.trim()}, just checking you've started on site at ${where} today. Any problems call PRL on ${PRL_OFFICE_PHONE}.`;
}

const BUTTON =
  "display:inline-block;background:#1F4E79;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;";

/** Characters of a message shown in a preview (email, staff bell). */
export const MESSAGE_PREVIEW_LENGTH = 160;

/** First line-ish of a message, whitespace collapsed, cut at a word with "…". */
export function messagePreview(body: string, max: number = MESSAGE_PREVIEW_LENGTH): string {
  const flat = body.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** Email to the worker: a short preview only; the full message is in the app. */
export function workerNotificationEmail(messagesUrl: string, body?: string): { subject: string; html: string } {
  const preview = body ? messagePreview(body) : "";
  return {
    subject: "You have a new message from PRL Site Solutions",
    html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1f2937;line-height:1.6;">
  <p>You have a new message from <strong>PRL Site Solutions</strong>.</p>${
    preview
      ? `
  <blockquote style="margin:12px 0;padding:10px 14px;border-left:4px solid #1F4E79;background:#f3f4f6;color:#374151;">${escapeHtml(preview)}</blockquote>`
      : ""
  }
  <p>Log in to the PRISM app to read it${preview ? " in full and reply" : ""}.</p>
  <p><a href="${escapeHtml(messagesUrl)}" style="${BUTTON}">Read your message</a></p>
  <p style="color:#6b7280;font-size:12px;">Any problems call PRL on ${PRL_OFFICE_PHONE}.</p>
</div>`,
  };
}

/** Email to the office when a worker replies. Also no message body. */
export function replyAlertEmail(workerName: string, profileUrl: string): { subject: string; html: string } {
  return {
    subject: `${workerName} replied in PRISM`,
    html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1f2937;line-height:1.6;">
  <p><strong>${escapeHtml(workerName)}</strong> has replied to a message in the PRISM app.</p>
  <p><a href="${escapeHtml(profileUrl)}" style="${BUTTON}">Open their messages</a></p>
  <p style="color:#6b7280;font-size:12px;">If they send more in the next ${REPLY_ALERT_QUIET_MINUTES} minutes you won't get another email — everything is in their Messages tab.</p>
</div>`,
  };
}

/**
 * Starting points for a staff message (Erica, 2026-10-07: "messaging templates
 * similar to the emails, as well as a blank message"). {name} becomes the
 * worker's first name (or known-as); the text stays editable before sending.
 */
export const MESSAGE_TEMPLATES: { id: string; label: string; body: string }[] = [
  { id: "blank", label: "Blank message", body: "Hi {name},\n\n" },
  {
    id: "rtw",
    label: "Right to Work needed",
    body: "Hi {name}, we still need your Right to Work before we can place you. Please open Documents in the app and complete the Right to Work section. Thanks, PRL",
  },
  {
    id: "cards",
    label: "Cards / certificates needed",
    body: "Hi {name}, please upload a photo of each of your cards (front and back) in Documents, with the expiry date clearly visible. Thanks, PRL",
  },
  {
    id: "profile",
    label: "Finish your profile",
    body: "Hi {name}, your profile isn't finished yet. Please open Profile in the app, answer every question marked *, then press Submit and continue. Thanks, PRL",
  },
  {
    // Erica, 08-10-26.
    id: "emergency",
    label: "Emergency contact needed",
    body: "Hi {name}, we don't have an emergency contact for you yet. Please open Profile in the app and fill in the Emergency contact section (their name, phone number and how they're related to you), then press Submit and continue. Thanks, PRL",
  },
  {
    id: "call",
    label: "Please call us",
    body: `Hi {name}, could you give us a call on ${PRL_OFFICE_PHONE} when you get a minute? Thanks, PRL`,
  },
  {
    id: "timesheet",
    label: "Timesheet reminder",
    body: "Hi {name}, just a reminder that timesheets are due by 12pm on Tuesday. Thanks, PRL",
  },
];

/** A template's text with {name} filled in. Blank name → "there". */
export function fillMessageTemplate(body: string, firstName: string | null | undefined): string {
  const name = firstName?.trim() || "there";
  return body.replaceAll("{name}", name);
}
