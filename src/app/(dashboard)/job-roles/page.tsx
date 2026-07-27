export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { Plus, Search, X, ArrowUp, ArrowDown } from "lucide-react";

type JobRolesSearchParams = {
  q?: string;
  status?: string;
  sort?: string;
};

function buildQuery(current: JobRolesSearchParams, patch: Partial<JobRolesSearchParams>): string {
  const params = new URLSearchParams();
  const merged = { ...current, ...patch };
  for (const [key, value] of Object.entries(merged)) {
    if (value) params.set(key, value);
  }
  return params.toString();
}

const STATUS_OPTIONS = ["Active", "Archived"] as const;

export default async function JobRolesPage({
  searchParams,
}: {
  searchParams: Promise<JobRolesSearchParams>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() || "";
  const status = STATUS_OPTIONS.includes(sp.status as never) ? sp.status : undefined;
  const nameSort = sp.sort === "name-desc" ? "desc" : sp.sort === "name-asc" ? "asc" : undefined;

  const where: Prisma.JobRoleWhereInput = {
    ...(status === "Active" ? { active: true } : {}),
    ...(status === "Archived" ? { active: false } : {}),
    ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
  };

  const jobRoles = await prisma.jobRole.findMany({
    where,
    orderBy: nameSort ? [{ name: nameSort }] : [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const current: JobRolesSearchParams = {
    ...(q ? { q } : {}),
    ...(status ? { status } : {}),
    ...(sp.sort ? { sort: sp.sort } : {}),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Job Roles"
        description="Manage the catalogue of job roles contractors can be assigned to."
        action={
          <Link
            href="/job-roles/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Role
          </Link>
        }
      />

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex overflow-hidden rounded-lg border border-gray-200 bg-white">
          {STATUS_OPTIONS.map((opt) => {
            const isActive = status === opt;
            const query = buildQuery(current, { status: isActive ? "" : opt });
            return (
              <Link
                key={opt}
                href={`/job-roles${query ? `?${query}` : ""}`}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                {opt}
              </Link>
            );
          })}
        </div>

        <form action="/job-roles" method="get" className="ml-auto flex items-center gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          {sp.sort && <input type="hidden" name="sort" value={sp.sort} />}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search job roles by name…"
              className="w-72 rounded-lg border-2 border-gray-300 py-2.5 pl-10 pr-9 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {q && (
              <Link
                href={`/job-roles${buildQuery(current, { q: "" }) ? `?${buildQuery(current, { q: "" })}` : ""}`}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </Link>
            )}
          </div>
        </form>
      </div>

      {jobRoles.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    <Link
                      href={`/job-roles?${buildQuery(current, { sort: nameSort === "asc" ? "name-desc" : "name-asc" })}`}
                      className="inline-flex items-center gap-1 hover:text-gray-700"
                    >
                      Name
                      {nameSort === "asc" && <ArrowUp className="h-3 w-3" />}
                      {nameSort === "desc" && <ArrowDown className="h-3 w-3" />}
                    </Link>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {jobRoles.map((role) => (
                  <tr key={role.id} className="hover:bg-gray-50 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {role.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <Badge variant={role.active ? "Active" : "Inactive"}>
                        {role.active ? "Active" : "Archived"}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <Link
                        href={`/job-roles/${role.id}/edit`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-gray-500">
            {q || status ? (
              "No job roles match your filters."
            ) : (
              <>
                No job roles found.{" "}
                <Link href="/job-roles/new" className="text-blue-600 hover:underline">
                  Add your first role
                </Link>
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
