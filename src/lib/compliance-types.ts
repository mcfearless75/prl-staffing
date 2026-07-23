// Canonical compliance document taxonomy for UK construction / civils agency work.
//
// Records store the SPECIFIC type (e.g. "CSCS (Blue) — Skilled Worker"). The
// compliance dashboard groups by CATEGORY so it stays readable instead of
// rendering a bar per certificate.
//
// The original generic types (CSCS, NPORS, Passport, Right to Work, DBS,
// Insurance, CV, P45, P60, IR35 Assessment, Qualification, Share Code, CCNSG,
// Other) are deliberately retained inside their groups — existing records use
// them and must keep validating and grouping correctly.

export type ComplianceCategory =
  | "Right to Work"
  | "CSCS"
  | "CCNSG"
  | "NPORS"
  | "CPCS"
  | "Plant & Lifting"
  | "Medical"
  | "Health & Safety"
  | "Rail"
  | "Utilities & Streetworks"
  | "Trade Qualifications"
  | "Driving"
  | "Identity & Payroll"
  | "DBS"
  | "Insurance & Legal"
  | "General";

export const COMPLIANCE_TYPE_GROUPS: { category: ComplianceCategory; types: string[] }[] = [
  {
    category: "Right to Work",
    types: [
      "Right to Work",
      "Passport",
      "Passport — UK or Ireland",
      "Passport — Other Nationality",
      "Share Code",
      "Biometric Residence Permit",
      "EU Settlement Scheme Status",
      "Visa / Work Permit",
      "Birth Certificate",
      "Right to Work Check Record",
    ],
  },
  {
    category: "CSCS",
    types: [
      "CSCS",
      "CSCS (Green) — Labourer",
      "CSCS (Blue) — Skilled Worker",
      "CSCS (Gold) — Advanced Craft / Supervisor",
      "CSCS (Black) — Manager",
      "CSCS (White) — AQP / PQP",
      "CSCS (Red) — Trainee / Experienced Worker",
      "CSCS (Yellow) — Visitor",
    ],
  },
  {
    category: "CCNSG",
    types: [
      "CCNSG",
      "CCNSG Safety Passport",
      "CCNSG Supervisor (SSTS)",
      "CCNSG Renewal",
    ],
  },
  {
    category: "NPORS",
    types: [
      "NPORS",
      "NPORS Operator",
      "NPORS Slinger / Signaller",
      "NPORS Excavator (360)",
      "NPORS Forward Tipping Dumper",
      "NPORS Telehandler",
      "NPORS MEWP",
      "NPORS Ride-On Roller",
      "NPORS Crane Supervisor",
      "NPORS Appointed Person",
      "NPORS Lorry Loader",
    ],
  },
  {
    category: "CPCS",
    types: [
      "CPCS",
      "CPCS Excavator (360)",
      "CPCS Telehandler",
      "CPCS Crawler Crane",
      "CPCS Mobile Crane",
      "CPCS Forward Tipping Dumper",
      "CPCS Slinger / Signaller",
      "CPCS Appointed Person",
    ],
  },
  {
    category: "Plant & Lifting",
    types: [
      "ALLMI — Lorry Loader",
      "IPAF (3a / 3b)",
      "PASMA",
      "Slinger / Signaller",
      "Appointed Person",
      "Crane Supervisor",
      "Abrasive Wheels",
      "Lift Plan / Lifting Operations",
    ],
  },
  {
    category: "Medical",
    types: [
      "Safety Critical Medical",
      "Drug & Alcohol Test",
      "Medical Questionnaire",
      "Audiometry",
      "Eyesight Test",
      "Fitness to Work Certificate",
    ],
  },
  {
    category: "Health & Safety",
    types: [
      "SMSTS",
      "SSSTS",
      "IOSH Managing Safely",
      "NEBOSH General Certificate",
      "First Aid at Work",
      "Emergency First Aid at Work",
      "Fire Marshal / Warden",
      "Manual Handling",
      "Asbestos Awareness",
      "Working at Height",
      "Confined Space",
      "Face Fit Test",
      "COSHH",
      "Site Induction",
    ],
  },
  {
    category: "Rail",
    types: [
      "PTS — Personal Track Safety",
      "Sentinel Card",
      "COSS",
      "Engineering Supervisor (ES)",
      "Track Induction",
    ],
  },
  {
    category: "Utilities & Streetworks",
    types: [
      "NRSWA Operative",
      "NRSWA Supervisor",
      "EUSR Water Hygiene",
      "EUSR SHEA Gas",
      "EUSR SHEA Water",
      "Gas Safe Registration",
    ],
  },
  {
    category: "Trade Qualifications",
    types: [
      "Qualification",
      "NVQ Level 2",
      "NVQ Level 3",
      "NVQ Level 6",
      "City & Guilds",
      "Apprenticeship Certificate",
      "Welding Coding",
      "18th Edition Wiring Regulations",
      "ECS Card",
      "JIB Card",
    ],
  },
  {
    category: "Driving",
    types: [
      "UK Driving Licence",
      "Driving Licence — Other Nationality",
      "Driver CPC",
      "Digital Tachograph Card",
      "HGV Class 1",
      "HGV Class 2",
      "ADR Licence",
      "Forklift Licence",
    ],
  },
  {
    category: "Identity & Payroll",
    types: [
      "P45",
      "P60",
      "National Insurance Proof",
      "Bank Details",
      "UTR Confirmation",
      "CIS Verification",
      "Proof of Address",
    ],
  },
  {
    category: "DBS",
    types: ["DBS", "Basic DBS", "Standard DBS", "Enhanced DBS"],
  },
  {
    category: "Insurance & Legal",
    types: [
      "Insurance",
      "Public Liability Insurance",
      "Employers Liability Insurance",
      "Professional Indemnity Insurance",
      "IR35 Assessment",
      "Contract of Employment",
    ],
  },
  {
    category: "General",
    types: ["CV", "Photo / Headshot", "Other"],
  },
];

export const COMPLIANCE_CATEGORIES: ComplianceCategory[] = COMPLIANCE_TYPE_GROUPS.map(
  (g) => g.category
);

export const COMPLIANCE_TYPES: string[] = COMPLIANCE_TYPE_GROUPS.flatMap((g) => g.types);

const CATEGORY_BY_TYPE = new Map<string, ComplianceCategory>(
  COMPLIANCE_TYPE_GROUPS.flatMap((g) => g.types.map((t) => [t, g.category] as const))
);

/**
 * Dashboard category for a stored record type. Unrecognised values (older or
 * free-text types) fall back to "General" so they still appear somewhere rather
 * than vanishing from the overview.
 */
export function categoryForType(type: string): ComplianceCategory {
  return CATEGORY_BY_TYPE.get(type) ?? "General";
}

export function isValidComplianceType(type: string): boolean {
  return CATEGORY_BY_TYPE.has(type);
}

/**
 * Card-style categories where a certificate is physically two-sided — the
 * upload form offers a Front and Back slot instead of a single file.
 */
const FRONT_BACK_CATEGORIES: ComplianceCategory[] = ["CSCS", "CPCS", "NPORS", "CCNSG"];

export interface DocFormProfile {
  /** RTW doc that carries a Home Office share code (Visa / Work Permit, Share Code) */
  requiresShareCode: boolean;
  /** Any Right to Work category type — gate upload behind a verification attestation */
  requiresAttestation: boolean;
  /** Card-style cert (CSCS/CPCS/NPORS/CCNSG) — offer Front + Back upload slots */
  frontBack: boolean;
}

/**
 * Drives the type-aware fields shown on the compliance upload form. Pure
 * lookup — no side effects — so it can be called from both the client form
 * and (if needed later) a server-side validator.
 */
export function docFormProfile(type: string): DocFormProfile {
  const category = categoryForType(type);
  const isRightToWork = category === "Right to Work";

  return {
    requiresShareCode: isRightToWork && (type.includes("Visa") || type.includes("Share Code")),
    requiresAttestation: isRightToWork,
    frontBack: FRONT_BACK_CATEGORIES.includes(category),
  };
}
