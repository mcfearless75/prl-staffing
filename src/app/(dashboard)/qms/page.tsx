export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Shield, ClipboardCheck, BarChart3, AlertTriangle, Lightbulb, FileCheck, FolderOpen } from "lucide-react";

export default async function QMSPage() {
  const [ncrCount, auditCount, reviewCount, riskCount, improvementCount, openNCRs, overdueNCRs, highRisks, docCount] = await Promise.all([
    prisma.nonConformance.count(),
    prisma.internalAudit.count(),
    prisma.managementReview.count(),
    prisma.risk.count(),
    prisma.improvementItem.count(),
    prisma.nonConformance.count({ where: { status: { in: ["Open", "In Progress"] } } }),
    prisma.nonConformance.count({ where: { status: "Overdue" } }),
    prisma.risk.count({ where: { riskLevel: { in: ["High", "Critical"] } } }),
    prisma.qmsDocument.count(),
  ]);

  const modules = [
    {
      title: "Non-Conformance Register",
      description: "Log NCRs, corrective actions, root cause analysis, and evidence of closure",
      href: "/qms/ncr",
      icon: AlertTriangle,
      color: "bg-red-50 text-red-600 border-red-200",
      iconBg: "bg-red-100",
      stats: `${openNCRs} open${overdueNCRs > 0 ? ` · ${overdueNCRs} overdue` : ""} · ${ncrCount} total`,
    },
    {
      title: "Internal Audits",
      description: "Schedule audits, log findings, assign actions, track closure against ISO clauses",
      href: "/qms/audits",
      icon: ClipboardCheck,
      color: "bg-blue-50 text-blue-600 border-blue-200",
      iconBg: "bg-blue-100",
      stats: `${auditCount} audits recorded`,
    },
    {
      title: "Management Reviews",
      description: "Periodic reviews with auto-populated KPIs from PRISM data, minutes, and actions",
      href: "/qms/management-review",
      icon: BarChart3,
      color: "bg-purple-50 text-purple-600 border-purple-200",
      iconBg: "bg-purple-100",
      stats: `${reviewCount} reviews`,
    },
    {
      title: "Risk Register",
      description: "Formal risk register with likelihood × impact matrix, owners, and review dates",
      href: "/qms/risk-register",
      icon: Shield,
      color: "bg-orange-50 text-orange-600 border-orange-200",
      iconBg: "bg-orange-100",
      stats: `${highRisks} high/critical · ${riskCount} total risks`,
    },
    {
      title: "Continual Improvement",
      description: "Log improvement suggestions, track implementation, measure effectiveness",
      href: "/qms/improvements",
      icon: Lightbulb,
      color: "bg-emerald-50 text-emerald-600 border-emerald-200",
      iconBg: "bg-emerald-100",
      stats: `${improvementCount} items`,
    },
    {
      title: "Document Repository",
      description: "ISO 9001 controlled documents — manuals, procedures, templates, and records",
      href: "/qms/documents",
      icon: FolderOpen,
      color: "bg-cyan-50 text-cyan-600 border-cyan-200",
      iconBg: "bg-cyan-100",
      stats: `${docCount} documents`,
    },
    {
      title: "Quality Policy",
      description: "View quality policy and track staff acknowledgements",
      href: "/qms/policy",
      icon: FileCheck,
      color: "bg-gray-50 text-gray-600 border-gray-200",
      iconBg: "bg-gray-100",
      stats: "ISO 9001:2015",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Quality Management System" />
      <p className="text-sm text-gray-500">ISO 9001:2015 compliance management — non-conformances, audits, management reviews, risk register, and continual improvement.</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((mod) => (
          <Link
            key={mod.href}
            href={mod.href}
            className={`group rounded-xl border p-5 transition-all hover:shadow-md ${mod.color}`}
          >
            <div className="flex items-start gap-4">
              <div className={`rounded-lg p-2.5 ${mod.iconBg}`}>
                <mod.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold group-hover:underline">{mod.title}</h3>
                <p className="mt-1 text-xs opacity-80 leading-relaxed">{mod.description}</p>
                <p className="mt-2 text-xs font-medium opacity-60">{mod.stats}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Stats Bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">QMS Health Overview</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          <div className="text-center">
            <div className={`text-2xl font-bold ${openNCRs > 0 ? "text-red-600" : "text-emerald-600"}`}>{openNCRs}</div>
            <div className="text-xs text-gray-500">Open NCRs</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${overdueNCRs > 0 ? "text-red-600" : "text-emerald-600"}`}>{overdueNCRs}</div>
            <div className="text-xs text-gray-500">Overdue NCRs</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{auditCount}</div>
            <div className="text-xs text-gray-500">Audits</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{reviewCount}</div>
            <div className="text-xs text-gray-500">Reviews</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${highRisks > 0 ? "text-orange-600" : "text-emerald-600"}`}>{highRisks}</div>
            <div className="text-xs text-gray-500">High Risks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-600">{improvementCount}</div>
            <div className="text-xs text-gray-500">Improvements</div>
          </div>
        </div>
      </div>
    </div>
  );
}
