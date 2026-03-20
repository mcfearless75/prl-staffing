import { PageHeader } from "@/components/page-header";
import { createCompany } from "../actions";
import Link from "next/link";

export default function NewCompanyPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Add Company" />

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <form action={createCompany} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Enter company name"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="address"
                className="block text-sm font-medium text-gray-700"
              >
                Address
              </label>
              <input
                type="text"
                id="address"
                name="address"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Enter address"
              />
            </div>

            <div>
              <label
                htmlFor="city"
                className="block text-sm font-medium text-gray-700"
              >
                City
              </label>
              <input
                type="text"
                id="city"
                name="city"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Enter city"
              />
            </div>

            <div>
              <label
                htmlFor="postcode"
                className="block text-sm font-medium text-gray-700"
              >
                Postcode
              </label>
              <input
                type="text"
                id="postcode"
                name="postcode"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Enter postcode"
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
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Enter contact name"
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
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Enter contact email"
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
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Enter contact phone"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
            <Link
              href="/companies"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              Create Company
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
