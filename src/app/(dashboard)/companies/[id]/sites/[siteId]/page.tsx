export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { createDepartment, deleteDepartment } from "../actions";

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ id: string; siteId: string }>;
}) {
  const { id: companyId, siteId } = await params;

  const site = await prisma.site.findUnique({
    where: { id: siteId },
    include: {
      company: { select: { id: true, name: true } },
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
  });

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
                        {dept.assignments.map((a) => (
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
                            <td className="whitespace-nowrap px-4 py-3 text-right">
                              <Link
                                href={`/contractors/${a.contractor.id}`}
                                className="text-sm font-medium text-blue-600 hover:text-blue-800"
                              >
                                View
                              </Link>
                            </td>
                          </tr>
                        ))}
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
