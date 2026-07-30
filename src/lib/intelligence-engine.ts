/**
 * PRL Intelligence Engine
 * Analyses all workforce data and generates actionable insights,
 * predictions, anomaly flags, and contractor matching scores.
 */

import { prisma } from "@/lib/db";
import { syncComplianceStatuses } from "@/lib/compliance-sync";
import {
  LIVE_ASSIGNMENT_STATUSES,
  IN_PROGRESS_ASSIGNMENT_STATUSES,
} from "@/lib/assignment-statuses";

// ─── Types ───

export interface Insight {
  id: string;
  category: "compliance" | "financial" | "workforce" | "operational";
  severity: "critical" | "warning" | "info" | "success";
  title: string;
  description: string;
  metric?: string;
  trend?: "up" | "down" | "stable";
  actionLabel?: string;
  actionHref?: string;
}

export interface ContractorMatch {
  contractorId: string;
  contractorName: string;
  jobTitle: string | null;
  score: number; // 0-100
  factors: { label: string; score: number; weight: number }[];
  chargeRate: number | null;
  status: string;
  ir35Status: string | null;
  complianceScore: number;
  availableFrom?: Date | null;
}

export interface RiskItem {
  id: string;
  category: "compliance" | "financial" | "staffing";
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  probability: number; // 0-100
  impact: string;
  dueDate?: Date;
  actionLabel?: string;
  actionHref?: string;
}

export interface Anomaly {
  id: string;
  type: "timesheet" | "billing" | "compliance" | "pattern";
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  detectedAt: Date;
  entityType: string;
  entityId?: string;
  entityHref?: string;
  dataPoints?: { label: string; value: string }[];
}

// ─── Workforce Intelligence Dashboard ───

export async function generateInsights(): Promise<Insight[]> {
  const insights: Insight[] = [];
  const now = new Date();
  const sevenDays = new Date(now.getTime() + 7 * 86400000);
  const thirtyDays = new Date(now.getTime() + 30 * 86400000);

  // Status (Verified/Expiring/Expired) is only ever updated when this runs —
  // without it, a record can sit at stale status "Verified" days after its
  // expiry date has entered the warning window, so the "expiring soon" alert
  // below and the compliance score would silently disagree with each other.
  await syncComplianceStatuses();

  // Compliance score matches the /compliance dashboard: scoped to
  // contractors currently on an active assignment, not the whole book.
  const assignedContractorIds = (
    await prisma.assignment.findMany({
      where: { status: { in: [...LIVE_ASSIGNMENT_STATUSES] } },
      select: { contractorId: true },
      distinct: ["contractorId"],
    })
  ).map((a) => a.contractorId);

  // Parallel data fetch
  const [
    totalContractors,
    activeContractors,
    activeAssignments,
    endingAssignments,
    expiringCompliance7d,
    expiredCompliance,
    pendingTimesheets,
    draftTimesheets,
    recentInvoices,
    overdueInvoices,
    totalComplianceRecords,
    verifiedCompliance,
    expiringCompliance30d,
    contractorsNoAssignment,
  ] = await Promise.all([
    prisma.contractor.count(),
    prisma.contractor.count({ where: { status: "Active" } }),
    prisma.assignment.count({ where: { status: "Active" } }),
    prisma.assignment.count({ where: { status: "Ending" } }),
    prisma.complianceRecord.count({
      where: { expiryDate: { gte: now, lte: sevenDays }, status: { not: "Expired" } },
    }),
    prisma.complianceRecord.count({ where: { status: "Expired" } }),
    prisma.timesheet.count({ where: { status: "Submitted" } }),
    prisma.timesheet.count({ where: { status: "Draft" } }),
    prisma.invoice.findMany({
      where: { createdAt: { gte: new Date(now.getTime() - 30 * 86400000) } },
      select: { total: true, status: true },
    }),
    prisma.invoice.count({
      where: {
        dueDate: { lt: now },
        status: { in: ["Approved", "Sent"] },
      },
    }),
    prisma.complianceRecord.count({ where: { contractorId: { in: assignedContractorIds } } }),
    prisma.complianceRecord.count({ where: { contractorId: { in: assignedContractorIds }, status: "Verified" } }),
    prisma.complianceRecord.count({
      where: { expiryDate: { gte: now, lte: thirtyDays }, status: { not: "Expired" } },
    }),
    prisma.contractor.count({
      where: {
        status: "Active",
        assignments: { none: { status: { in: ["Active", "Placed"] } } },
      },
    }),
  ]);

  // ── Compliance Insights ──

  if (expiringCompliance7d > 0) {
    insights.push({
      id: "comp-expiring-7d",
      category: "compliance",
      severity: "critical",
      title: `${expiringCompliance7d} compliance record${expiringCompliance7d > 1 ? "s" : ""} expiring within 7 days`,
      description: "These need immediate attention to avoid non-compliance. Contractors may need to be stood down if not renewed.",
      metric: `${expiringCompliance7d}`,
      trend: "up",
      actionLabel: "View expiring records",
      actionHref: "/compliance?status=Expiring",
    });
  }

  if (expiredCompliance > 0) {
    insights.push({
      id: "comp-expired",
      category: "compliance",
      severity: "critical",
      title: `${expiredCompliance} expired compliance record${expiredCompliance > 1 ? "s" : ""}`,
      description: "Contractors with expired records should not be working on site. Immediate action required.",
      metric: `${expiredCompliance}`,
      actionLabel: "View expired",
      actionHref: "/compliance?status=Expired",
    });
  }

  const complianceScore = totalComplianceRecords > 0
    ? Math.round((verifiedCompliance / totalComplianceRecords) * 100)
    : 0;

  // A record can be genuinely 97% verified and still have something
  // expiring in 3 days — both are true at once, but showing a green
  // "healthy" card right next to a critical "action needed" alert reads as
  // a straight contradiction. Only claim "healthy" when nothing else in
  // compliance is already flagged critical or warning this run.
  const hasUnresolvedComplianceIssue = insights.some(
    (i) => i.category === "compliance" && (i.severity === "critical" || i.severity === "warning")
  );

  if (complianceScore >= 90 && !hasUnresolvedComplianceIssue) {
    insights.push({
      id: "comp-score-good",
      category: "compliance",
      severity: "success",
      title: `Compliance score: ${complianceScore}%`,
      description: "Workforce compliance is healthy. Keep monitoring expiry dates.",
      metric: `${complianceScore}%`,
      trend: "stable",
    });
  } else if (complianceScore < 70) {
    insights.push({
      id: "comp-score-low",
      category: "compliance",
      severity: "warning",
      title: `Compliance score below target: ${complianceScore}%`,
      description: "Over 30% of compliance records are not verified. Review pending and expired records.",
      metric: `${complianceScore}%`,
      trend: "down",
      actionLabel: "Review compliance",
      actionHref: "/compliance",
    });
  }

  // ── Financial Insights ──

  const recentInvoiceTotal = recentInvoices.reduce((s, i) => s + i.total, 0);
  if (recentInvoiceTotal > 0) {
    insights.push({
      id: "fin-monthly-revenue",
      category: "financial",
      severity: "info",
      title: `£${Math.round(recentInvoiceTotal).toLocaleString()} invoiced in last 30 days`,
      description: `${recentInvoices.length} invoice${recentInvoices.length > 1 ? "s" : ""} generated this period.`,
      metric: `£${Math.round(recentInvoiceTotal).toLocaleString()}`,
      actionLabel: "View billing",
      actionHref: "/billing",
    });
  }

  if (overdueInvoices > 0) {
    insights.push({
      id: "fin-overdue",
      category: "financial",
      severity: "critical",
      title: `${overdueInvoices} overdue invoice${overdueInvoices > 1 ? "s" : ""}`,
      description: "Follow up with clients to collect outstanding payments.",
      metric: `${overdueInvoices}`,
      trend: "up",
      actionLabel: "View overdue",
      actionHref: "/billing?status=Sent",
    });
  }

  // ── Workforce Insights ──

  const utilizationRate = activeContractors > 0
    ? Math.round((activeAssignments / activeContractors) * 100)
    : 0;

  insights.push({
    id: "wf-utilization",
    category: "workforce",
    severity: utilizationRate < 50 ? "warning" : "info",
    title: `Workforce utilization: ${utilizationRate}%`,
    description: `${activeAssignments} active assignments across ${activeContractors} active contractors.`,
    metric: `${utilizationRate}%`,
    trend: utilizationRate < 50 ? "down" : "stable",
  });

  if (contractorsNoAssignment > 0) {
    insights.push({
      id: "wf-bench",
      category: "workforce",
      severity: contractorsNoAssignment > 10 ? "warning" : "info",
      title: `${contractorsNoAssignment} contractor${contractorsNoAssignment > 1 ? "s" : ""} on the bench`,
      description: "Active contractors without a current assignment. Consider matching them to open roles.",
      metric: `${contractorsNoAssignment}`,
      actionLabel: "Smart matching",
      actionHref: "/intelligence/matching",
    });
  }

  if (endingAssignments > 0) {
    insights.push({
      id: "wf-ending",
      category: "workforce",
      severity: "warning",
      title: `${endingAssignments} assignment${endingAssignments > 1 ? "s" : ""} ending soon`,
      description: "Plan for replacements or extensions to avoid staffing gaps.",
      metric: `${endingAssignments}`,
      actionLabel: "View ending",
      actionHref: "/assignments?status=Ending",
    });
  }

  // ── Operational Insights ──

  if (pendingTimesheets > 0) {
    insights.push({
      id: "ops-pending-ts",
      category: "operational",
      severity: pendingTimesheets > 5 ? "warning" : "info",
      title: `${pendingTimesheets} timesheet${pendingTimesheets > 1 ? "s" : ""} awaiting approval`,
      description: "Timesheets need to be approved before invoices can be generated.",
      metric: `${pendingTimesheets}`,
      actionLabel: "Review timesheets",
      actionHref: "/timesheets?status=Submitted",
    });
  }

  if (draftTimesheets > 5) {
    insights.push({
      id: "ops-draft-ts",
      category: "operational",
      severity: "info",
      title: `${draftTimesheets} draft timesheets not yet submitted`,
      description: "Chase contractors to submit their timesheets.",
      metric: `${draftTimesheets}`,
      actionLabel: "View drafts",
      actionHref: "/timesheets?status=Draft",
    });
  }

  // Sort by severity
  const severityOrder = { critical: 0, warning: 1, info: 2, success: 3 };
  insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return insights;
}

// ─── Smart Contractor Matching ───

export async function matchContractors(
  role: string,
  location?: string,
  companyId?: string,
  maxRate?: number
): Promise<ContractorMatch[]> {
  // Get all active contractors
  const contractors = await prisma.contractor.findMany({
    where: { status: "Active" },
    include: {
      assignments: {
        where: { status: { in: ["Active", "Placed"] } },
        include: { company: true },
      },
      compliances: true,
    },
  });

  const matches: ContractorMatch[] = [];

  for (const c of contractors) {
    const factors: { label: string; score: number; weight: number }[] = [];

    // 1. Role match (weight: 30)
    const roleScore = calculateRoleMatch(c.jobTitle || "", role);
    factors.push({ label: "Role Match", score: roleScore, weight: 30 });

    // 2. Availability (weight: 25)
    const isAvailable = c.assignments.length === 0;
    const availScore = isAvailable ? 100 : 20; // Available gets full score
    factors.push({ label: "Availability", score: availScore, weight: 25 });

    // 3. Compliance (weight: 20)
    const totalComp = c.compliances.length;
    const verifiedComp = c.compliances.filter((r) => r.status === "Verified").length;
    const compScore = totalComp > 0 ? Math.round((verifiedComp / totalComp) * 100) : 0;
    factors.push({ label: "Compliance", score: compScore, weight: 20 });

    // 4. Rate fit (weight: 15)
    let rateScore = 50; // neutral default
    if (maxRate && c.chargeRate) {
      if (c.chargeRate <= maxRate) {
        rateScore = 100;
      } else if (c.chargeRate <= maxRate * 1.2) {
        rateScore = 60;
      } else {
        rateScore = 20;
      }
    } else if (c.chargeRate) {
      rateScore = 70;
    }
    factors.push({ label: "Rate Fit", score: rateScore, weight: 15 });

    // 5. Location match (weight: 10)
    let locationScore = 50;
    if (location && c.assignments.length > 0) {
      const hasLocationMatch = c.assignments.some(
        (a) => a.location?.toLowerCase().includes(location.toLowerCase())
      );
      locationScore = hasLocationMatch ? 90 : 40;
    }
    factors.push({ label: "Location", score: locationScore, weight: 10 });

    // Calculate weighted total
    const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
    const weightedScore = Math.round(
      factors.reduce((s, f) => s + (f.score * f.weight) / totalWeight, 0)
    );

    matches.push({
      contractorId: c.id,
      contractorName: `${c.firstName} ${c.lastName}`,
      jobTitle: c.jobTitle,
      score: weightedScore,
      factors,
      chargeRate: c.chargeRate,
      status: c.status,
      ir35Status: c.ir35Status,
      complianceScore: compScore,
      availableFrom: isAvailable ? null : c.assignments[0]?.endDate,
    });
  }

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score);

  return matches.slice(0, 20);
}

function calculateRoleMatch(contractorRole: string, targetRole: string): number {
  if (!contractorRole || !targetRole) return 30;

  const a = contractorRole.toLowerCase().trim();
  const b = targetRole.toLowerCase().trim();

  // Exact match
  if (a === b) return 100;

  // Contains match
  if (a.includes(b) || b.includes(a)) return 85;

  // Word overlap
  const aWords = new Set(a.split(/[\s,\-\/]+/));
  const bWords = new Set(b.split(/[\s,\-\/]+/));
  const common = [...aWords].filter((w) => bWords.has(w) && w.length > 2);
  if (common.length > 0) {
    return Math.min(70, 40 + common.length * 15);
  }

  // Trade group matching
  const tradeGroups: Record<string, string[]> = {
    electrical: ["electrician", "electrical", "sparks", "18th edition", "jib"],
    plumbing: ["plumber", "plumbing", "pipefitter", "gas"],
    carpentry: ["carpenter", "joiner", "woodwork", "formwork"],
    general: ["labourer", "general operative", "cscs", "groundwork"],
    management: ["manager", "supervisor", "foreman", "lead"],
    engineering: ["engineer", "engineering", "mechanical", "civil"],
  };

  for (const [, terms] of Object.entries(tradeGroups)) {
    const aMatch = terms.some((t) => a.includes(t));
    const bMatch = terms.some((t) => b.includes(t));
    if (aMatch && bMatch) return 65;
  }

  return 20;
}

// ─── Predictive Risk Engine ───

export async function assessRisks(): Promise<RiskItem[]> {
  const risks: RiskItem[] = [];
  const now = new Date();

  // Keeps status (Expired/Expiring) current before reading it below.
  await syncComplianceStatuses();

  // Get data
  const [
    expiringRecords,
    endingAssignments,
    overdueInvoices,
    activeAssignments,
    contractors,
  ] = await Promise.all([
    prisma.complianceRecord.findMany({
      where: {
        expiryDate: { gte: now, lte: new Date(now.getTime() + 60 * 86400000) },
        status: { not: "Expired" },
      },
      include: { contractor: true },
      orderBy: { expiryDate: "asc" },
    }),
    prisma.assignment.findMany({
      where: {
        status: { in: [...IN_PROGRESS_ASSIGNMENT_STATUSES] },
        endDate: { gte: now, lte: new Date(now.getTime() + 30 * 86400000) },
      },
      include: { contractor: true, company: true },
      orderBy: { endDate: "asc" },
    }),
    prisma.invoice.findMany({
      where: {
        dueDate: { lt: now },
        status: { in: ["Approved", "Sent"] },
      },
      include: { company: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.assignment.count({ where: { status: "Active" } }),
    prisma.contractor.count({ where: { status: "Active" } }),
  ]);

  // Compliance risks
  for (const record of expiringRecords.slice(0, 10)) {
    const daysUntil = Math.ceil(
      (record.expiryDate!.getTime() - now.getTime()) / 86400000
    );
    risks.push({
      id: `comp-${record.id}`,
      category: "compliance",
      severity: daysUntil <= 7 ? "critical" : daysUntil <= 14 ? "high" : "medium",
      title: `${record.contractor.firstName} ${record.contractor.lastName} — ${record.type} expiring`,
      description: `Expires in ${daysUntil} day${daysUntil !== 1 ? "s" : ""} (${record.expiryDate!.toLocaleDateString("en-GB")}). Renewal needed.`,
      probability: daysUntil <= 7 ? 95 : daysUntil <= 14 ? 75 : 50,
      impact: "Contractor may need to be stood down",
      dueDate: record.expiryDate!,
      actionLabel: "View record",
      actionHref: `/compliance/${record.id}`,
    });
  }

  // Staffing risks
  for (const assignment of endingAssignments.slice(0, 10)) {
    const daysUntil = assignment.endDate
      ? Math.ceil((assignment.endDate.getTime() - now.getTime()) / 86400000)
      : 0;
    risks.push({
      id: `staff-${assignment.id}`,
      category: "staffing",
      severity: daysUntil <= 7 ? "high" : "medium",
      title: `${assignment.contractor.firstName} ${assignment.contractor.lastName} — assignment ending at ${assignment.company.name}`,
      description: `${assignment.role} role ends in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}. Plan replacement or extension.`,
      probability: 70,
      impact: "Client site may be understaffed",
      dueDate: assignment.endDate || undefined,
      actionLabel: "View assignment",
      actionHref: `/assignments/${assignment.id}`,
    });
  }

  // Financial risks
  for (const invoice of overdueInvoices.slice(0, 5)) {
    const daysOverdue = Math.ceil(
      (now.getTime() - invoice.dueDate!.getTime()) / 86400000
    );
    risks.push({
      id: `fin-${invoice.id}`,
      category: "financial",
      severity: daysOverdue > 30 ? "critical" : daysOverdue > 14 ? "high" : "medium",
      title: `${invoice.invoiceNumber} — £${invoice.total.toLocaleString()} overdue from ${invoice.company.name}`,
      description: `${daysOverdue} days overdue. Due date was ${invoice.dueDate!.toLocaleDateString("en-GB")}.`,
      probability: 90,
      impact: "Cash flow impact",
      dueDate: invoice.dueDate!,
      actionLabel: "View invoice",
      actionHref: `/billing/${invoice.id}`,
    });
  }

  // Utilization risk
  if (contractors > 0 && activeAssignments / contractors < 0.5) {
    risks.push({
      id: "util-low",
      category: "staffing",
      severity: "medium",
      title: "Low workforce utilization",
      description: `Only ${Math.round((activeAssignments / contractors) * 100)}% of contractors have active assignments. Consider business development.`,
      probability: 80,
      impact: "Revenue opportunity cost",
      actionLabel: "Contractor matching",
      actionHref: "/intelligence/matching",
    });
  }

  // Sort by severity
  const sevOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  risks.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);

  return risks;
}

// ─── Anomaly Detection ───

export async function detectAnomalies(): Promise<Anomaly[]> {
  const anomalies: Anomaly[] = [];
  const now = new Date();

  // Without this, check #6 below (active contractor, expired compliance)
  // filters on status: "Expired" directly — a record whose expiry date has
  // passed but whose status hasn't been synced yet would be silently missed.
  await syncComplianceStatuses();

  // Get recent timesheets for analysis
  const recentTimesheets = await prisma.timesheet.findMany({
    where: {
      weekStarting: { gte: new Date(now.getTime() - 90 * 86400000) },
    },
    include: {
      contractor: true,
      entries: true,
      assignment: { include: { company: true } },
    },
    orderBy: { weekStarting: "desc" },
  });

  // 1. Excessive hours detection (>60h/week)
  for (const ts of recentTimesheets) {
    if (ts.totalHours > 60) {
      anomalies.push({
        id: `ts-excessive-${ts.id}`,
        type: "timesheet",
        severity: ts.totalHours > 80 ? "critical" : "warning",
        title: `Excessive hours: ${ts.totalHours}h in one week`,
        description: `${ts.contractor.firstName} ${ts.contractor.lastName} logged ${ts.totalHours}h for week of ${ts.weekStarting.toLocaleDateString("en-GB")}. Working Time Regulations limit is 48h average.`,
        detectedAt: now,
        entityType: "Timesheet",
        entityId: ts.id,
        entityHref: `/timesheets/${ts.id}`,
        dataPoints: [
          { label: "Total Hours", value: `${ts.totalHours}h` },
          { label: "Overtime", value: `${ts.overtimeHours}h` },
          { label: "Contractor", value: `${ts.contractor.firstName} ${ts.contractor.lastName}` },
        ],
      });
    }
  }

  // 2. Zero-hour submitted timesheets
  for (const ts of recentTimesheets) {
    if (ts.totalHours === 0 && ts.status !== "Draft") {
      anomalies.push({
        id: `ts-zero-${ts.id}`,
        type: "timesheet",
        severity: "warning",
        title: `Zero hours submitted`,
        description: `${ts.contractor.firstName} ${ts.contractor.lastName} submitted a timesheet with 0 hours for ${ts.weekStarting.toLocaleDateString("en-GB")}.`,
        detectedAt: now,
        entityType: "Timesheet",
        entityId: ts.id,
        entityHref: `/timesheets/${ts.id}`,
      });
    }
  }

  // 3. Duplicate timesheet detection (same contractor, same week)
  const tsMap = new Map<string, typeof recentTimesheets>();
  for (const ts of recentTimesheets) {
    const key = `${ts.contractorId}-${ts.weekStarting.toISOString().slice(0, 10)}`;
    if (!tsMap.has(key)) tsMap.set(key, []);
    tsMap.get(key)!.push(ts);
  }
  for (const [, group] of tsMap) {
    if (group.length > 1) {
      anomalies.push({
        id: `ts-dup-${group[0].id}`,
        type: "timesheet",
        severity: "critical",
        title: `Duplicate timesheets detected`,
        description: `${group[0].contractor.firstName} ${group[0].contractor.lastName} has ${group.length} timesheets for the same week (${group[0].weekStarting.toLocaleDateString("en-GB")}).`,
        detectedAt: now,
        entityType: "Timesheet",
        entityId: group[0].id,
        entityHref: `/timesheets/${group[0].id}`,
        dataPoints: group.map((t, i) => ({
          label: `Timesheet ${i + 1}`,
          value: `${t.totalHours}h (${t.status})`,
        })),
      });
    }
  }

  // 4. Sudden hours spike (>50% increase from contractor's average)
  const contractorAvgs = new Map<string, { total: number; count: number; name: string }>();
  for (const ts of recentTimesheets) {
    if (ts.totalHours === 0) continue;
    const key = ts.contractorId;
    if (!contractorAvgs.has(key)) {
      contractorAvgs.set(key, {
        total: 0,
        count: 0,
        name: `${ts.contractor.firstName} ${ts.contractor.lastName}`,
      });
    }
    const avg = contractorAvgs.get(key)!;
    avg.total += ts.totalHours;
    avg.count += 1;
  }

  for (const ts of recentTimesheets.slice(0, 20)) {
    if (ts.totalHours === 0) continue;
    const avg = contractorAvgs.get(ts.contractorId);
    if (!avg || avg.count < 3) continue;
    const avgHours = avg.total / avg.count;
    if (ts.totalHours > avgHours * 1.5 && ts.totalHours > 45) {
      anomalies.push({
        id: `ts-spike-${ts.id}`,
        type: "pattern",
        severity: "warning",
        title: `Hours spike: ${Math.round((ts.totalHours / avgHours - 1) * 100)}% above average`,
        description: `${ts.contractor.firstName} ${ts.contractor.lastName} logged ${ts.totalHours}h vs their average of ${avgHours.toFixed(1)}h.`,
        detectedAt: now,
        entityType: "Timesheet",
        entityId: ts.id,
        entityHref: `/timesheets/${ts.id}`,
        dataPoints: [
          { label: "This Week", value: `${ts.totalHours}h` },
          { label: "Average", value: `${avgHours.toFixed(1)}h` },
          { label: "Variance", value: `+${Math.round((ts.totalHours / avgHours - 1) * 100)}%` },
        ],
      });
    }
  }

  // 5. Billing anomalies - invoices with no PO
  const unmatched = await prisma.invoice.findMany({
    where: { matchStatus: "Unmatched", status: { not: "Draft" } },
    include: { company: true },
    take: 5,
  });
  for (const inv of unmatched) {
    anomalies.push({
      id: `inv-nomatch-${inv.id}`,
      type: "billing",
      severity: "warning",
      title: `Invoice ${inv.invoiceNumber} — no PO match`,
      description: `£${inv.total.toLocaleString()} invoice to ${inv.company.name} has no purchase order linked. Three-way matching incomplete.`,
      detectedAt: now,
      entityType: "Invoice",
      entityId: inv.id,
      entityHref: `/billing/${inv.id}`,
    });
  }

  // 6. Compliance gap — active contractors with expired records
  const expiredActive = await prisma.complianceRecord.findMany({
    where: {
      status: "Expired",
      contractor: {
        status: "Active",
        assignments: { some: { status: "Active" } },
      },
    },
    include: { contractor: true },
    take: 10,
  });
  for (const rec of expiredActive) {
    anomalies.push({
      id: `comp-active-expired-${rec.id}`,
      type: "compliance",
      severity: "critical",
      title: `Active contractor with expired ${rec.type}`,
      description: `${rec.contractor.firstName} ${rec.contractor.lastName} is on an active assignment but their ${rec.type} has expired.`,
      detectedAt: now,
      entityType: "Compliance",
      entityId: rec.id,
      entityHref: `/compliance/${rec.id}`,
    });
  }

  // Sort by severity
  const sevOrder = { critical: 0, warning: 1, info: 2 };
  anomalies.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);

  return anomalies;
}
