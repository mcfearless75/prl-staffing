// The worker's Right to Work route on the portal Documents page (App Invite
// Form, part B). Which documents each route needs, and whether it's complete.
//
// "UK or Irish passport": an Irish passport is valid proof on its own, same as
// a UK one, and the existing type is already "Passport — UK or Ireland".

export type RtwRoute = "uk-irish-passport" | "passport-share-code" | "birth-cert-ni";

export const RTW_ROUTES: Record<
  RtwRoute,
  { label: string; docs: { type: string; label: string; hint?: string }[]; needsShareCode: boolean }
> = {
  "uk-irish-passport": {
    label: "UK or Irish passport",
    docs: [{ type: "Passport — UK or Ireland", label: "Passport photo page" }],
    needsShareCode: false,
  },
  "passport-share-code": {
    label: "Non-UK passport + share code",
    docs: [{ type: "Passport — Other Nationality", label: "Passport photo page" }],
    needsShareCode: true,
  },
  "birth-cert-ni": {
    label: "UK birth certificate + NI number proof",
    docs: [
      { type: "Birth Certificate", label: "UK birth certificate" },
      {
        type: "National Insurance Proof",
        label: "Proof of NI number",
        hint: "A payslip, P45/P60 or HMRC letter showing your NI number",
      },
    ],
    needsShareCode: false,
  },
};

export function parseRtwRoute(v: unknown): RtwRoute | null {
  return typeof v === "string" && Object.hasOwn(RTW_ROUTES, v) ? (v as RtwRoute) : null;
}

/** Home Office share code: 9 letters/digits. Spaces and hyphens are ignored. */
export function normaliseShareCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.replace(/[\s-]/g, "").toUpperCase();
  return /^[A-Z0-9]{9}$/.test(code) ? code : null;
}

/** "W12 345 67X" — the grouping the Home Office service shows. */
export function formatShareCode(code: string): string {
  return `${code.slice(0, 3)} ${code.slice(3, 6)} ${code.slice(6)}`;
}

/** Worker's own view after entry: only the last 3 characters. */
export function maskShareCode(code: string): string {
  return `••• ••• ${code.slice(6)}`;
}

/**
 * Tick list for a route. `satisfiedTypes` are the compliance record types held
 * with status Verified, Pending or Expiring (uploaded and not rejected).
 * `hasShareCode`: a valid code is on file (callers check with normaliseShareCode).
 */
export function rtwProgress(
  route: RtwRoute | null,
  satisfiedTypes: ReadonlySet<string>,
  hasShareCode: boolean
): { items: { label: string; done: boolean }[]; complete: boolean } {
  if (!route) return { items: [], complete: false };
  const r = RTW_ROUTES[route];
  const items = r.docs.map((d) => ({ label: d.label, done: satisfiedTypes.has(d.type) }));
  if (r.needsShareCode) items.push({ label: "Share code", done: hasShareCode });
  return { items, complete: items.every((i) => i.done) };
}

/** Record statuses that count as "provided" for the tick list. */
export const RTW_SATISFIED_STATUSES = ["Verified", "Pending", "Expiring"] as const;
