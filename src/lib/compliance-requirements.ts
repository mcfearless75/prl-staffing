export type RoleCategory = "Operative" | "Engineer" | "Manager" | "Ltd Company" | "All";

export interface ComplianceRequirement {
  type: string;
  mandatory: boolean;
  roleCategories: RoleCategory[];
  description: string;
}

export const COMPLIANCE_REQUIREMENTS: ComplianceRequirement[] = [
  { type: "Right to Work", mandatory: true, roleCategories: ["All"], description: "Passport, Share Code, or RTW document" },
  { type: "CSCS", mandatory: true, roleCategories: ["Operative", "Engineer"], description: "CSCS card for site operatives" },
  { type: "CCNSG", mandatory: true, roleCategories: ["Engineer"], description: "CCNSG safety passport" },
  { type: "NPORS", mandatory: false, roleCategories: ["Operative"], description: "NPORS operator certification" },
  { type: "DBS", mandatory: false, roleCategories: ["All"], description: "DBS criminal record check" },
  { type: "Insurance", mandatory: true, roleCategories: ["Ltd Company"], description: "Public liability insurance" },
  { type: "IR35 Assessment", mandatory: true, roleCategories: ["Ltd Company"], description: "IR35 status determination" },
];

export const ROLE_CATEGORIES: Exclude<RoleCategory, "All">[] = [
  "Operative",
  "Engineer",
  "Manager",
  "Ltd Company",
];

export function getCellStatus(
  req: ComplianceRequirement,
  role: Exclude<RoleCategory, "All">
): "mandatory" | "optional" | "na" {
  const applies =
    req.roleCategories.includes("All") || req.roleCategories.includes(role);
  if (!applies) return "na";
  return req.mandatory ? "mandatory" : "optional";
}

export function getRequiredTypesForRole(jobTitle: string): string[] {
  const lc = jobTitle.toLowerCase();
  let category: RoleCategory = "Operative";
  if (lc.includes("engineer") || lc.includes("supervisor")) category = "Engineer";
  if (lc.includes("manager") || lc.includes("director")) category = "Manager";
  if (lc.includes("ltd") || lc.includes("limited") || lc.includes("company")) category = "Ltd Company";

  return COMPLIANCE_REQUIREMENTS
    .filter(
      (r) =>
        r.mandatory &&
        (r.roleCategories.includes("All") || r.roleCategories.includes(category))
    )
    .map((r) => r.type);
}
