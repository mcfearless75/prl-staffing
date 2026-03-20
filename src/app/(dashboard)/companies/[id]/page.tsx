export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { deleteCompany } from "../actions";
import { formatDate } from "@/lib/utils";

export default async function CompanyDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const company = await prisma.company.findUnique({
    where: { id: params.id },
    include: {
      contractors: {
        include: {
          contractor: true,
        },
      },
    },
  });

  if (!company) {
    notFound();
  }

  const deleteAction = deleteCompany.bind(null, company.id);

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

      {/* Assigned Contractors */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Assigned Contractors
        </h2>
        {company.contractors.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Contractor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Start Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {company.contractors.map((assignment) => (
                  <tr
                    key={assignment.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {assignment.contractor.firstName}{" "}
                      {assignment.contractor.lastName}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {assignment.role}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <Badge variant={assignment.status}>
                        {assignment.status}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {formatDate(assignment.startDate)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <Link
                        href={`/contractors/${assignment.contractor.id}`}
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
        ) : (
          <p className="text-sm text-gray-500">
            No contractors currently assigned to this company.
          </p>
        )}
      </div>
    </div>
  );
}
