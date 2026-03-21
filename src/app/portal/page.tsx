export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/badge";
import { formatDate } from "@/lib/utils";

export default async function PortalDashboard() {
  const session = await auth();
  const contractorId = (session?.user as { contractorId?: string })?.contractorId;
  if (!contractorId) redirect("/login");

  const contractor = await prisma.contractor.findUnique({
    where: { id: contractorId },
    include: {
      assignments: {
        where: { status: { in: ["Active", "Placed"] } },
        include: { company: true },
        orderBy: { startDate: "desc" },
      },
      timesheets: {
        orderBy: { weekStarting: "desc" },
        take: 5,
        include: { assignment: { include: { company: true } } },
      },
      compliances: {
        where: { status: { in: ["Expiring", "Expired"] } },
        orderBy: { expiryDate: "asc" },
        take: 5,
      },
    },
  });

  if (!contractor) redirect("/login");

  const pendingTimesheets = contractor.timesheets.filter((t) => t.status === "Draft").length;
  const approvedTimesheets = contractor.timesheets.filter((t) => t.status === "Approved").length;
  const complianceAlerts = contractor.compliances.length;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          Hello, {contractor.firstName}
        </h1>
        <p className="text-sm text-gray-500">
          Welcome to your contractor portal
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{pendingTimesheets}</p>
          <p className="text-[10px] text-gray-500 mt-1">Draft Timesheets</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{approvedTimesheets}</p>
          <p className="text-[10px] text-gray-500 mt-1">Approved</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
          <p className={`text-2xl font-bold ${complianceAlerts > 0 ? "text-red-600" : "text-gray-400"}`}>
            {complianceAlerts}
          </p>
          <p className="text-[10px] text-gray-500 mt-1">Compliance Alerts</p>
        </div>
      </div>

      {/* Active Assignments */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Active Assignments</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {contractor.assignments.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500">No active assignments</div>
          ) : (
            contractor.assignments.map((a) => (
              <div key={a.id} className="px-4 py-3">
                <p className="text-sm font-medium text-gray-900">{a.role}</p>
                <p className="text-xs text-gray-500">{a.company.name} {a.location ? `- ${a.location}` : ""}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={a.status}>{a.status}</Badge>
                  <span className="text-xs text-gray-400">Since {formatDate(a.startDate)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Timesheets */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Recent Timesheets</h2>
          <Link
            href="/portal/timesheets"
            className="text-xs font-medium text-blue-600"
          >
            View all
          </Link>
        </div>
        <div className="divide-y divide-gray-100">
          {contractor.timesheets.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-500">No timesheets yet</div>
          ) : (
            contractor.timesheets.map((ts) => (
              <Link key={ts.id} href={`/portal/timesheets/${ts.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Week of {formatDate(ts.weekStarting)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {ts.totalHours}h {ts.overtimeHours > 0 ? `(${ts.overtimeHours}h OT)` : ""}
                  </p>
                </div>
                <Badge variant={ts.status}>{ts.status}</Badge>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Compliance Alerts */}
      {complianceAlerts > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50">
          <div className="border-b border-red-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-red-800">Compliance Alerts</h2>
          </div>
          <div className="divide-y divide-red-100">
            {contractor.compliances.map((c) => (
              <div key={c.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-red-900">{c.type}</p>
                  <Badge variant={c.status}>{c.status}</Badge>
                </div>
                {c.expiryDate && (
                  <p className="text-xs text-red-600 mt-0.5">Expires {formatDate(c.expiryDate)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
