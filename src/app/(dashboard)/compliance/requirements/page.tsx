export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { Plus, Trash2, Building2, Briefcase, AlertTriangle, Users } from "lucide-react";
import { deleteRequirement, toggleMandatory } from "./actions";
import { resolveRole } from "@/lib/role-normalisation";

const ACTIVE_STATUSES = ["Placed", "Active", "Ending"];

/** How many assigned subcontractors resolve to each canonical role today. */
async function getRoleUsage() {
  const assignments = await prisma.assignment.findMany({
    where: { status: { in: ACTIVE_STATUSES } },
    select: { role: true, contractorId: true, contractor: { select: { jobTitle: true } } },
  });

  const byContractor = new Map<string, string | null>();
  for (const a of assignments) {
    if (byContractor.get(a.contractorId)) continue;
    byContractor.set(a.contractorId, resolveRole(a.role, a.contractor.jobTitle).canonical);
  }

  const counts = new Map<string, number>();
  let unknown = 0;
  for (const role of byContractor.values()) {
    if (!role) unknown++;
    else counts.set(role, (counts.get(role) ?? 0) + 1);
  }
  return { counts, unknown, total: byContractor.size };
}

export default async function RequirementsPage() {
  const [requirements, usage] = await Promise.all([
    prisma.complianceRequirement.findMany({
      include: { company: true },
      orderBy: [{ role: "asc" }, { type: "asc" }],
    }),
    getRoleUsage(),
  ]);

  const grouped = requirements.reduce(
    (acc, req) => {
      (acc[req.role] ??= []).push(req);
      return acc;
    },
    {} as Record<string, typeof requirements>
  );

  const configuredRoles = new Set(requirements.filter((r) => r.role !== "All").map((r) => r.role));
  const hasGlobalRule = requirements.some((r) => r.role === "All");

  // Roles with people in them but no checklist configured.
  const uncovered = [...usage.counts.entries()]
    .filter(([role]) => !configuredRoles.has(role))
    .sort((a, b) => b[1] - a[1]);

  const coveredHeadcount = [...usage.counts.entries()]
    .filter(([role]) => configuredRoles.has(role))
    .reduce((n, [, c]) => n + c, 0);

  // An "All" rule reaches everyone, including people with no role on record.
  const reached = hasGlobalRule ? usage.total : coveredHeadcount;

  // Sort role groups by how many people they affect, so the rules that matter
  // most are at the top rather than whatever sorts first alphabetically.
  const roleOrder = Object.keys(grouped).sort((a, b) => {
    if (a === "All") return -1;
    if (b === "All") return 1;
    return (usage.counts.get(b) ?? 0) - (usage.counts.get(a) ?? 0);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance Requirements"
        description="The documents each role must hold. These drive the Compliance Gap Report."
        action={
          <div className="flex gap-2">
            <Link
              href="/compliance"
              className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
            >
              Back to Compliance
            </Link>
            <Link
              href="/compliance/requirements/new"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Requirements
            </Link>
          </div>
        }
      />

      {/* Coverage — the number that says whether any of this is actually working. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Workforce covered
          </p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {reached}
            <span className="text-base font-normal text-gray-400"> / {usage.total}</span>
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Assigned subcontractors matched by at least one rule
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Roles configured
          </p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{configuredRoles.size}</p>
          <p className="mt-1 text-xs text-gray-500">
            {uncovered.length} role{uncovered.length === 1 ? "" : "s"} in use with no checklist
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            No role recorded
          </p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{usage.unknown}</p>
          <p className="mt-1 text-xs text-gray-500">
            Reachable only by an “All roles” rule
          </p>
        </div>
      </div>

      {usage.unknown > 0 && (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-900">
            <p className="font-medium">
              {usage.unknown} of {usage.total} assigned subcontractors have no role on record.
            </p>
            <p className="mt-1 text-amber-800">
              Their assignment has no role and their profile has no job title, so no per-role rule
              can apply to them. Until roles are recorded, only an “All roles” rule reaches the
              whole workforce. This is the single biggest limit on per-role compliance right now.
            </p>
          </div>
        </div>
      )}

      {!hasGlobalRule && requirements.length > 0 && (
        <div className="flex gap-3 rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
          <div className="text-sm text-blue-900">
            <p className="font-medium">No baseline rule configured.</p>
            <p className="mt-1 text-blue-800">
              Nothing is required of everyone. A Right to Work rule against “All roles” is the
              usual baseline — without one, anybody whose role isn’t configured is checked against
              nothing at all.
            </p>
          </div>
        </div>
      )}

      {requirements.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
          <Briefcase className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="mb-1 text-sm font-medium text-gray-900">No requirements configured</p>
          <p className="mx-auto mb-4 max-w-md text-sm text-gray-500">
            Nothing is currently required of anyone, so the Gap Report has nothing to check
            against. Start with a baseline — Right to Work for “All roles” — then add the
            trade-specific cards each role needs.
          </p>
          <Link
            href="/compliance/requirements/new"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Create the first requirement
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {roleOrder.map((role) => {
            const reqs = grouped[role];
            const headcount = role === "All" ? usage.total : (usage.counts.get(role) ?? 0);
            return (
              <div
                key={role}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white"
              >
                <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-6 py-3">
                  <Briefcase className="h-5 w-5 text-gray-500" />
                  <h3 className="text-sm font-semibold text-gray-900">
                    {role === "All" ? "All roles" : role}
                  </h3>
                  <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {reqs.length} document{reqs.length === 1 ? "" : "s"}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      headcount === 0
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                    title="Assigned subcontractors this rule applies to"
                  >
                    <Users className="h-3 w-3" />
                    {headcount === 0 ? "applies to nobody" : `${headcount} assigned`}
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {reqs.map((req) => (
                    <div key={req.id} className="flex items-center justify-between px-6 py-3">
                      <div className="flex min-w-0 items-center gap-4">
                        <form action={toggleMandatory.bind(null, req.id)}>
                          <button
                            type="submit"
                            title="Switch between mandatory and optional"
                            className="cursor-pointer"
                          >
                            <Badge variant={req.isMandatory ? "Expired" : "Pending"}>
                              {req.isMandatory ? "Mandatory" : "Optional"}
                            </Badge>
                          </button>
                        </form>
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-gray-900">{req.type}</span>
                          {req.description && (
                            <span className="ml-2 text-sm text-gray-400">— {req.description}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-4">
                        {req.company ? (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                            <Building2 className="h-3 w-3" />
                            {req.company.name}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">All clients</span>
                        )}
                        <form action={deleteRequirement.bind(null, req.id)}>
                          <button
                            type="submit"
                            title="Remove this requirement"
                            className="rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Roles that have people but no checklist — the actual to-do list. */}
      {uncovered.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Roles with no checklist yet</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              These roles have subcontractors assigned but nothing configured, so the Gap Report
              cannot flag anything for them.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 p-4">
            {uncovered.map(([role, count]) => (
              <Link
                key={role}
                href={`/compliance/requirements/new?role=${encodeURIComponent(role)}`}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
              >
                {role}
                <span className="rounded-full bg-gray-100 px-1.5 text-xs text-gray-500">
                  {count}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
