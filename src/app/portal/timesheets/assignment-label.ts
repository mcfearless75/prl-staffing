// Shared label formatting for every place a contractor picks a per-day
// assignment in the portal — keeps the "Company — Site / Department (role)"
// convention consistent between the create form, the /new full form, and the
// Draft edit day-by-day picker.

export type LabelableAssignment = {
  role: string;
  company: { name: string };
  site?: { name: string } | null;
  department?: { name: string } | null;
};

/**
 * "Company — Site / Department (role)" — gracefully omits the site/department
 * segment when either relation is null (older assignments created before
 * sites/departments existed, or a company-level placement with no site set).
 */
export function formatAssignmentLabel(a: LabelableAssignment): string {
  const siteDept = [a.site?.name, a.department?.name].filter(Boolean).join(" / ");
  return siteDept ? `${a.company.name} — ${siteDept} (${a.role})` : `${a.company.name} (${a.role})`;
}
