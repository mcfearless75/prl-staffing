export const dynamic = "force-dynamic";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ArrowLeft, Download } from "lucide-react";
import { getMissingEmergencyContactsReport } from "@/app/api/reports/_lib/missing-emergency-contacts";

export default async function MissingEmergencyContactsPage() {
  const rows = await getMissingEmergencyContactsReport();
  const onLiveWork = rows.filter((r) => r.onLiveWork).length;

  return (
    <div className="space-y-6">
      <Link
        href="/reports"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Reports
      </Link>
      <PageHeader
        title="Missing Emergency Contacts"
        description="People not marked Left or Inactive whose emergency contact is missing a name or a phone number. Those on live work are listed first."
      />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
            <p className="text-2xl font-bold text-red-700">{rows.length}</p>
            <p className="text-xs text-red-600 mt-1">Missing emergency contact</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
            <p className="text-2xl font-bold text-amber-700">{onLiveWork}</p>
            <p className="text-xs text-amber-600 mt-1">Of those, on live work</p>
          </div>
        </div>
        <a
          href="/api/reports/emergency-contacts?format=csv"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <Download className="h-4 w-4" />
          Download CSV
        </a>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Missing</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">On Live Work</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                    Everyone has an emergency contact name and phone number on file.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.contractorId} className="hover:bg-gray-50 transition-colors">
                    <td className="whitespace-nowrap px-6 py-3">
                      <Link href={`/contractors/${r.contractorId}`} className="text-sm font-medium text-blue-700 hover:underline">
                        {r.name}
                      </Link>
                      {r.ref !== "-" && <p className="text-xs text-gray-400">{r.ref}</p>}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-sm text-gray-700">{r.status}</td>
                    <td className="whitespace-nowrap px-6 py-3">
                      <div className="flex gap-1">
                        {r.missing.map((m) => (
                          <span key={m} className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-red-100 text-red-700">
                            {m}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-sm">
                      {r.onLiveWork ? (
                        <span className="font-medium text-amber-700">Yes</span>
                      ) : (
                        <span className="text-gray-400">No</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
