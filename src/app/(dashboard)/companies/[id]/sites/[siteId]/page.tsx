export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { createDepartment, deleteDepartment, endAssignment, assignToDepartment } from "../actions";
import { DeptAssignForm } from "./dept-assign-form";

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ id: string; siteId: string }>;
}) {
  const { id: companyId, siteId } = await params;

  const [site, allContractors] = await Promise.all([
  prisma.site.findUnique({
    where: { id: siteId },
    include: {
      company: { select: { id: true, name: true } },
      assignments: {
        where: { status: "Active", departmentId: null },
        include: { contractor: { select: { id: true, firstName: true, lastName: true, jobTitle: true } } },
      },
      departments: {
        orderBy: { name: "asc" },
        include: {
          assignments: {
            where: { status: "Active" },
            include: { contractor: { select: { id: true, firstName: true, lastName: true, jobTitle: true } } },
          },
        },
      },
    },
  }),
  prisma.contractor.findMany({
    select: { id: true, firstName: true, lastName: true },
    orderBy: { lastName: "asc" },
  }),
]);

  if (!site || site.companyId !== companyId) notFound();

  const createDeptAction = createDepartment.bind(null, siteId, companyId);

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/companies/${companyId}`} className="text-sm text-blue-600 hover:text-blue-800">
          ← {site.company.name}
        </Link>
      </div>
      <PageHeader title={site.name} />

      {/* Site Info */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Site Details</h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-sm font-medium text-gray-500">Address</dt>
            <dd className="mt-1 text-sm text-gray-900">{site.address || "—"}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">City</dt>
            <dd className="mt-1 text-sm text-gray-900">{site.city || "—"}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Postcode</dt>
            <dd className="mt-1 text-sm text-gray-900">{site.postcode || "—"}</dd>
          </div>
        </dl>
      </div>

      {/* Assign to site (no department required) */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Assign Contractor to Site</h2>
        <p className="text-xs text-gray-500 mb-4">No department needed — contractor will appear in the unassigned list below and can be moved to a department later.</p>
        <DeptAssignForm
          companyId={companyId}
          siteId={siteId}
          contractors={allContractors}
        />
      </div>

      {/* Add Department */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Department</h2>
        <form action={createDeptAction} className="flex items-end gap-3">
          <div className="flex-1">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Department Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="e.g. Mechanicals, Electricians, Cranes"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Add Department
          </button>
        </form>
      </div>

      {/* Contractors on site but not yet in a department */}
      {site.assignments.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-base font-semibold text-amber-800 mb-3">
            Not assigned to a department ({site.assignments.length})
          </h2>
          <div className="space-y-2">
            {site.assignments.map((a) => {
              const assignAction = assignToDepartment.bind(null, a.id, siteId, companyId);
              const removeAction = endAssignment.bind(null, a.id, companyId, siteId);
              return (
                <div key={a.id} className="flex items-center gap-3 flex-wrap py-1">
                  <Link
                    href={`/contractors/${a.contractor.id}`}
                    className="text-sm font-medium text-gray-900 hover:text-blue-600 w-40"
                  >
                    {a.contractor.firstName} {a.contractor.lastName}
                  </Link>
                  {site.departments.length > 0 ? (
                    <form action={assignAction} className="flex items-center gap-2">
                      <select
                        name="deptId"
                        required
                        className="rounded border border-gray-300 bg-white px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">Move to dept...</option>
                        {site.departments.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
                      >
                        Move
                      </button>
                    </form>
                  ) : (
                    <span className="text-xs text-amber-700">Add a department above to place this contractor</span>
                  )}
                  <form action={removeAction} className="inline">
                    <button
                      type="submit"
                      className="text-xs text-red-500 hover:text-red-700 font-medium"
                    >
                      Remove
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Departments */}
      {site.departments.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">No departments yet. Add one above.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {site.departments.map((dept) => {
            const deleteAction = deleteDepartment.bind(null, dept.id, siteId, companyId);
            return (
              <div key={dept.id} className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-gray-900">{dept.name}</h3>
                  <form action={deleteAction}>
                    <button
                      type="submit"
                      className="text-sm text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </form>
                </div>

                <DeptAssignForm
                  companyId={companyId}
                  siteId={siteId}
                  deptId={dept.id}
                  contractors={allContractors}
                />

                {dept.assignments.length === 0 ? (
                  <p className="text-sm text-gray-400">No contractors assigned to this department.</p>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Contractor</th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Role</th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                          <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {dept.assignments.map((a) => {
                          const endAction = endAssignment.bind(null, a.id, companyId, siteId);
                          return (
                          <tr key={a.id} className="hover:bg-gray-50">
                            <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                              {a.contractor.firstName} {a.contractor.lastName}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                              {a.role}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              <Badge variant={a.status}>{a.status}</Badge>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right flex items-center justify-end gap-3">
                              <Link
                                href={`/contractors/${a.contractor.id}`}
                                className="text-sm font-medium text-blue-600 hover:text-blue-800"
                              >
                                View
                              </Link>
                              <form action={endAction} className="inline">
                                <button
                                  type="submit"
                                  className="text-sm text-orange-500 hover:text-orange-700"
                                >
                                  End
                                </button>
                              </form>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
