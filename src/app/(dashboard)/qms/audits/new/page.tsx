export const dynamic = "force-dynamic";
import { PageHeader } from "@/components/page-header";
import { createAudit } from "../actions";

export default function NewAuditPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Schedule Internal Audit" />

      <form action={createAudit} className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Audit Details</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. Q1 Process Audit - Document Control"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="scope" className="block text-sm font-medium text-gray-700 mb-1">
                Scope
              </label>
              <textarea
                id="scope"
                name="scope"
                rows={3}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Describe the processes and areas to be audited..."
              />
            </div>

            <div>
              <label htmlFor="auditDate" className="block text-sm font-medium text-gray-700 mb-1">
                Audit Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="auditDate"
                name="auditDate"
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="leadAuditor" className="block text-sm font-medium text-gray-700 mb-1">
                Lead Auditor <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="leadAuditor"
                name="leadAuditor"
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. John Smith"
              />
            </div>

            <div>
              <label htmlFor="auditTeam" className="block text-sm font-medium text-gray-700 mb-1">
                Audit Team
              </label>
              <input
                type="text"
                id="auditTeam"
                name="auditTeam"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Comma-separated names"
              />
            </div>

            <div>
              <label htmlFor="isoClause" className="block text-sm font-medium text-gray-700 mb-1">
                ISO Clause References
              </label>
              <input
                type="text"
                id="isoClause"
                name="isoClause"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. 7.5, 8.1, 9.2"
              />
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue="Planned"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Planned">Planned</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            Create Audit
          </button>
          <a
            href="/qms/audits"
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
