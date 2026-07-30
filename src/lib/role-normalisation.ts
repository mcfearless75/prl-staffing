// Canonical role vocabulary and role resolution.
//
// WHY THIS EXISTS
// ---------------
// Compliance requirements are matched against the role on a contractor's
// assignment. That match used to be an exact lowercased string compare, which
// silently failed for every spelling variant PRL actually types: a rule for
// "Joiner" missed "Joiner Nights", a rule for "Firewatch Operative" missed both
// "Firewatch Days" and "Fire Watch Nights". A requirement that looks configured
// but never applies is worse than no requirement at all.
//
// Resolution is done at READ TIME. Assignment.role is never rewritten — the
// original text stays as the record of what was typed, and this mapping can be
// corrected without a migration.
//
// TWO KINDS OF MAPPING, DELIBERATELY SEPARATED
// --------------------------------------------
//   MECHANICAL — whitespace, casing, obvious typos, spacing variants of the
//   same word, and shift suffixes. Applied silently because there is no
//   judgement involved: "Pipe Fitter" and "Pipefitter" are the same trade.
//
//   JUDGEMENT — genuinely ambiguous names where merging is a business decision
//   PRL has to make, not one to guess at ("Improver" — of which trade?).
//   These are mapped to a best guess but flagged `needsReview`, so the
//   requirements screen can surface them for confirmation instead of quietly
//   folding two distinct trades together.
//
// Day/night is treated as a SHIFT ATTRIBUTE, not a role. Compliance
// requirements do not differ by shift, so "Labourer Nights" resolves to
// "Labourer" and carries shift: "Nights" separately.

/** Shift extracted from a role string, where one was encoded in the name. */
export type Shift = "Days" | "Nights" | null;

export interface ResolvedRole {
  /** Canonical role name, or null when no role is known from any source. */
  canonical: string | null;
  /** Shift encoded in the original role text, if any. */
  shift: Shift;
  /** The raw text this was resolved from (assignment role or job title). */
  raw: string;
  /** Where the role came from — assignment role, contractor job title, or nothing. */
  source: "assignment" | "jobTitle" | "unknown";
  /**
   * True when the canonical mapping was a judgement call rather than a
   * mechanical one. Surfaced in the UI so staff can confirm or correct it.
   */
  needsReview: boolean;
}

/**
 * Canonical role names. Aligned with the JobRole table where an equivalent row
 * exists, so the two vocabularies converge rather than drift further apart.
 */
export const CANONICAL_ROLES: string[] = [
  "360 Machine Operator",
  "360 Machine Supervisor",
  "Approved Electrician",
  "Banksperson",
  "Bookkeeper",
  "Civils Foreman",
  "Cladder",
  "Cleaner",
  "Crane Operator",
  "Crane Supervisor",
  "Electrical Improver",
  "Electrical Supervisor",
  "Electrician",
  "Electrician (Tester)",
  "Facilities",
  "Firewatch Operative",
  "Forklift Driver",
  "Foreman",
  "Gantry Crane Operator",
  "Gantry Supervisor",
  "Gate Person",
  "Groundworker",
  "Groundworks Supervisor",
  "H&S Advisor",
  "Helper",
  "Hoist Driver",
  "Improver",
  "Joiner",
  "Labourer",
  "Lead Electrician",
  "Lift Operator",
  "Lifting Supervisor",
  "MEWP Operator",
  "Painter",
  "Pipefitter",
  "Piping Engineer",
  "Piping Supervisor",
  "Plater Fabricator",
  "QA/QC Inspector",
  "QAQL Electrician",
  "Quality Engineer",
  "Quality Manager",
  "Rigger",
  "Roller Operator",
  "Rope Access",
  "Scaffolding Supervisor",
  "Setting Out Engineer",
  "Site Manager",
  "Site Supervisor",
  "Skilled Labourer",
  "Slinger/Signaller",
  "Spider Crane Operator",
  "Telehandler Driver",
  "Topman",
  "Traffic Marshall",
  "Warehouse Operative",
  "Welder",
  "Welding Inspector",
];

/**
 * Variant -> canonical. Keys are matched after whitespace collapsing and
 * lowercasing, so only genuinely different wording needs an entry here.
 *
 * Mechanical mappings: typos, spacing, and interchangeable spellings.
 */
const MECHANICAL_ALIASES: Record<string, string> = {
  // Spacing / spelling variants of the same word
  "fire watch": "Firewatch Operative",
  firewatch: "Firewatch Operative",
  "firewatch operative": "Firewatch Operative",
  "pipe fitter": "Pipefitter",
  "traffic marshal": "Traffic Marshall",
  "industrial painter": "Painter",
  "gate man": "Gate Person",
  "gate person": "Gate Person",
  banksman: "Banksperson",
  storeman: "Warehouse Operative",
  "tele handler": "Telehandler Driver",
  telehandler: "Telehandler Driver",
  "telehandler operator": "Telehandler Driver",

  // Typos seen in live data
  platter: "Plater Fabricator",
  plater: "Plater Fabricator",
  forman: "Foreman",
  "forman civils": "Civils Foreman",

  // Same role, different phrasing
  "360 operator": "360 Machine Operator",
  "360 excavator operator": "360 Machine Operator",
  "gantry op": "Gantry Crane Operator",
  "hoist operator": "Hoist Driver",
  "lift supervisor": "Lifting Supervisor",
  "electrician tester": "Electrician (Tester)",
  "tester electrician": "Electrician (Tester)",
  hse: "H&S Advisor",
  "h&s advisor": "H&S Advisor",
  "qa/qc": "QA/QC Inspector",
  "qc controller": "QA/QC Inspector",
  slinger: "Slinger/Signaller",
  "scaffolding sup": "Scaffolding Supervisor",
  "groundworker supervisor": "Groundworks Supervisor",
  "pipe supervisor": "Piping Supervisor",
  "dump roller operator": "Roller Operator",
};

/**
 * Judgement mappings — a defensible best guess, but PRL should confirm.
 * These resolve so requirements still apply, and are flagged for review so a
 * wrong guess is visible rather than silent.
 */
const JUDGEMENT_ALIASES: Record<string, string> = {
  // "Improver" alone doesn't say which trade. The live population is
  // electrician-heavy, so electrical is the likely intent — but it is a guess.
  "electrician/improver": "Electrical Improver",
  improver: "Improver",
  // A bare "Supervisor" could be site, electrical, or piping.
  supervisor: "Site Supervisor",
  // Stores role attached to the electrical package.
  "electrical stores": "Warehouse Operative",
  // Rigger and slinger are related but not identical tickets.
  "rigger/slinger": "Rigger",
  // Distinct from a general labourer in pay terms; kept separate deliberately.
  "skilled labourer": "Skilled Labourer",
};

/** Shift suffixes stripped from a role name before canonical lookup. */
const SHIFT_PATTERNS: { pattern: RegExp; shift: Exclude<Shift, null> }[] = [
  { pattern: /\s*[\(\-–—/]?\s*\b(nights?|night\s*shift)\b\s*\)?\s*$/i, shift: "Nights" },
  { pattern: /\s*[\(\-–—/]?\s*\b(days?|day\s*shift)\b\s*\)?\s*$/i, shift: "Days" },
];

/** Collapses whitespace and trims. Handles the double-space values in live data. */
export function tidyRoleText(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

/**
 * Splits a shift suffix off a role name. "Labourer Nights" -> Labourer/Nights.
 * Roles where the shift word is the whole name are left alone, so a genuine
 * role called "Nights" would not collapse to an empty string.
 */
export function splitShift(raw: string): { role: string; shift: Shift } {
  const tidy = tidyRoleText(raw);

  // Checked BEFORE the single-shift patterns: "Firewatch Days/Nights" ends in
  // "Nights", so a naive pass strips only that and leaves "Firewatch Days"
  // behind as a bogus role name. Covering both shifts means no single shift.
  if (/\bdays?\s*\/\s*nights?\b/i.test(tidy)) {
    const stripped = tidyRoleText(tidy.replace(/\s*\bdays?\s*\/\s*nights?\b\s*/i, " "));
    if (stripped) return { role: stripped, shift: null };
  }

  for (const { pattern, shift } of SHIFT_PATTERNS) {
    const stripped = tidyRoleText(tidy.replace(pattern, ""));
    if (stripped && stripped.toLowerCase() !== tidy.toLowerCase()) {
      return { role: stripped, shift };
    }
  }
  return { role: tidy, shift: null };
}

const CANONICAL_BY_LOWER = new Map(CANONICAL_ROLES.map((r) => [r.toLowerCase(), r] as const));

/**
 * Maps one role string to a canonical role. Returns null when the text is
 * blank or unrecognised — an unrecognised role is reported as such rather than
 * being force-fitted to the nearest name.
 */
export function normaliseRole(
  raw: string | null | undefined
): { canonical: string | null; shift: Shift; needsReview: boolean } {
  if (!raw || !raw.trim()) return { canonical: null, shift: null, needsReview: false };

  const { role, shift } = splitShift(raw);
  const key = role.toLowerCase();

  const exact = CANONICAL_BY_LOWER.get(key);
  if (exact) return { canonical: exact, shift, needsReview: false };

  const mechanical = MECHANICAL_ALIASES[key];
  if (mechanical) return { canonical: mechanical, shift, needsReview: false };

  const judgement = JUDGEMENT_ALIASES[key];
  if (judgement) return { canonical: judgement, shift, needsReview: true };

  // Unrecognised — surface the tidied text so it shows up in the coverage
  // report as a role someone needs to add, rather than disappearing.
  return { canonical: role, shift, needsReview: true };
}

/**
 * Resolves the role to use for compliance matching, falling back from the
 * assignment role to the contractor's job title.
 *
 * 58% of assigned contractors had a blank assignment role when this was built,
 * and per-role requirements can never apply to those without a fallback.
 */
export function resolveRole(
  assignmentRole: string | null | undefined,
  jobTitle?: string | null
): ResolvedRole {
  const fromAssignment = normaliseRole(assignmentRole);
  if (fromAssignment.canonical) {
    return {
      canonical: fromAssignment.canonical,
      shift: fromAssignment.shift,
      raw: tidyRoleText(assignmentRole ?? ""),
      source: "assignment",
      needsReview: fromAssignment.needsReview,
    };
  }

  const fromTitle = normaliseRole(jobTitle);
  if (fromTitle.canonical) {
    return {
      canonical: fromTitle.canonical,
      shift: fromTitle.shift,
      raw: tidyRoleText(jobTitle ?? ""),
      source: "jobTitle",
      needsReview: fromTitle.needsReview,
    };
  }

  return { canonical: null, shift: null, raw: "", source: "unknown", needsReview: false };
}

/**
 * True when a stored requirement role applies to a resolved role.
 * "All" is the wildcard, matching everyone including contractors whose role is
 * unknown — which is what makes a baseline rule like "everyone needs Right to
 * Work" still meaningful for the un-roled part of the workforce.
 */
export function requirementAppliesToRole(
  requirementRole: string,
  resolved: ResolvedRole
): boolean {
  if (requirementRole === "All") return true;
  if (!resolved.canonical) return false;
  const req = normaliseRole(requirementRole);
  const target = req.canonical ?? tidyRoleText(requirementRole);
  return target.toLowerCase() === resolved.canonical.toLowerCase();
}
