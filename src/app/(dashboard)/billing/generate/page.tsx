export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { formatDate } from "@/lib/utils";
import { generateInvoices } from "../actions";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount);
}

export default async function GenerateInvoicesPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const error = params?.error;

  const companies = await prisma.company.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  // Approved timesheets not yet on any invoice — the actual "ready to bill"
  // pool, broken down so staff can check it before generating blind.
  const approvedTimesheets = await prisma.timesheet.findMany({
    where: { status: "Approved" },
    include: {
      contractor: true,
      assignment: { include: { company: true, site: true, department: true } },
    },
    orderBy: { weekStarting: "asc" },
  });
  const invoicedLines = await prisma.invoiceLine.findMany({
    where: { timesheetId: { in: approvedTimesheets.map((t) => t.id) } },
    select: { timesheetId: true },
  });
  const invoicedIds = new Set(invoicedLines.map((l) => l.timesheetId));
  const unbilled = approvedTimesheets.filter((t) => !invoicedIds.has(t.id));
  const approvedCount = unbilled.length;

  // Group Client → Site/Dept for the review table
  const byClient = new Map<
    string,
    { clientName: string; rows: typeof unbilled; total: number; missingRate: number }
  >();
  for (const ts of unbilled) {
    const clientName = ts.assignment?.company?.name ?? "No client on assignment";
    const bucket = byClient.get(clientName) ?? { clientName, rows: [], total: 0, missingRate: 0 };
    bucket.rows.push(ts);
    const rate = ts.assignment?.chargeRate;
    if (rate == null) bucket.missingRate++;
    else bucket.total += ts.totalHours * rate + ts.overtimeHours * rate * 1.5;
    byClient.set(clientName, bucket);
  }
  const clientGroups = Array.from(byClient.values()).sort((a, b) => a.clientName.localeCompare(b.clientName));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Generate Invoices"
        description="Auto-generate invoices from approved timesheets"
      />

      {error === "no-timesheets" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800 font-medium">No approved timesheets found for the selected period and company.</p>
          <p className="text-xs text-amber-600 mt-1">Make sure timesheets are approved before generating invoices.</p>
        </div>
      )}

      {error === "already-invoiced" && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-800 font-medium">All timesheets in this period have already been invoiced.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Generation Form */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-6">
          <form action={generateInvoices} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="periodStart" className="block text-sm font-medium text-gray-700">
                  Period Start <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="periodStart"
                  name="periodStart"
                  required
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="periodEnd" className="block text-sm font-medium text-gray-700">
                  Period End <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="periodEnd"
                  name="periodEnd"
                  required
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="companyId" className="block text-sm font-medium text-gray-700">
                Company
              </label>
              <select
                id="companyId"
                name="companyId"
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Companies (generates separate invoices per company)</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="vatRate" className="block text-sm font-medium text-gray-700">
                VAT Rate (%)
              </label>
              <input
                type="number"
                id="vatRate"
                name="vatRate"
                defaultValue={20}
                step={0.5}
                min={0}
                max={100}
                className="mt-1 block w-32 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
              >
                Generate Invoices
              </button>
              <Link
                href="/billing"
                className="rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>

        {/* Info Panel */}
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">How It Works</h3>
            <ol className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">1</span>
                <span>Select billing period and optional company</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">2</span>
                <span>System finds all <strong>approved</strong> timesheets in period</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">3</span>
                <span>Groups by company, calculates using contractor charge rates</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">4</span>
                <span>Generates invoice with VAT, links PO numbers for three-way matching</span>
              </li>
            </ol>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-xs font-medium uppercase text-emerald-600">Ready to Invoice</p>
            <p className="mt-1 text-3xl font-bold text-emerald-700">{approvedCount}</p>
            <p className="text-xs text-emerald-600 mt-1">approved timesheets, not yet billed</p>
          </div>
        </div>
      </div>

      {/* Pre-invoice check: exactly what's ready to bill, per client */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Unbilled Approved Hours</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Every approved timesheet not yet on an invoice — check this before generating.
          </p>
        </div>
        {clientGroups.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-gray-400">
            Nothing to bill — no approved, unbilled timesheets right now.
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {clientGroups.map((group) => (
              <div key={group.clientName}>
                <div className="flex items-center justify-between gap-3 bg-gray-50 px-6 py-2.5">
                  <p className="text-sm font-semibold text-gray-800">{group.clientName}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    {group.missingRate > 0 && (
                      <span className="rounded bg-amber-100 px-2 py-0.5 font-medium text-amber-700">
                        {group.missingRate} with no charge rate set
                      </span>
                    )}
                    <span className="font-semibold text-gray-700">{formatCurrency(group.total)}</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-[10px] font-medium uppercase tracking-wider text-gray-400">
                        <th className="px-6 py-2">Subcontractor</th>
                        <th className="px-6 py-2">Site / Dept</th>
                        <th className="px-6 py-2">Week Ending</th>
                        <th className="px-6 py-2 text-right">Hours</th>
                        <th className="px-6 py-2 text-right">OT</th>
                        <th className="px-6 py-2 text-right">Rate</th>
                        <th className="px-6 py-2 text-right">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {group.rows.map((ts) => {
                        const weekEnding = new Date(ts.weekStarting);
                        weekEnding.setDate(weekEnding.getDate() + 6);
                        const rate = ts.assignment?.chargeRate ?? null;
                        const value = rate != null ? ts.totalHours * rate + ts.overtimeHours * rate * 1.5 : null;
                        const siteDept = [ts.assignment?.site?.name, ts.assignment?.department?.name]
                          .filter(Boolean)
                          .join(" / ") || "—";
                        return (
                          <tr key={ts.id} className="hover:bg-gray-50 transition-colors">
                            <td className="whitespace-nowrap px-6 py-2 text-gray-900">
                              {ts.contractor.firstName} {ts.contractor.lastName}
                            </td>
                            <td className="whitespace-nowrap px-6 py-2 text-gray-500">{siteDept}</td>
                            <td className="whitespace-nowrap px-6 py-2 text-gray-500">{formatDate(weekEnding)}</td>
                            <td className="whitespace-nowrap px-6 py-2 text-right text-gray-900">{ts.totalHours}h</td>
                            <td className="whitespace-nowrap px-6 py-2 text-right text-gray-500">
                              {ts.overtimeHours > 0 ? `${ts.overtimeHours}h` : "—"}
                            </td>
                            <td className="whitespace-nowrap px-6 py-2 text-right text-gray-500">
                              {rate != null ? formatCurrency(rate) : (
                                <span className="text-amber-600 font-medium">Not set</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-6 py-2 text-right font-medium text-gray-900">
                              {value != null ? formatCurrency(value) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
