export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { formatDate } from "@/lib/utils";
import { assignQuery, resolveQuery, closeQuery } from "../actions";

export default async function PaymentQueryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const query = await prisma.paymentQuery.findUnique({ where: { id } });
  if (!query) notFound();

  let hours: any[] = [];
  try {
    hours = query.hours ? JSON.parse(query.hours) : [];
  } catch {
    hours = [];
  }
  const assignJenni = assignQuery.bind(null, id, "Jenni Connors");
  const close = closeQuery.bind(null, id);

  return (
    <div className="space-y-6">
      <PageHeader title={`Payment Query ${query.ticketNumber}`} action={<Badge variant={query.status} className="text-sm px-3 py-1">{query.status}</Badge>} />

      {/* Operative Details */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Operative Details</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div><p className="text-xs text-gray-500 uppercase">Name</p><p className="text-sm font-medium">{query.operativeName}</p></div>
          <div><p className="text-xs text-gray-500 uppercase">Email</p><p className="text-sm"><a href={`mailto:${query.email}`} className="text-blue-600">{query.email}</a></p></div>
          <div><p className="text-xs text-gray-500 uppercase">Phone</p><p className="text-sm">{query.phone || "—"}</p></div>
          <div><p className="text-xs text-gray-500 uppercase">Role</p><p className="text-sm">{query.role || "—"}</p></div>
          <div><p className="text-xs text-gray-500 uppercase">Week Ending</p><p className="text-sm font-medium">{query.weekEnding}</p></div>
          <div><p className="text-xs text-gray-500 uppercase">Query Type</p><p className="text-sm font-medium text-red-600">{query.queryType}</p></div>
        </div>
      </div>

      {/* Hours Summary */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Hours Summary</h3>
        <div className="grid grid-cols-3 gap-4">
          <div><p className="text-xs text-gray-500">Hours Claimed</p><p className="text-lg font-bold">{query.totalHoursClaimed || "—"}</p></div>
          <div><p className="text-xs text-gray-500">Overtime Claimed</p><p className="text-lg font-bold text-orange-600">{query.totalOvertimeClaimed || "—"}</p></div>
          <div><p className="text-xs text-gray-500">Hours Paid</p><p className="text-lg font-bold text-red-600">{query.totalHoursPaid || "0"}</p></div>
        </div>
      </div>

      {/* Hours Table */}
      {hours.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Start</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Finish</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Hours Claimed</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Hours Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {hours.map((h: any, i: number) => (
                <tr key={i}><td className="px-6 py-3 text-sm">{h.date}</td><td className="px-6 py-3 text-sm">{h.start}</td><td className="px-6 py-3 text-sm">{h.finish}</td><td className="px-6 py-3 text-sm font-medium">{h.hoursClaimed}</td><td className="px-6 py-3 text-sm">{h.hoursPaid}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Explanation */}
      <div className="rounded-xl border border-red-200 bg-red-50/50 p-6">
        <h3 className="text-sm font-semibold text-red-900 mb-2">Explanation of Issue</h3>
        <p className="text-sm text-gray-900 whitespace-pre-wrap">{query.explanation}</p>
        <p className="text-xs text-gray-500 mt-3">Signed: <strong>{query.signature}</strong></p>
      </div>

      {/* Timeline */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Timeline</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3"><div className="h-2 w-2 rounded-full bg-blue-500" /><span className="text-sm">Created {formatDate(query.createdAt)}</span></div>
          {query.assignedAt && <div className="flex items-center gap-3"><div className="h-2 w-2 rounded-full bg-amber-500" /><span className="text-sm">Assigned to <strong>{query.assignedTo}</strong> — {formatDate(query.assignedAt)}</span></div>}
          {query.resolvedAt && <div className="flex items-center gap-3"><div className="h-2 w-2 rounded-full bg-emerald-500" /><span className="text-sm">Resolved by <strong>{query.resolvedBy}</strong> — {formatDate(query.resolvedAt)}{query.resolutionNotes && ` — "${query.resolutionNotes}"`}</span></div>}
          {query.closedAt && <div className="flex items-center gap-3"><div className="h-2 w-2 rounded-full bg-gray-400" /><span className="text-sm">Closed by <strong>{query.closedBy}</strong> — {formatDate(query.closedAt)}</span></div>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {query.status === "Open" && (
          <form action={assignJenni}><button type="submit" className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600">Assign to Jenni</button></form>
        )}
        {query.status === "Assigned" && (
          <form action={async (formData: FormData) => { "use server"; await resolveQuery(id, formData.get("notes") as string || "Resolved"); }} className="flex items-center gap-2">
            <input name="notes" placeholder="Resolution notes..." className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">Mark Resolved</button>
          </form>
        )}
        {query.status === "Resolved" && (
          <form action={close}><button type="submit" className="rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700">Close Ticket</button></form>
        )}
        <a href="/payment-queries" className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">Back to Queries</a>
      </div>
    </div>
  );
}
