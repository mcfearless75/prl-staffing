export const dynamic = "force-dynamic";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import {
  ArrowRight,
  Download,
  FileSpreadsheet,
  ShieldAlert,
  FileX,
  Receipt,
  TrendingUp,
  ClipboardCheck,
  Landmark,
  Users2,
  FileStack,
} from "lucide-react";
import { getRedeploymentReport } from "@/app/api/reports/_lib/redeployment";
import { getReconciliationReport } from "@/app/api/reports/_lib/reconciliation";

interface ReportTile {
  title: string;
  description: string;
  href: string;
  actionLabel: string;
  icon: typeof Download;
  color: string;
  iconBg: string;
  count?: number;
  countLabel?: string;
  openInNewTab?: boolean;
}

export default async function ReportsHubPage() {
  const [redeploymentRows, reconciliationRows] = await Promise.all([
    getRedeploymentReport(),
    getReconciliationReport(),
  ]);

  const flaggedInvoices = reconciliationRows.filter((r) => r.flag === "Unreconciled").length;

  const tiles: ReportTile[] = [
    {
      title: "Training & Expiry Matrix",
      description: "CSCS, DBS, Right to Work, Insurance, IR35 and qualification status by contractor.",
      href: "/api/qms-reports/training-matrix",
      actionLabel: "Download CSV",
      icon: FileSpreadsheet,
      color: "bg-blue-50 text-blue-600 border-blue-200",
      iconBg: "bg-blue-100",
    },
    {
      title: "Compliance Gap Report",
      description: "Per-contractor breakdown of missing, pending and verified compliance documents.",
      href: "/api/compliance/gap-report",
      actionLabel: "Open",
      icon: ShieldAlert,
      color: "bg-amber-50 text-amber-600 border-amber-200",
      iconBg: "bg-amber-100",
      openInNewTab: true,
    },
    {
      title: "No-Records Export",
      description: "Contractors with zero compliance records on file — the highest-risk gaps first.",
      href: "/api/admin/compliance-no-records-export",
      actionLabel: "Download CSV",
      icon: FileX,
      color: "bg-red-50 text-red-600 border-red-200",
      iconBg: "bg-red-100",
    },
    {
      title: "Sage Export",
      description: "Export an approved invoice in Sage 50/200 import format from the invoice detail page.",
      href: "/billing",
      actionLabel: "Open Billing",
      icon: Receipt,
      color: "bg-emerald-50 text-emerald-600 border-emerald-200",
      iconBg: "bg-emerald-100",
    },
    {
      title: "Rates Export",
      description: "Full rate card — pay, charge, margin and effective dates — as CSV.",
      href: "/api/rates/export",
      actionLabel: "Download CSV",
      icon: TrendingUp,
      color: "bg-purple-50 text-purple-600 border-purple-200",
      iconBg: "bg-purple-100",
    },
    {
      title: "AWR Report",
      description: "12-week parity flags — comparator pay vs charge across rate cards.",
      href: "/awr",
      actionLabel: "Open",
      icon: ClipboardCheck,
      color: "bg-cyan-50 text-cyan-600 border-cyan-200",
      iconBg: "bg-cyan-100",
    },
    {
      title: "Aged Debt",
      description: "Outstanding invoice ageing by company — 30/60/90+ day buckets.",
      href: "/billing/aged",
      actionLabel: "Open",
      icon: Landmark,
      color: "bg-orange-50 text-orange-600 border-orange-200",
      iconBg: "bg-orange-100",
    },
    {
      title: "Redeployment",
      description: "Contractors ending, or already ended, with no onward assignment booked.",
      href: "/api/reports/redeployment?format=csv",
      actionLabel: "Download CSV",
      icon: Users2,
      color: "bg-indigo-50 text-indigo-600 border-indigo-200",
      iconBg: "bg-indigo-100",
      count: redeploymentRows.length,
      countLabel: "contractors need redeployment",
    },
    {
      title: "Reconciliation",
      description: "Invoices flagged unreconciled — orphan lines or a totals mismatch.",
      href: "/api/reports/reconciliation?format=csv",
      actionLabel: "Download CSV",
      icon: FileStack,
      color: "bg-rose-50 text-rose-600 border-rose-200",
      iconBg: "bg-rose-100",
      count: flaggedInvoices,
      countLabel: "invoices flagged",
    },
    {
      title: "QMS Reports",
      description: "Master document index, customer feedback surveys and supplier questionnaires.",
      href: "/qms/reports",
      actionLabel: "Open",
      icon: FileStack,
      color: "bg-teal-50 text-teal-600 border-teal-200",
      iconBg: "bg-teal-100",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Every export and live report in one place" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {tiles.map((tile) => (
          <div key={tile.title} className={`rounded-xl border p-6 transition-all ${tile.color}`}>
            <div className="flex items-start gap-4">
              <div className={`rounded-lg p-2.5 ${tile.iconBg}`}>
                <tile.icon className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold">{tile.title}</h3>
                <p className="mt-1 text-xs leading-relaxed opacity-80">{tile.description}</p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <div>
                {tile.count !== undefined ? (
                  <>
                    <p className="text-3xl font-bold">{tile.count}</p>
                    <p className="text-xs opacity-60">{tile.countLabel}</p>
                  </>
                ) : (
                  <span className="text-xs opacity-60">&nbsp;</span>
                )}
              </div>
              <Link
                href={tile.href}
                target={tile.openInNewTab ? "_blank" : undefined}
                rel={tile.openInNewTab ? "noopener noreferrer" : undefined}
                className="inline-flex items-center gap-2 rounded-lg bg-white/80 px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-white"
              >
                {tile.actionLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
