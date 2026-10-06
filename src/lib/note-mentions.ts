/**
 * @mentions in subcontractor notes (Jen, 2026-10-06).
 *
 * A note that says "@adella can you chase his CSCS?" emails Adella. Staff are
 * the `User` table. A mention resolves by:
 *
 *   1. email local part  — "@adella" matches adella@prlsitesolutions.co.uk
 *   2. first name        — "@jen" matches "Jen Smith" (first word of User.name)
 *
 * An email local part is checked first because it is unique in practice; a
 * first name is not. If a first name matches more than one person the mention
 * resolves to NOBODY and is reported back as ambiguous, so the author can use
 * the email form instead — emailing the wrong colleague about a worker is
 * worse than emailing nobody.
 *
 * Pure: no database, no React. The notes action and the notes UI both use it.
 */

export interface MentionableUser {
  id: string;
  name: string;
  email: string;
}

export interface MentionResolution {
  /** One entry per distinct person, in order of first mention. */
  matched: MentionableUser[];
  /** Tokens (lower case, no "@") that matched more than one person. */
  ambiguous: string[];
  /** Tokens that matched nobody. */
  unknown: string[];
}

export type MentionSegment =
  | { kind: "text"; text: string }
  | { kind: "mention"; text: string; user: MentionableUser };

// "@" must not follow a character that could be part of an email address,
// so "joe@prlsitesolutions.co.uk" in a note is not a mention of "prlsitesolutions".
const MENTION_RE = /(^|[^A-Za-z0-9._%+\-@])@([A-Za-z][A-Za-z0-9._'-]*)/g;

/** Trailing punctuation that ends a sentence, not a handle: "@jen." / "@jen-" */
function trimHandle(raw: string): string {
  return raw.replace(/[._'-]+$/, "");
}

export function firstNameKey(name: string): string {
  return (name.trim().split(/\s+/)[0] ?? "").toLowerCase();
}

export function emailLocalPart(email: string): string {
  const at = email.indexOf("@");
  return (at === -1 ? email : email.slice(0, at)).trim().toLowerCase();
}

/** Every distinct "@handle" in the text, lower case, without the "@". */
export function extractMentionTokens(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(MENTION_RE)) {
    const token = trimHandle(m[2]).toLowerCase();
    if (token && !out.includes(token)) out.push(token);
  }
  return out;
}

type Lookup = { kind: "user"; user: MentionableUser } | { kind: "ambiguous" } | { kind: "unknown" };

function lookupToken(token: string, users: MentionableUser[]): Lookup {
  const byEmail = users.filter((u) => emailLocalPart(u.email) === token);
  if (byEmail.length === 1) return { kind: "user", user: byEmail[0] };
  if (byEmail.length > 1) return { kind: "ambiguous" };
  const byFirst = users.filter((u) => firstNameKey(u.name) === token);
  if (byFirst.length === 1) return { kind: "user", user: byFirst[0] };
  if (byFirst.length > 1) return { kind: "ambiguous" };
  return { kind: "unknown" };
}

export function resolveMentions(text: string, users: MentionableUser[]): MentionResolution {
  const result: MentionResolution = { matched: [], ambiguous: [], unknown: [] };
  for (const token of extractMentionTokens(text)) {
    const hit = lookupToken(token, users);
    if (hit.kind === "user") {
      if (!result.matched.some((u) => u.id === hit.user.id)) result.matched.push(hit.user);
    } else if (hit.kind === "ambiguous") {
      result.ambiguous.push(token);
    } else {
      result.unknown.push(token);
    }
  }
  return result;
}

/**
 * Splits note text into plain text and resolved mentions, for highlighting.
 * Mentions that do not resolve to exactly one person stay plain text, so the
 * highlight only ever shows people who were actually notified.
 */
export function segmentMentions(text: string, users: MentionableUser[]): MentionSegment[] {
  const segments: MentionSegment[] = [];
  let last = 0;
  const push = (t: string) => {
    if (!t) return;
    const prev = segments[segments.length - 1];
    if (prev?.kind === "text") prev.text += t;
    else segments.push({ kind: "text", text: t });
  };
  for (const m of text.matchAll(MENTION_RE)) {
    const handle = trimHandle(m[2]);
    const start = (m.index ?? 0) + m[1].length; // position of "@"
    const hit = lookupToken(handle.toLowerCase(), users);
    if (hit.kind !== "user") continue;
    push(text.slice(last, start));
    const end = start + 1 + handle.length;
    segments.push({ kind: "mention", text: text.slice(start, end), user: hit.user });
    last = end;
  }
  push(text.slice(last));
  return segments;
}

/**
 * The handle the autocomplete inserts for a person: their first name when that
 * is unique among staff, otherwise their email local part (always unique).
 */
export function mentionHandle(user: MentionableUser, users: MentionableUser[]): string {
  const first = firstNameKey(user.name);
  const clash = users.filter((u) => firstNameKey(u.name) === first).length > 1;
  return !first || clash || !/^[a-z][a-z0-9._'-]*$/.test(first) ? emailLocalPart(user.email) : first;
}

/** Staff whose first name or email local part starts with the typed query. */
export function suggestMentions(query: string, users: MentionableUser[], limit = 6): MentionableUser[] {
  const q = query.toLowerCase();
  return users
    .filter((u) => firstNameKey(u.name).startsWith(q) || emailLocalPart(u.email).startsWith(q))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, limit);
}

/**
 * The "@query" being typed immediately before the caret, or null. Used to open
 * the autocomplete list.
 */
export function activeMentionQuery(textBeforeCaret: string): string | null {
  const m = /(^|[^A-Za-z0-9._%+\-@])@([A-Za-z0-9._'-]*)$/.exec(textBeforeCaret);
  return m ? m[2] : null;
}

/** Human-readable note for the author about mentions that notified nobody. */
export function describeUnresolved(r: Pick<MentionResolution, "ambiguous" | "unknown">): string | null {
  const parts: string[] = [];
  if (r.ambiguous.length > 0) {
    parts.push(
      `${r.ambiguous.map((t) => "@" + t).join(", ")} matches more than one person, so nobody was emailed — use their email name instead (e.g. @jen.smith)`
    );
  }
  if (r.unknown.length > 0) {
    parts.push(`${r.unknown.map((t) => "@" + t).join(", ")} doesn't match anyone on PRISM`);
  }
  return parts.length ? parts.join(". ") + "." : null;
}
