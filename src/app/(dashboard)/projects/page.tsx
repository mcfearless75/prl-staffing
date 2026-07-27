export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { Plus, Search } from "lucide-react";

const STATUSES = ["Active", "OnHold", "Completed"] as const;

function statusLabel(status: string): string {
  return status === "OnHold" ? "On Hold" : status;
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams?: Promise<{ search?: string; status?: string; companyId?: string }>;
}) {
  const params = await searchParams;
  const search = params?.search || "";
  const status = params?.status || "";
  const companyId = params?.companyId || "";

  const where: Prisma.ProjectWhereInput = {
    ...(status ? { status } : {}),
    ...(companyId ? { companyId } : {}),
    ...(search
      ? {
          OR: [
            { code: { contains: search, mode: "insensitive" } },
            { name: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [projects, companies] = await Promise.all([
    prisma.project.findMany({
      where,
      include: {
        company: { select: { id: true, name: true } },
        _count: { select: { assignments: true } },
      },
      orderBy: { code: "asc" },
    }),
    prisma.company.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        action={
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Project
          </Link>
        }
      />

      {/* Search + Filters */}
      <form method="GET" className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            name="search"
            placeholder="Search by code or name..."
            defaultValue={search}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <select
          name="status"
          defaultValue={status}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </select>
        <select
          name="companyId"
          defaultValue={companyId}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All companies</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
        >
          Filter
        </button>
        {(search || status || companyId) && (
          <Link href="/projects" className="text-sm text-blue-600 hover:underline">
            Clear
          </Link>
        )}
      </form>

      {/* Count */}
      <p className="text-sm text-gray-500">
        {projects.length} {projects.length === 1 ? "project" : "projects"}
        {search ? ` matching "${search}"` : ""}
      </p>

      {/* Projects Table */}
      {projects.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Assignments</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {projects.map((project) => {
                const label = statusLabel(project.status);
                return (
                  <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{project.code}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{project.name}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{project.company?.name || "—"}</td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <Badge variant={label}>{label}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{project._count.assignments}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <Link
                        href={`/projects/${project.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-gray-500">
            No projects found.{" "}
            {search || status || companyId ? (
              <Link href="/projects" className="text-blue-600 hover:underline">
                Clear filters
              </Link>
            ) : (
              <Link href="/projects/new" className="text-blue-600 hover:underline">
                Add your first project
              </Link>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
