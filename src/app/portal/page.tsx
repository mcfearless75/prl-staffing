export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { LIVE_ASSIGNMENT_STATUSES } from "@/lib/assignment-statuses";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/badge";
import { formatDate } from "@/lib/utils";
import { ShieldCheck, FileUp, User, Plus, ChevronRight, Smartphone, MessageSquare } from "lucide-react";
import { portalFeatureEnabled } from "@/lib/portal-features";

export default async function PortalDashboard() {
  const session = await auth();
  const contractorId = (session?.user as { contractorId?: string })?.contractorId;
  if (!contractorId) redirect("/login");

  const contractor = await prisma.contractor.findUnique({
    where: { id: contractorId },
    include: {
      assignments: {
        where: { status: { in: [...LIVE_ASSIGNMENT_STATUSES] } },
        include: { company: true },
        orderBy: { startDate: "desc" },
      },
      timesheets: {
        orderBy: { weekStarting: "desc" },
        take: 5,
        include: { assignment: { include: { company: true } } },
      },
      compliances: {
        orderBy: { expiryDate: "asc" },
      },
    },
  });

  if (!contractor) redirect("/login");

  // Timesheets are a hidden future feature (portal-features.ts).
  const showTimesheets = portalFeatureEnabled("timesheets");

  const pendingTimesheets = contractor.timesheets.filter((t) => t.status === "Draft").length;
  const approvedTimesheets = contractor.timesheets.filter((t) => t.status === "Approved").length;
  const expiringCompliance = contractor.compliances.filter((c) => c.status === "Expiring" || c.status === "Expired").length;
  const totalCompliance = contractor.compliances.length;
  const verifiedCompliance = contractor.compliances.filter((c) => c.status === "Verified").length;
  const complianceScore = totalCompliance > 0 ? Math.round((verifiedCompliance / totalCompliance) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-prism-ink">
          Hello, {contractor.firstName}
        </h1>
        <p className="text-sm text-prism-ink-muted">
          Welcome to your contractor portal
        </p>
      </div>

      {/* Install banner */}
      <details className="rounded-xl border border-blue-200 bg-blue-50">
        <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium text-blue-800 list-none">
          <Smartphone className="h-4 w-4 shrink-0" />
          📲 Install the PRISM app on your phone
          <span className="ml-auto text-xs text-blue-500">tap to expand</span>
        </summary>
        <div className="border-t border-blue-200 px-4 pb-4 pt-3 space-y-3">
          <p className="text-xs text-blue-700">
            Add PRISM to your home screen for quick access — works like a regular app, no app store needed.
          </p>
          <p className="text-[11px] font-semibold text-blue-900 mb-1">
            🌐 Install address: <span className="font-mono bg-white border border-blue-200 rounded px-1.5 py-0.5 text-blue-800">www.prismworkforce.online/install</span>
          </p>

          {/* iPhone */}
          <div className="rounded-lg bg-white border border-blue-200 p-3">
            <p className="text-xs font-semibold text-gray-800 mb-2">🍎 iPhone / iPad (Safari)</p>
            <ol className="text-xs text-gray-600 space-y-1 list-none">
              <li><span className="font-semibold text-gray-700">1.</span> Open <strong>Safari</strong> and go to <strong>www.prismworkforce.online/install</strong></li>
              <li><span className="font-semibold text-gray-700">2.</span> Tap the <strong>Share</strong> button at the bottom of the screen (the box with an arrow pointing up)</li>
              <li><span className="font-semibold text-gray-700">3.</span> Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong></li>
              <li><span className="font-semibold text-gray-700">4.</span> Tap <strong>Add</strong> — PRISM will appear on your home screen</li>
            </ol>
          </div>

          {/* Android */}
          <div className="rounded-lg bg-white border border-blue-200 p-3">
            <p className="text-xs font-semibold text-gray-800 mb-2">🤖 Android (Chrome)</p>
            <ol className="text-xs text-gray-600 space-y-1 list-none">
              <li><span className="font-semibold text-gray-700">1.</span> Open <strong>Chrome</strong> and go to <strong>www.prismworkforce.online/install</strong></li>
              <li><span className="font-semibold text-gray-700">2.</span> Tap the <strong>three dots</strong> menu (top right)</li>
              <li><span className="font-semibold text-gray-700">3.</span> Tap <strong>&quot;Install app&quot;</strong> (on some phones it says <strong>&quot;Add to Home screen&quot;</strong>)</li>
              <li><span className="font-semibold text-gray-700">4.</span> Tap <strong>Install</strong> to confirm — PRISM appears on your home screen</li>
            </ol>
          </div>

          <p className="text-[10px] text-blue-500 text-center">Need help? Call us on 0800 772 3959</p>
        </div>
      </details>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        {showTimesheets && (
        <Link
          href="/portal/timesheets/new"
          className="flex items-center gap-3 min-h-[44px] rounded-lg border-2 border-prism-ink/20 bg-prism-ink/5 p-4 hover:bg-prism-ink/10 transition-colors"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-prism-ink text-prism-paper">
            <Plus className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-prism-ink">New Timesheet</p>
            <p className="text-[10px] text-prism-ink-muted">Submit your hours</p>
          </div>
        </Link>
        )}
        <Link
          href="/portal/documents"
          className="flex items-center gap-3 rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4 hover:bg-emerald-100 transition-colors"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
            <FileUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-900">Upload Docs</p>
            <p className="text-[10px] text-emerald-600">CSCS, CV, P45 etc</p>
          </div>
        </Link>
        <Link
          href="/portal/compliance"
          className="flex items-center gap-3 rounded-xl border-2 border-orange-200 bg-orange-50 p-4 hover:bg-orange-100 transition-colors"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-orange-900">Compliance</p>
            <p className="text-[10px] text-orange-600">{complianceScore}% verified</p>
          </div>
        </Link>
        <Link
          href="/portal/profile"
          className="flex items-center gap-3 rounded-xl border-2 border-gray-200 bg-gray-50 p-4 hover:bg-gray-100 transition-colors"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-600 text-white">
            <User className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">My Profile</p>
            <p className="text-[10px] text-gray-500">View your details</p>
          </div>
        </Link>
        <a
          href={`mailto:info@prlsitesolutions.co.uk?subject=${encodeURIComponent(
            `Pay Query — ${contractor.firstName} ${contractor.lastName}`
          )}`}
          className={`${showTimesheets ? "col-span-2 " : ""}flex items-center gap-3 rounded-xl border-2 border-amber-200 bg-amber-50 p-4 hover:bg-amber-100 transition-colors`}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-900">Pay Query</p>
            <p className="text-[10px] text-amber-600">Email payroll about your pay</p>
          </div>
        </a>
      </div>

      {/* Quick Stats */}
      <div className={`grid ${showTimesheets ? "grid-cols-3" : "grid-cols-1"} gap-3`}>
        {showTimesheets && (
        <>
        <div className="rounded-lg border border-prism-line bg-prism-paper p-4 text-center">
          <p className="text-2xl font-bold text-prism-info">{pendingTimesheets}</p>
          <p className="text-[10px] text-prism-ink-muted mt-1">Draft Timesheets</p>
        </div>
        <div className="rounded-lg border border-prism-line bg-prism-paper p-4 text-center">
          <p className="text-2xl font-bold text-prism-ok">{approvedTimesheets}</p>
          <p className="text-[10px] text-prism-ink-muted mt-1">Approved</p>
        </div>
        </>
        )}
        <div className="rounded-lg border border-prism-line bg-prism-paper p-4 text-center">
          <p className={`text-2xl font-bold ${expiringCompliance > 0 ? "text-prism-bad" : "text-prism-ink-muted"}`}>
            {expiringCompliance}
          </p>
          <p className="text-[10px] text-prism-ink-muted mt-1">Compliance Alerts</p>
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
                  <StatusBadge value={a.status} />
                  <span className="text-xs text-gray-400">Since {formatDate(a.startDate)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Timesheets */}
      {showTimesheets && (
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Recent Timesheets</h2>
          <Link href="/portal/timesheets" className="flex items-center gap-1 text-xs font-medium text-blue-600">
            View all <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="divide-y divide-gray-100">
          {contractor.timesheets.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-gray-500">No timesheets yet</p>
              <Link href="/portal/timesheets/new" className="mt-2 inline-block text-sm font-medium text-blue-600">
                Submit your first timesheet →
              </Link>
            </div>
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
                <StatusBadge value={ts.status} />
              </Link>
            ))
          )}
        </div>
      </div>
      )}

      {/* Compliance Alerts */}
      {expiringCompliance > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50">
          <div className="flex items-center justify-between border-b border-red-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-red-800">Compliance Alerts</h2>
            <Link href="/portal/compliance" className="flex items-center gap-1 text-xs font-medium text-red-600">
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-red-100">
            {contractor.compliances
              .filter((c) => c.status === "Expiring" || c.status === "Expired")
              .map((c) => (
                <div key={c.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-red-900">{c.type}</p>
                    <StatusBadge value={c.status} />
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
