export const dynamic = "force-dynamic";
import { Fragment } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { formatDate, formatCurrency } from "@/lib/utils";
import { getAgedDebtRows, type AgedDebtBucket } from "../aged-debt-data";

const BUCKETS: AgedDebtBucket[] = ["Current", "1-30", "31-60", "61-90", "90+"];

export default async function AgedDebtPage() {
  const rows = await getAgedDebtRows();

  const byCompany = new Map<string, { companyName: string; rows: typeof rows }>();
  for (const row of rows) {
    if (!byCompany.has(row.companyId)) {
      byCompany.set(row.companyId, { companyName: row.companyName, rows: [] });
    }
    byCompany.get(row.companyId)!.rows.push(row);
  }

  const grandTotals: Record<AgedDebtBucket, number> = {
    Current: 0,
    "1-30": 0,
    "31-60": 0,
    "61-90": 0,
    "90+": 0,
  };
  for (const row of rows) {
    grandTotals[row.bucket] += row.balance;
  }
  const grandTotal = rows.reduce((sum, r) => sum + r.balance, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Aged Debt"
        description="Outstanding invoice balances bucketed by days past due"
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/api/billing/aged-debt"
              className="rounded-lg bg-purple-100 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-200 transition-colors"
            >
              Export CSV
            </Link>
            <Link
              href="/billing"
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Back to Billing
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-gray-500">Total Outstanding</p>
          <p className="mt-1 text-xl font-bold text-gray-900">{formatCurrency(grandTotal)}</p>
        </div>
        {BUCKETS.map((b) => (
          <div key={b} className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium uppercase text-gray-500">{b}</p>
            <p
              className={`mt-1 text-xl font-bold ${
                b === "Current" ? "text-gray-900" : b === "90+" ? "text-red-600" : "text-amber-600"
              }`}
            >
              {formatCurrency(grandTotals[b])}
            </p>
          </div>
        ))}
      </div>

      {byCompany.size > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Company / Invoice</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Bucket</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Total</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Paid</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {[...byCompany.entries()].map(([companyId, group]) => {
                const companyTotal = group.rows.reduce((sum, r) => sum + r.balance, 0);
                return (
                  <Fragment key={companyId}>
                    <tr className="bg-gray-50">
                      <td colSpan={5} className="px-6 py-2 text-sm font-semibold text-gray-900">
                        {group.companyName}
                      </td>
                      <td className="px-6 py-2 text-sm font-semibold text-gray-900 text-right">
                        {formatCurrency(companyTotal)}
                      </td>
                    </tr>
                    {group.rows.map((row) => (
                      <tr key={row.invoiceId} className="hover:bg-gray-50 transition-colors">
                        <td className="whitespace-nowrap px-6 py-3 pl-10 text-sm text-blue-600">
                          <Link href={`/billing/${row.invoiceId}`} className="hover:underline">
                            {row.invoiceNumber}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-6 py-3 text-sm text-gray-500">
                          {row.dueDate ? formatDate(row.dueDate) : "—"}
                        </td>
                        <td className="whitespace-nowrap px-6 py-3">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded ${
                              row.bucket === "Current"
                                ? "bg-gray-100 text-gray-600"
                                : row.bucket === "90+"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {row.bucket}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-3 text-sm text-gray-700 text-right">
                          {formatCurrency(row.total)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-3 text-sm text-gray-700 text-right">
                          {formatCurrency(row.amountPaid)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-3 text-sm font-semibold text-gray-900 text-right">
                          {formatCurrency(row.balance)}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-gray-500">No outstanding balances — everything is paid up.</p>
        </div>
      )}
    </div>
  );
}
