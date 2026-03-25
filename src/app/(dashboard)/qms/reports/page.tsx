export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Users, Building2, FileText, ArrowRight, Star, ClipboardList } from "lucide-react";

export default async function ReportsHubPage() {
  const [contractorCount, supplierCount, documentCount, surveyCount, questionnaireCount] = await Promise.all([
    prisma.contractor.count({ where: { status: "Active" } }),
    prisma.supplier.count(),
    prisma.qmsDocument.count(),
    prisma.activityLog.count({ where: { action: "SURVEY" } }),
    prisma.activityLog.count({ where: { action: "SUPPLIER_QUESTIONNAIRE" } }),
  ]);

  const reports = [
    {
      title: "Training Matrix",
      description:
        "Compliance overview for all contractors — CSCS, DBS, Right to Work, Insurance, IR35, Qualifications, and Passport status at a glance.",
      href: "/qms/reports/training-matrix",
      icon: Users,
      color: "bg-blue-50 text-blue-600 border-blue-200",
      iconBg: "bg-blue-100",
      count: contractorCount,
      countLabel: "active contractors",
    },
    {
      title: "Approved Supplier Index",
      description:
        "ISO-formatted register of all approved suppliers with tier classification, performance scores, and review dates.",
      href: "/qms/reports/supplier-index",
      icon: Building2,
      color: "bg-purple-50 text-purple-600 border-purple-200",
      iconBg: "bg-purple-100",
      count: supplierCount,
      countLabel: "suppliers",
    },
    {
      title: "Master Document Index",
      description:
        "Complete index of all QMS documents grouped by folder — document references, versions, types, and upload history.",
      href: "/qms/reports/document-index",
      icon: FileText,
      color: "bg-emerald-50 text-emerald-600 border-emerald-200",
      iconBg: "bg-emerald-100",
      count: documentCount,
      countLabel: "documents",
    },
    {
      title: "Customer Feedback",
      description:
        "Customer satisfaction survey responses — star ratings, recommendation rates, and detailed comments from clients.",
      href: "/qms/reports/customer-feedback",
      icon: Star,
      color: "bg-yellow-50 text-yellow-600 border-yellow-200",
      iconBg: "bg-yellow-100",
      count: surveyCount,
      countLabel: "responses",
    },
    {
      title: "Supplier Questionnaires",
      description:
        "Submitted supplier pre-qualification questionnaires — company details, certifications, insurance, and trade references.",
      href: "/qms/reports/supplier-questionnaires",
      icon: ClipboardList,
      color: "bg-cyan-50 text-cyan-600 border-cyan-200",
      iconBg: "bg-cyan-100",
      count: questionnaireCount,
      countLabel: "submissions",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="QMS Reports"
        description="Auto-generated reports for ISO 9001 compliance and management review"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {reports.map((report) => (
          <div
            key={report.href}
            className={`rounded-xl border p-6 transition-all ${report.color}`}
          >
            <div className="flex items-start gap-4">
              <div className={`rounded-lg p-2.5 ${report.iconBg}`}>
                <report.icon className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold">{report.title}</h3>
                <p className="mt-1 text-xs opacity-80 leading-relaxed">
                  {report.description}
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{report.count}</p>
                <p className="text-xs opacity-60">{report.countLabel}</p>
              </div>
              <Link
                href={report.href}
                className="inline-flex items-center gap-2 rounded-lg bg-white/80 px-4 py-2 text-sm font-medium shadow-sm hover:bg-white transition-colors"
              >
                Generate Report
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
