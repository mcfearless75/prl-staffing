import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { createRateCard } from "../actions";

export default function NewRateCardPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Add Rate Card" />

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <form action={createRateCard} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Role */}
            <div>
              <label
                htmlFor="role"
                className="block text-sm font-medium text-gray-700"
              >
                Role <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="role"
                name="role"
                required
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. Senior Developer"
              />
            </div>

            {/* Location */}
            <div>
              <label
                htmlFor="location"
                className="block text-sm font-medium text-gray-700"
              >
                Location
              </label>
              <input
                type="text"
                id="location"
                name="location"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. London, Remote"
              />
            </div>

            {/* Pay Rate */}
            <div>
              <label
                htmlFor="payRate"
                className="block text-sm font-medium text-gray-700"
              >
                Pay Rate (per hour) <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                  £
                </span>
                <input
                  type="number"
                  id="payRate"
                  name="payRate"
                  required
                  step="0.01"
                  min="0"
                  className="block w-full rounded-lg border border-gray-300 py-2 pl-7 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Charge Rate */}
            <div>
              <label
                htmlFor="chargeRate"
                className="block text-sm font-medium text-gray-700"
              >
                Charge Rate (per hour) <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                  £
                </span>
                <input
                  type="number"
                  id="chargeRate"
                  name="chargeRate"
                  required
                  step="0.01"
                  min="0"
                  className="block w-full rounded-lg border border-gray-300 py-2 pl-7 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Effective From */}
            <div>
              <label
                htmlFor="effectiveFrom"
                className="block text-sm font-medium text-gray-700"
              >
                Effective From <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="effectiveFrom"
                name="effectiveFrom"
                required
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Effective To */}
            <div>
              <label
                htmlFor="effectiveTo"
                className="block text-sm font-medium text-gray-700"
              >
                Effective To
              </label>
              <input
                type="date"
                id="effectiveTo"
                name="effectiveTo"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 border-t border-gray-200 pt-6">
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              Create Rate Card
            </button>
            <Link
              href="/rates"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
