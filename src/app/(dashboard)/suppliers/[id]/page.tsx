export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { deleteSupplier } from "../actions";

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      contractors: true,
    },
  });

  if (!supplier) {
    notFound();
  }

  const deleteAction = deleteSupplier.bind(null, supplier.id);

  const scoreColor =
    supplier.score >= 75
      ? "bg-emerald-500"
      : supplier.score >= 50
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <div className="space-y-6">
      <PageHeader
        title={supplier.name}
        action={
          <div className="flex items-center gap-3">
            <Link
              href={`/suppliers/${supplier.id}/edit`}
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

      {/* Supplier Info Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Supplier Details
        </h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-sm font-medium text-gray-500">Tier</dt>
            <dd className="mt-1">
              <Badge variant={supplier.tier}>{supplier.tier}</Badge>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">
              Performance Score
            </dt>
            <dd className="mt-1">
              <div className="flex items-center gap-3">
                <div className="h-2 w-24 rounded-full bg-gray-100">
                  <div
                    className={`h-2 rounded-full ${scoreColor}`}
                    style={{ width: `${supplier.score}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {supplier.score}/100
                </span>
              </div>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="mt-1">
              <Badge variant={supplier.isActive ? "Active" : "Inactive"}>
                {supplier.isActive ? "Active" : "Inactive"}
              </Badge>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Contact Name</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {supplier.contactName || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">
              Contact Email
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {supplier.contactEmail || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">
              Contact Phone
            </dt>
            <dd className="mt-1 text-sm text-gray-900">
              {supplier.contactPhone || "—"}
            </dd>
          </div>
        </dl>
      </div>

      {/* Contractors */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Contractors
        </h2>
        {supplier.contractors.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Job Title
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
                {supplier.contractors.map((contractor) => (
                  <tr
                    key={contractor.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {contractor.firstName} {contractor.lastName}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {contractor.email}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {contractor.jobTitle || "—"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <Badge variant={contractor.status}>
                        {contractor.status}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <Link
                        href={`/contractors/${contractor.id}`}
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
            No contractors associated with this supplier.
          </p>
        )}
      </div>
    </div>
  );
}
