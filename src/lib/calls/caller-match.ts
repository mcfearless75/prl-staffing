/**
 * Who, in the contractor book, is the person who rang?
 *
 * The call agent captures a phone number and whatever name the caller gave, so
 * the office was searching Subcontractors by hand for every missed call. This
 * does that lookup for them.
 *
 * Deliberately not a percentage. A phone number either matches or it does not
 * once it is normalised (+44 7700…, 07700… and 447700… are one number), and a
 * "73% match" would invent precision the data does not have. Two honest levels
 * instead:
 *
 *   phone — same number on file. Strong, but not proof: households and
 *           gangmasters share phones, so every matching contractor is returned.
 *   name  — no number match, but the spoken name matches a contractor's first
 *           and last name. Weak (there are several John Smiths), so it is only
 *           offered when the phone found nobody, and labelled as needing a check.
 *
 * Reuses the duplicate-check normalisers so placeholders ("0000000000", "N/A")
 * can never match anyone.
 */

import { normaliseName, normalisePhone } from "@/lib/duplicate-check";

export interface CallerMatchContractor {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  status: string;
}

export interface CallerMatch {
  basis: "phone" | "name";
  contractors: CallerMatchContractor[];
}

/** First and last word of a spoken name — "Paul James McWilliam" → Paul McWilliam. */
function splitSpokenName(name: string | null | undefined): [string, string] | null {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return words.length >= 2 ? [words[0], words[words.length - 1]] : null;
}

/** Index the book once per page render; matching each call is then a lookup. */
export function buildCallerIndex(contractors: CallerMatchContractor[]) {
  const byPhone = new Map<string, CallerMatchContractor[]>();
  const byName = new Map<string, CallerMatchContractor[]>();
  const add = (map: Map<string, CallerMatchContractor[]>, key: string | null, c: CallerMatchContractor) => {
    if (!key) return;
    const list = map.get(key);
    if (list) list.push(c);
    else map.set(key, [c]);
  };
  for (const c of contractors) {
    add(byPhone, normalisePhone(c.phone), c);
    add(byName, normaliseName(c.firstName, c.lastName), c);
  }
  return { byPhone, byName };
}

export type CallerIndex = ReturnType<typeof buildCallerIndex>;

export function matchCaller(
  index: CallerIndex,
  callerPhone: string | null | undefined,
  callerName: string | null | undefined,
): CallerMatch | null {
  const phone = normalisePhone(callerPhone);
  const byPhone = phone ? index.byPhone.get(phone) : undefined;
  if (byPhone?.length) return { basis: "phone", contractors: byPhone };

  const parts = splitSpokenName(callerName);
  const name = parts ? normaliseName(parts[0], parts[1]) : null;
  const byName = name ? index.byName.get(name) : undefined;
  if (byName?.length) return { basis: "name", contractors: byName };

  return null;
}
