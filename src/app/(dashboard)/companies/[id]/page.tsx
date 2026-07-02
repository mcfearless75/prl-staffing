export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { deleteCompany } from "../actions";
import { createSite, deleteSite, endAssignmentById } from "./sites/actions";
import { AssignmentSitePicker } from "./assignment-site-picker";
import { formatDate } from "@/lib/utils";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      sites: {
        orderBy: { name: "asc" },
        include: {
          departments: { select: { id: true, name: true } },
          assignments: { where: { status: "Active" }, select: { id: true } },
        },
      },
      contractors: {
        where: { status: "Active" },
        include: {
          contractor: true,
          site: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
        },
        orderBy: { startDate: "desc" },
      },
    },
  });

  if (!company) {
    notFound();
  }

  const deleteAction = deleteCompany.bind(null, company.id);
  const createSiteAction = createSite.bind(null, company.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={company.name}
        action={
          <div className="flex items-center gap-3">
            <Link
              href={`/companies/${company.id}/edit`}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Edit
            </Link>
            <form action={deleteAction}>
              <button
                type="submit"
                className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                Delete
              </button>
            </form>
          </div>
        }
      />

      {/* Company Info Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Company Details
        </h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-sm font-medium text-gray-500">Address</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {company.address || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">City</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {company.city || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Postcode</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {company.postcode || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Contact Name</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {company.contactName || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">
              Contact Email
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {company.contactEmail || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">
              Contact Phone
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {company.contactPhone || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="mt-1">
              <Badge variant={company.isActive ? "Active" : "Inactive"}>
                {company.isActive ? "Active" : "Inactive"}
              </Badge>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Created</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {formatDate(company.createdAt)}
            </dd>
          </div>
        </dl>
      </div>

      {/* Sites */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Sites</h2>
        </div>

        {/* Add Site inline form */}
        <form action={createSiteAction} className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <input
            name="name"
            required
            placeholder="Site name (e.g. Protos)"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            name="address"
            placeholder="Address (optional)"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            name="city"
            placeholder="City (optional)"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Add Site
          </button>
        </form>

        {company.sites.length === 0 ? (
          <p className="text-sm text-gray-500">No sites added yet.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Site</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Departments</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Active Contractors</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {company.sites.map((site) => {
                  const deleteSiteAction = deleteSite.bind(null, site.id, company.id);
                  return (
                    <tr key={site.id} className="hover:bg-gray-50 transition-colors">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                        {site.name}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {[site.city, site.postcode].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                        {site.departments.length > 0
                          ? site.departments.map((d) => d.name).join(", ")
                          : "None"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {site.assignments.length}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right flex items-center justify-end gap-4">
                        <Link
                          href={`/companies/${company.id}/sites/${site.id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          Manage
                        </Link>
                        <Link
                          href={`/companies/${company.id}/sites/${site.id}/edit`}
                          className="text-sm font-medium text-gray-600 hover:text-gray-900"
                        >
                          Edit
                        </Link>
                        <form action={deleteSiteAction} className="inline">
                          <button type="submit" className="text-sm text-red-500 hover:text-red-700">
                            Delete
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

      {/* Assigned Contractors */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Assigned Contractors
        </h2>
        {company.contractors.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Contractor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Site / Dept</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Start</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {company.contractors.map((assignment) => {
                  const removeAction = endAssignmentById.bind(null, assignment.id, company.id);
                  return (
                    <tr key={assignment.id} className="hover:bg-gray-50 transition-colors">
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                        {assignment.contractor.firstName} {assignment.contractor.lastName}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                        {assignment.role || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {assignment.site ? (
                          <span>
                            {assignment.site.name}
                            {assignment.department && (
                              <span className="text-gray-400"> / {assignment.department.name}</span>
                            )}
                          </span>
                        ) : (
                          <AssignmentSitePicker
                            assignmentId={assignment.id}
                            companyId={company.id}
                            sites={company.sites.map((s) => ({
                              id: s.id,
                              name: s.name,
                              departments: s.departments,
                            }))}
                          />
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                        {formatDate(assignment.startDate)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            href={`/contractors/${assignment.contractor.id}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800"
                          >
                            View
                          </Link>
                          <form action={removeAction} className="inline">
                            <button
                              type="submit"
                              className="text-xs text-red-500 hover:text-red-700"
                            >
                              Remove
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            No contractors currently assigned to this company.
          </p>
        )}
      </div>
    </div>
  );
}
