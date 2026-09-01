/**
 * Parses bounce (DSN) notification emails that land in the infotech@ mailbox.
 *
 * Deliberately best-effort text scraping, not RFC 3464 structured parsing —
 * Graph's basic /messages endpoint returns the human-readable body, not the
 * message/delivery-status MIME part, and DSN wording differs by receiving
 * mail server (Gmail vs Outlook vs Yahoo phrase it differently). A message
 * that doesn't match any pattern is left alone (see bounce-check.ts) rather
 * than guessed at.
 */

export interface ParsedBounce {
  recipient: string;
  code: string; // SMTP enhanced status code, e.g. "5.1.1"
  severity: "hard" | "soft";
}

// Tried in order; first match wins. Each targets the "extract of your email"
// block that MTAs quote back, of the shape `<address>: host ... said: ...`.
const RECIPIENT_PATTERNS = [
  /<([^<>\s]+@[^<>\s]+)>\s*:\s*host\b/i,
  /(?:Final|Original)-Recipient:\s*rfc822;\s*([^\s<>]+@[^\s<>]+)/i,
  /\bto\s+<([^<>\s]+@[^<>\s]+)>/i,
];

// Enhanced SMTP status code, e.g. "550-5.1.1" or "421 4.2.2" -> "5.1.1" / "4.2.2".
const CODE_PATTERN = /\b[45]\d{2}[\s-](\d{1,2}\.\d{1,3}\.\d{1,3})\b/;

/** Cheap pre-filter over subject/sender before the body is even fetched. */
export function isDsnCandidate(subject: string, fromAddress: string): boolean {
  const subj = (subject || "").toLowerCase();
  const from = (fromAddress || "").toLowerCase();
  return (
    /undeliverable|delivery status notification|failure notice|returned mail|delivery has failed|mail delivery/i.test(
      subj
    ) || /mailer-daemon|postmaster|mail delivery (sub)?system/i.test(from)
  );
}

/**
 * Extracts the bounced recipient and SMTP status code from a DSN body.
 * Returns null if either can't be confidently found — callers should leave
 * such a message unread rather than act on a guess.
 */
export function parseDsnText(text: string): ParsedBounce | null {
  const body = text || "";

  let recipient: string | null = null;
  for (const pattern of RECIPIENT_PATTERNS) {
    const match = body.match(pattern);
    if (match) {
      recipient = match[1].toLowerCase();
      break;
    }
  }
  if (!recipient) return null;

  const codeMatch = body.match(CODE_PATTERN);
  if (!codeMatch) return null;

  const code = codeMatch[1];
  const severity: "hard" | "soft" = code.startsWith("5") ? "hard" : "soft";
  return { recipient, code, severity };
}
