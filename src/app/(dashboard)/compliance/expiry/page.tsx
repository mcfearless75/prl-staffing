export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { formatDate, getInitials } from "@/lib/utils";
import { AlertTriangle, XCircle, Clock, Calendar } from "lucide-react";

function bucket<T extends { expiryDate: Date | null }>(records: T[], now: Date, from: number, to: number): T[] {
  const fromMs = now.getTime() + from * 24 * 60 * 60 * 1000;
  const toMs   = now.getTime() + to   * 24 * 60 * 60 * 1000;
  return records.filter((r) => {
    if (!r.expiryDate) return false;
    const t = r.expiryDate.getTime();
    return t >= fromMs && t < toMs;
  });
}

export default async function ComplianceExpiryPage() {
  const now = new Date();
  const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const records = await prisma.complianceRecord.findMany({
    where: {
      expiryDate: { not: null, lte: in90Days },
    },
    include: { contractor: true },
    orderBy: { expiryDate: "asc" },
  });

  // Bucket: overdue (past), <=30 days, 31–90 days
  const overdue   = records.filter((r) => r.expiryDate && r.expiryDate < now);
  const within30  = bucket(records, now, 0, 30);
  const within90  = bucket(records, now, 30, 90);

  const todayLabel = now.toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  function daysUntil(date: Date): number {
    return Math.ceil((date.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  }

  function daysOverdue(date: Date): number {
    return Math.ceil((now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));
  }

  type RecordWithContractor = typeof records[number];

  function RecordTable({
    rows,
    variant,
  }: {
    rows: RecordWithContractor[];
    variant: "red" | "amber" | "blue";
  }) {
    if (rows.length === 0) {
      return (
        <p className="px-6 py-4 text-sm text-gray-400 italic">None</p>
      );
    }

    const rowHover =
      variant === "red"
        ? "hover:bg-red-50"
        : variant === "amber"
        ? "hover:bg-amber-50"
        : "hover:bg-blue-50";

    return (
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Contractor
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Document Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Document / Reference
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Expiry Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Days
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {rows.map((r) => {
            const isOverdue = r.expiryDate! < now;
            const dayLabel = isOverdue
              ? `${daysOverdue(r.expiryDate!)}d overdue`
              : `${daysUntil(r.expiryDate!)}d left`;
            const dayColor = isOverdue
              ? "text-red-600 font-semibold"
              : variant === "amber"
              ? "text-amber-600 font-semibold"
              : "text-blue-600";

            return (
              <tr key={r.id} className={`transition-colors ${rowHover}`}>
                <td className="whitespace-nowrap px-6 py-4">
                  <Link
                    href={`/contractors/${r.contractor.id}`}
                    className="flex items-center gap-3 group"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                      {getInitials(r.contractor.firstName, r.contractor.lastName)}
                    </div>
                    <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                      {r.contractor.firstName} {r.contractor.lastName}
                    </span>
                  </Link>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                  {r.type}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {r.documentName || r.reference ? (
                    <>
                      {r.documentName && <span className="text-gray-900">{r.documentName}</span>}
                      {r.reference && (
                        <span className="ml-2 text-gray-400">#{r.reference}</span>
                      )}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                  {formatDate(r.expiryDate!)}
                </td>
                <td className={`whitespace-nowrap px-6 py-4 text-sm ${dayColor}`}>
                  {dayLabel}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <Link
                      href={`/compliance/${r.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      View
                    </Link>
                    <Link
                      href={`/compliance/${r.id}/edit`}
                      className="text-sm font-medium text-gray-600 hover:text-gray-900"
                    >
                      Edit
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance Expiry Report"
        description={`Today: ${todayLabel}`}
        action={
          <Link
            href="/compliance"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            ← Back to Compliance
          </Link>
        }
      />

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-center gap-4">
          <XCircle className="h-8 w-8 text-red-500 shrink-0" />
          <div>
            <p className="text-2xl font-bold text-red-700">{overdue.length}</p>
            <p className="text-xs font-medium text-red-600 mt-0.5">Overdue</p>
          </div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-4">
          <AlertTriangle className="h-8 w-8 text-amber-500 shrink-0" />
          <div>
            <p className="text-2xl font-bold text-amber-700">{within30.length}</p>
            <p className="text-xs font-medium text-amber-600 mt-0.5">Expiring within 30 days</p>
          </div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex items-center gap-4">
          <Clock className="h-8 w-8 text-blue-400 shrink-0" />
          <div>
            <p className="text-2xl font-bold text-blue-700">{within90.length}</p>
            <p className="text-xs font-medium text-blue-600 mt-0.5">Expiring within 31–90 days</p>
          </div>
        </div>
      </div>

      {/* Overdue */}
      <div className="overflow-hidden rounded-xl border border-red-300 bg-white">
        <div className="flex items-center gap-3 border-b border-red-200 bg-red-50 px-6 py-4">
          <XCircle className="h-5 w-5 text-red-500 shrink-0" />
          <h2 className="text-base font-semibold text-red-900">
            Overdue ({overdue.length})
          </h2>
          <span className="text-sm text-red-600">Expiry date has passed — immediate action required</span>
        </div>
        <RecordTable rows={overdue} variant="red" />
      </div>

      {/* Expiring within 30 days */}
      <div className="overflow-hidden rounded-xl border border-amber-300 bg-white">
        <div className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-6 py-4">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
          <h2 className="text-base font-semibold text-amber-900">
            Expiring within 30 days ({within30.length})
          </h2>
          <span className="text-sm text-amber-600">Chase renewals now</span>
        </div>
        <RecordTable rows={within30} variant="amber" />
      </div>

      {/* Expiring within 31–90 days */}
      <div className="overflow-hidden rounded-xl border border-blue-200 bg-white">
        <div className="flex items-center gap-3 border-b border-blue-100 bg-blue-50 px-6 py-4">
          <Clock className="h-5 w-5 text-blue-400 shrink-0" />
          <h2 className="text-base font-semibold text-blue-900">
            Expiring within 31–90 days ({within90.length})
          </h2>
          <span className="text-sm text-blue-600">Plan ahead</span>
        </div>
        <RecordTable rows={within90} variant="blue" />
      </div>

      {overdue.length === 0 && within30.length === 0 && within90.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
          <Calendar className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">
            No compliance records expire within the next 90 days.
          </p>
        </div>
      )}
    </div>
  );
}
