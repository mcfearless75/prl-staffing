export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { logActivity } from "@/lib/activity-log";
import {
  auditDetails,
  canRunNewStarterReport,
  defaultPayrollRecipients,
  filtersToQuery,
  parseNewStarterFilters,
  toSearchParams,
  type NewStarterFilters,
  type NewStarterRow,
} from "@/lib/reports/new-starter-report";
import { getNewStarterFilterOptions, getNewStarterReport } from "@/lib/reports/new-starter-query";
import { NewStarterFilterForm } from "./filter-form";
import { NewStarterExportActions } from "./export-actions";

const th = "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500";
const td = "px-4 py-3 text-sm text-gray-700";

export default async function NewStarterReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  const user = session?.user as { userType?: string; role?: string; email?: string | null } | undefined;
  if (!canRunNewStarterReport(user)) notFound();

  const params = toSearchParams(await searchParams);
  const submitted = params.has("from");
  const parsed = submitted ? parseNewStarterFilters(params) : null;
  const filters: NewStarterFilters | null = parsed?.ok ? parsed.filters : null;

  const [options, rows] = await Promise.all([
    getNewStarterFilterOptions(),
    filters ? getNewStarterReport(filters) : Promise.resolve<NewStarterRow[] | null>(null),
  ]);

  // NI numbers are now on screen: record who looked, at what, and how many.
  if (filters && rows) {
    await logActivity("Viewed New Starter Report", "Report", undefined, auditDetails(filters, rows.length));
  }

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
        title="New Starter Report"
        description="Everyone whose assignment starts in the chosen dates, for the payroll provider. Includes NI numbers: every view and export is logged."
      />

      <NewStarterFilterForm
        companies={options.companies}
        roles={options.roles}
        initial={{
          from: filters?.from ?? params.get("from") ?? "",
          to: filters ? (filters.toDefaulted ? "" : filters.to) : (params.get("to") ?? ""),
          companyIds: filters?.companyIds ?? params.getAll("company"),
          roles: filters?.roles ?? params.getAll("role"),
        }}
      />

      {parsed && !parsed.ok && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{parsed.error}</div>
      )}

      {!submitted && (
        <p className="text-sm text-gray-500">Choose a start date and press View to see the report.</p>
      )}

      {filters && rows && (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-center">
              <p className="text-2xl font-bold text-blue-700">{rows.length}</p>
              <p className="mt-1 text-xs text-blue-600">
                Starter{rows.length === 1 ? "" : "s"}, {filters.from.split("-").reverse().join("/")} to{" "}
                {filters.to.split("-").reverse().join("/")}
              </p>
            </div>
            {rows.length > 0 && (
              <NewStarterExportActions
                query={filtersToQuery(filters)}
                defaultRecipients={defaultPayrollRecipients()}
                senderEmail={user?.email ?? null}
              />
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className={th}>Name</th>
                    <th className={th}>Phone Number</th>
                    <th className={th}>Email Address</th>
                    <th className={th}>NI Number</th>
                    <th className={th}>Start Date</th>
                    <th className={th}>Company</th>
                    <th className={th}>Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                        No assignments start in these dates for the chosen companies and roles.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr key={r.assignmentId} className="hover:bg-gray-50 transition-colors">
                        <td className="whitespace-nowrap px-4 py-3">
                          <Link
                            href={`/contractors/${r.contractorId}`}
                            className="text-sm font-medium text-blue-700 hover:underline"
                          >
                            {r.name || "(no name)"}
                          </Link>
                        </td>
                        <td className={`${td} whitespace-nowrap`}>{r.phone || <Missing />}</td>
                        <td className={`${td} break-all`}>{r.email || <Missing />}</td>
                        <td className={`${td} whitespace-nowrap font-mono`}>{r.niNumber || <Missing />}</td>
                        <td className={`${td} whitespace-nowrap`}>{r.startDate}</td>
                        <td className={td}>{r.company}</td>
                        <td className={td}>{r.role || <Missing />}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Missing() {
  return <span className="text-xs font-medium text-amber-600">Missing</span>;
}
