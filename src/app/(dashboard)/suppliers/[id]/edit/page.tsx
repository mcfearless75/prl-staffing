export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { updateSupplier } from "../../actions";

export default async function EditSupplierPage({
  params,
}: {
  params: { id: string };
}) {
  const supplier = await prisma.supplier.findUnique({
    where: { id: params.id },
  });

  if (!supplier) {
    notFound();
  }

  const updateAction = updateSupplier.bind(null, supplier.id);

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${supplier.name}`} />

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <form action={updateAction} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                Supplier Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                defaultValue={supplier.name}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="tier"
                className="block text-sm font-medium text-gray-700"
              >
                Tier
              </label>
              <select
                id="tier"
                name="tier"
                defaultValue={supplier.tier}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Tier 1">Tier 1</option>
                <option value="Tier 2">Tier 2</option>
                <option value="Tier 3">Tier 3</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="score"
                className="block text-sm font-medium text-gray-700"
              >
                Performance Score (0-100)
              </label>
              <input
                type="number"
                id="score"
                name="score"
                min="0"
                max="100"
                defaultValue={supplier.score}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="contactName"
                className="block text-sm font-medium text-gray-700"
              >
                Contact Name
              </label>
              <input
                type="text"
                id="contactName"
                name="contactName"
                defaultValue={supplier.contactName || ""}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="contactEmail"
                className="block text-sm font-medium text-gray-700"
              >
                Contact Email
              </label>
              <input
                type="email"
                id="contactEmail"
                name="contactEmail"
                defaultValue={supplier.contactEmail || ""}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="contactPhone"
                className="block text-sm font-medium text-gray-700"
              >
                Contact Phone
              </label>
              <input
                type="tel"
                id="contactPhone"
                name="contactPhone"
                defaultValue={supplier.contactPhone || ""}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
            <Link
              href={`/suppliers/${supplier.id}`}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              Update Supplier
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
