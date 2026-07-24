export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Badge } from "@/components/badge";
import { formatDate } from "@/lib/utils";
import { computeHolidayBalanceForContractor } from "@/lib/holiday";
import { HolidayRequestForm } from "./request-form";

export default async function PortalHolidayPage() {
  const session = await auth();
  const contractorId = (session?.user as { contractorId?: string })?.contractorId;
  if (!contractorId) redirect("/login");

  const contractor = await prisma.contractor.findUnique({ where: { id: contractorId } });
  if (!contractor) redirect("/login");

  if (contractor.employmentType !== "PAYE") {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Holiday</h1>
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-gray-500">Holiday accrual applies to PAYE workers.</p>
        </div>
      </div>
    );
  }

  const [balance, requests] = await Promise.all([
    computeHolidayBalanceForContractor(contractorId),
    prisma.holidayRequest.findMany({
      where: { contractorId },
      orderBy: { requestedAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Holiday</h1>

      {/* Balance card */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-xs font-medium uppercase text-gray-500">Remaining balance</p>
        <p className="mt-1 text-3xl font-bold text-gray-900">{(balance?.balanceHours ?? 0).toFixed(2)}h</p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-center">
          <div className="rounded-lg bg-emerald-50 p-2.5">
            <p className="text-sm font-bold text-emerald-700">{(balance?.accruedHours ?? 0).toFixed(2)}h</p>
            <p className="text-[10px] text-emerald-600">Accrued</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-2.5">
            <p className="text-sm font-bold text-gray-700">{(balance?.paidHours ?? 0).toFixed(2)}h</p>
            <p className="text-[10px] text-gray-500">Taken</p>
          </div>
        </div>
      </div>

      {/* Request form */}
      <HolidayRequestForm />

      {/* History */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-900">Request history</h2>
        {requests.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
            No requests yet.
          </div>
        ) : (
          requests.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{r.hoursRequested}h</p>
                <p className="text-xs text-gray-500">{formatDate(r.requestedAt)}</p>
                {r.notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{r.notes}</p>}
              </div>
              <Badge variant={r.status}>{r.status}</Badge>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
