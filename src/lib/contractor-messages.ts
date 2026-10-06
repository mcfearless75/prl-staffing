/**
 * In-app messaging between PRL staff and a worker (Jen, 2026-10-06: "like the
 * school app — I get a text & email to say you have a new message on the app,
 * go and look").
 *
 * The rules live here as pure functions so they can be tested without
 * Postgres; the database side is in contractor-messages-server.ts.
 *
 * Privacy rule: the message BODY never leaves PRISM. Emails and push
 * notifications only say there is a message and link to it — a worker's
 * personal email or a shared office inbox is not where the conversation lives.
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

/** Email to the worker. Deliberately does NOT contain the message. */
export function workerNotificationEmail(messagesUrl: string): { subject: string; html: string } {
  return {
    subject: "You have a new message from PRL Site Solutions",
    html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1f2937;line-height:1.6;">
  <p>You have a new message from <strong>PRL Site Solutions</strong>.</p>
  <p>Log in to the PRISM app to read it.</p>
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
