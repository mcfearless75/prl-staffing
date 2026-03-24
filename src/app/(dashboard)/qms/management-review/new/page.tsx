export const dynamic = "force-dynamic";
import { PageHeader } from "@/components/page-header";
import { createReview } from "../actions";

export default function NewManagementReviewPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Schedule Management Review" />

      <form action={createReview} className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              id="title"
              required
              placeholder="e.g. Q1 2026 Management Review"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="reviewDate" className="block text-sm font-medium text-gray-700">
              Review Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="reviewDate"
              id="reviewDate"
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Review number will be auto-generated based on the quarter (e.g. MR-2026-Q1)
            </p>
          </div>

          <div>
            <label htmlFor="chairperson" className="block text-sm font-medium text-gray-700">
              Chairperson <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="chairperson"
              id="chairperson"
              required
              placeholder="e.g. Adella Thomas"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="attendees" className="block text-sm font-medium text-gray-700">
              Attendees
            </label>
            <input
              type="text"
              name="attendees"
              id="attendees"
              placeholder="e.g. Adella Thomas, Helen Smith, John Doe"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">Comma-separated list of attendees</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <a
            href="/qms/management-review"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            Cancel
          </a>
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            Schedule Review
          </button>
        </div>
      </form>
    </div>
  );
}
