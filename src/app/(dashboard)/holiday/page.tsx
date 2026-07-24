export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { formatDate } from "@/lib/utils";
import { computeHolidayBalances } from "@/lib/holiday";
import { RequestReviewControl } from "./request-review-control";
import { AdjustmentForm } from "./adjustment-form";

export default async function HolidayPage() {
  const [balances, requests, contractors] = await Promise.all([
    computeHolidayBalances(),
    prisma.holidayRequest.findMany({
      where: { status: { in: ["Pending", "Approved"] } },
      include: { contractor: true },
      orderBy: { requestedAt: "asc" },
    }),
    prisma.contractor.findMany({
      where: { employmentType: "PAYE" },
      select: { id: true, firstName: true, lastName: true, ref: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
  ]);

  const totalBalance = balances.reduce((sum, b) => sum + b.balanceHours, 0);
  const pendingCount = requests.filter((r) => r.status === "Pending").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Holiday"
        description={`${balances.length} PAYE contractors accruing · 12.07% derived accrual`}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{balances.length}</p>
          <p className="text-xs text-gray-500">PAYE contractors</p>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-center">
          <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
          <p className="text-xs text-orange-600">Pending requests</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{totalBalance.toFixed(1)}h</p>
          <p className="text-xs text-blue-600">Total balance owed</p>
        </div>
      </div>

      {/* Pending / approved-not-paid requests */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Holiday requests</h2>
        </div>
        {requests.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {requests.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {r.contractor.firstName} {r.contractor.lastName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {r.hoursRequested}h requested · {formatDate(r.requestedAt)}
                  </p>
                  {r.notes && <p className="text-xs text-gray-400 mt-0.5">{r.notes}</p>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant={r.status}>{r.status}</Badge>
                  <RequestReviewControl requestId={r.id} status={r.status} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-4 py-8 text-center text-sm text-gray-500">No pending or unpaid requests.</p>
        )}
      </div>

      {/* Manual adjustment */}
      <AdjustmentForm
        contractors={contractors.map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}`, ref: c.ref }))}
      />

      {/* Balances table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Contractor</th>
              <th className="px-4 py-3 text-right">Accrued</th>
              <th className="px-4 py-3 text-right">Paid</th>
              <th className="px-4 py-3 text-right">Adjustments</th>
              <th className="px-4 py-3 text-right">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {balances.map((b) => (
              <tr key={b.contractorId} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{b.contractorName}</p>
                  {b.contractorRef && <p className="text-xs text-gray-400">{b.contractorRef}</p>}
                </td>
                <td className="px-4 py-3 text-right text-gray-600">{b.accruedHours.toFixed(2)}h</td>
                <td className="px-4 py-3 text-right text-gray-600">{b.paidHours.toFixed(2)}h</td>
                <td className="px-4 py-3 text-right text-gray-600">
                  {b.adjustmentHours > 0 ? "+" : ""}{b.adjustmentHours.toFixed(2)}h
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">{b.balanceHours.toFixed(2)}h</td>
              </tr>
            ))}
            {balances.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No PAYE contractors found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
