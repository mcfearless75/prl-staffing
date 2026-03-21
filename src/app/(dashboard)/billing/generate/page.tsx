export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { generateInvoices } from "../actions";

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

  // Count approved uninvoiced timesheets
  const approvedCount = await prisma.timesheet.count({
    where: { status: "Approved" },
  });

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
            <p className="text-xs text-emerald-600 mt-1">approved timesheets</p>
          </div>
        </div>
      </div>
    </div>
  );
}
