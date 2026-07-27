export interface HelpTopic {
  slug: string;
  title: string;
  /** Path prefixes that should surface this topic in the floating help button. Longest match wins. */
  match: string[];
  /** Substrings that must appear anywhere in the path — for nested routes like /contractors/[id]/ir35 that a prefix can't express. Takes priority over prefix matches. */
  includes?: string[];
  summary: string;
  tips?: string[];
}

export interface HelpSection {
  section: string;
  topics: HelpTopic[];
}

export const HELP_CONTENT: HelpSection[] = [
  {
    section: "Dashboard & Overview",
    topics: [
      {
        slug: "dashboard",
        title: "Dashboard",
        match: ["/"],
        summary:
          "Your landing page. Headline counts (subcontractors, assignments, timesheets, compliance alerts), the workforce compliance score, and a \"needs attention\" panel for anything waiting on you.",
        tips: [
          "The compliance score only counts subcontractors currently on an active assignment — people between jobs don't drag it down.",
          "Click any card to jump straight to that filtered list.",
        ],
      },
    ],
  },
  {
    section: "AI Assistant",
    topics: [
      {
        slug: "ai-assistant",
        title: "AI Assistant",
        match: ["/ai"],
        summary:
          "A chat window powered by Claude for drafting emails, checking a point of law, or a second opinion on wording.",
        tips: [
          "It does not read PRISM's own data — it only knows what you type into that chat.",
          "Never paste a contractor's name, NI number, or medical details into it.",
        ],
      },
    ],
  },
  {
    section: "Intelligence",
    topics: [
      {
        slug: "intelligence-hub",
        title: "Intelligence Hub",
        match: ["/intelligence"],
        summary:
          "A health-check dashboard — compliance, financial, workforce, and operational alerts, each linking to the relevant list.",
        tips: [
          "Labelled \"AI-powered\" but it's really a rules engine checking fixed thresholds against live data — reliable, just not machine learning.",
        ],
      },
      {
        slug: "smart-matching",
        title: "Smart Matching",
        match: ["/intelligence/matching"],
        summary:
          "Search by role, location, and max rate to get a ranked shortlist of available contractors, scored on fit, availability, compliance, rate, and location.",
      },
      {
        slug: "risk-engine",
        title: "Risk Engine",
        match: ["/intelligence/risk"],
        summary:
          "Forward-looking list of expiring compliance, assignments ending with nothing booked, and overdue invoices.",
        tips: ["The \"probability %\" shown is a fixed number per severity band, not a calculated statistic."],
      },
      {
        slug: "anomalies",
        title: "Anomalies",
        match: ["/intelligence/anomalies"],
        summary:
          "Six automated checks over real data: excessive hours, zero-hour submissions, duplicate timesheets, unusual hour spikes, invoices with no PO, and active contractors with expired compliance.",
      },
      {
        slug: "coverage-map",
        title: "Coverage Map",
        match: ["/intelligence/map"],
        summary:
          "Plots subcontractors and client sites on a map so you can see workforce coverage at a glance — built for planning the Scotland expansion.",
        tips: [
          "Click \"Map Missing Records\" if someone with a postcode isn't showing up — it geocodes anyone new since the last run.",
          "It's a visual plot only — there's no automatic \"nearest contractor to this site\" calculation yet.",
        ],
      },
    ],
  },
  {
    section: "Campaign, Applicants & Onboarding",
    topics: [
      {
        slug: "campaign",
        title: "Campaign",
        match: ["/campaign"],
        summary:
          "Chase contractors by email to sign up and complete their profile/documents — bulk sends or one person at a time.",
        tips: ["Every send shows exactly who will receive it before it fires — check the count looks right before confirming."],
      },
      {
        slug: "applicants",
        title: "Applicants",
        match: ["/applicants"],
        summary: "Triage people who've applied to work with PRL — Approve, mark as Looking, or Reject.",
      },
      {
        slug: "onboarding",
        title: "Onboarding",
        match: ["/onboarding"],
        summary:
          "The public form new subcontractors/suppliers fill in lands here for review. Approving a submission is what actually creates their contractor record and portal login.",
        tips: ["Nothing happens automatically when someone submits the public form — it just waits here until you approve it."],
      },
    ],
  },
  {
    section: "Subcontractors",
    topics: [
      {
        slug: "subcontractors",
        title: "Subcontractors",
        match: ["/contractors"],
        summary: "The core record for every worker PRL places — personal details, compliance, assignments, pay/charge rates.",
        tips: [
          "Use Import for a spreadsheet of new starters (Name + Email columns) — duplicates are skipped automatically.",
          "The Bulk Upload tool on a contractor's Comps & Certs tab lets you drop a whole batch of documents at once and guesses the type from the filename.",
          "A contractor's compliance badge is always calculated from their actual documents — it can't be manually overridden.",
        ],
      },
      {
        slug: "ir35",
        title: "IR35 Assessment",
        match: [],
        includes: ["/ir35"],
        summary: "A 10-question weighted questionnaire producing an Inside/Outside/TBD determination.",
        tips: ["This is guidance only, not legal advice — for anything borderline, check with HMRC's CEST tool or a specialist."],
      },
    ],
  },
  {
    section: "Clients & Sites",
    topics: [
      {
        slug: "clients",
        title: "Clients",
        match: ["/companies"],
        summary: "The businesses PRL supplies labour to. Each client has Sites, each site can have Departments.",
        tips: [
          "Inactive clients are hidden by default — use the toggle if you need to see everyone.",
          "The postcode lookup on the add/edit form is a metered service — keep an eye on the remaining-lookups counter shown on screen.",
        ],
      },
    ],
  },
  {
    section: "Projects",
    topics: [
      {
        slug: "projects",
        title: "Projects",
        match: ["/projects"],
        summary:
          "Tracks discrete work packages/contracts that assignments can link to. Currently hidden from the main menu but still fully working at this address.",
        tips: ["Check Billing → Spend for actual invoiced totals against a project."],
      },
    ],
  },
  {
    section: "Assignments",
    topics: [
      {
        slug: "assignments",
        title: "Assignments",
        match: ["/assignments"],
        summary: "Where you place a subcontractor with a client (and optionally a site/department/project) at agreed rates.",
        tips: [
          "You can't save an assignment as Placed/Active if the contractor is missing mandatory compliance for that role — you'll need to tick an override and give a reason, which is logged.",
          "AWR (Agency Workers Regulations) isn't clutter — it's a legal 12-week equal-pay clock. Leave it alone unless you're sure it doesn't apply.",
        ],
      },
    ],
  },
  {
    section: "Timesheets",
    topics: [
      {
        slug: "timesheets",
        title: "Timesheets",
        match: ["/timesheets"],
        summary: "The staff list of every timesheet, grouped by week. Standard weeks under 40h auto-approve; anything else needs sign-off.",
        tips: [
          "If you reject or correct a day, the system does NOT message the contractor automatically — worth giving them a call or a message directly so it doesn't come as a surprise on payday.",
          "You can't approve a timesheet while a day on it is still flagged Rejected — fix or clear the flag first.",
          "Weeks are labelled by week-ending date, matching how PRL actually works.",
        ],
      },
      {
        slug: "approval-chains",
        title: "Approval Chains",
        match: ["/timesheets/approval-chains"],
        summary: "Configure who has to sign off a client's timesheets, and in what order.",
      },
      {
        slug: "timesheet-chase",
        title: "Timesheet Chase",
        match: ["/timesheets/chase"],
        summary: "Finds contractors with a missing timesheet in the last 4 weeks and sends them a reminder email.",
      },
      {
        slug: "pay-queries",
        title: "Pay Queries",
        match: ["/payment-queries"],
        summary: "Where a subcontractor's pay dispute lands after they submit one from the portal.",
        tips: ["Resolving or closing a query doesn't notify the contractor automatically — let them know directly once it's sorted."],
      },
    ],
  },
  {
    section: "Billing",
    topics: [
      {
        slug: "billing",
        title: "Billing",
        match: ["/billing"],
        summary: "The full invoice list — status, totals, and three-way match indicator.",
      },
      {
        slug: "generate-invoices",
        title: "Generate Invoices",
        match: ["/billing/generate"],
        summary: "Turns approved timesheets into draft invoices, grouped by client, overtime billed at 1.5×.",
        tips: [
          "Check the Unbilled Approved Hours table before generating — anything flagged amber has no charge rate set and will bill at £0 if you don't fix it first.",
          "Only Approved timesheets get picked up — Draft/Submitted/Rejected never bill.",
        ],
      },
      {
        slug: "invoice-detail-sage",
        title: "Invoice Detail & Sage Export",
        match: ["/billing/"],
        summary: "Every invoice line, payments, credit notes, and the Export for Sage button.",
        tips: [
          "Sage export is per-invoice by design — open the invoice you want, then click Export for Sage. There's no single \"export everything\" button.",
          "The exported CSV is formatted for Sage 50/200's own import spec — download it and import it directly.",
        ],
      },
      {
        slug: "aged-debt",
        title: "Aged Debt",
        match: ["/billing/aged"],
        summary: "What's owed and how overdue it is, bucketed by days past due.",
      },
      {
        slug: "credit-notes",
        title: "Credit Notes",
        match: ["/billing/credit-notes"],
        summary: "Record an adjustment/reduction against an already-generated invoice.",
      },
      {
        slug: "import-payments",
        title: "Import Payments",
        match: ["/billing/payments-import"],
        summary: "Bulk-record payments from a bank statement or remittance CSV.",
        tips: ["Safe to re-upload the same file twice — duplicate payments are automatically skipped."],
      },
      {
        slug: "spend-dashboard",
        title: "Spend Dashboard",
        match: ["/billing/spend"],
        summary: "Read-only analytics — total/paid/outstanding spend, by client and by project.",
      },
    ],
  },
  {
    section: "Compliance",
    topics: [
      {
        slug: "compliance-dashboard",
        title: "Compliance Dashboard",
        match: ["/compliance"],
        summary: "The command centre — score, summary cards, per-document-type coverage, and chase lists.",
        tips: [
          "The score only counts subcontractors currently on an active assignment — the \"whole book\" number is shown smaller alongside it for reference.",
          "Click any of the five summary cards to jump straight to that filtered list.",
          "\"Bulk Verify\" approves every pending document in one click without opening them — use it for genuinely low-risk batches, not as a default habit.",
        ],
      },
      {
        slug: "compliance-review",
        title: "Review Queue",
        match: ["/compliance/review"],
        summary: "Every document waiting for you to check and approve, oldest first.",
      },
      {
        slug: "compliance-expiry",
        title: "Expiry Report",
        match: ["/compliance/expiry"],
        summary: "Everything expiring in the next 90 days, split into Overdue / within 30 days / within 90 days.",
      },
      {
        slug: "compliance-requirements",
        title: "Requirements / Checklists",
        match: ["/compliance/requirements"],
        summary: "The rules for which documents are mandatory for which roles and clients — this drives the automatic gap list.",
      },
      {
        slug: "compliance-gap-report",
        title: "Compliance Gap Report",
        match: ["/compliance/gap-report"],
        summary: "A per-contractor checklist against 4 core documents (CV, CSCS, CCNSG, Passport).",
        tips: ["Uses a slightly different \"active\" definition than the main dashboard — don't be surprised if the numbers don't match exactly."],
      },
      {
        slug: "compliance-new",
        title: "Add / Upload a Compliance Record",
        match: ["/compliance/new"],
        summary: "Manually log a document you've checked, or upload one on a contractor's behalf.",
        tips: ["You can paste an image straight from WhatsApp or Outlook (Ctrl+V) — no need to save it to disk first."],
      },
    ],
  },
  {
    section: "Rates",
    topics: [
      {
        slug: "rates",
        title: "Rates",
        match: ["/rates"],
        summary: "The rate card driving what PRL pays and what it charges.",
        tips: ["\"Agency Markup\" is PRL's own margin (Charge = Pay + Markup) — the client only ever sees the Charge figure, never this breakdown."],
      },
    ],
  },
  {
    section: "Job Roles",
    topics: [
      {
        slug: "job-roles",
        title: "Job Roles",
        match: ["/job-roles"],
        summary: "The shared list of job titles/trades so they stay consistent across the system.",
        tips: ["Archiving a role removes it from new selections but doesn't affect anyone already tagged with it."],
      },
    ],
  },
  {
    section: "Reports",
    topics: [
      {
        slug: "reports",
        title: "Reports Hub",
        match: ["/reports"],
        summary: "Ten report tiles — Training Matrix, Compliance Gap, No-Records, Sage Export, Rates, AWR, Aged Debt, Redeployment, Reconciliation, QMS.",
        tips: ["The Sage Export tile links to Billing, not a direct download — the actual export is per-invoice."],
      },
    ],
  },
  {
    section: "Grievances",
    topics: [
      {
        slug: "grievances",
        title: "Grievances",
        match: ["/grievances"],
        summary: "The formal HR grievance log — separate from QMS, this is an employment-relations process.",
      },
    ],
  },
  {
    section: "QMS (Quality Management System)",
    topics: [
      {
        slug: "qms-hub",
        title: "QMS Hub",
        match: ["/qms"],
        summary:
          "PRL's own ISO 9001 quality system — how PRL runs and audits its own business, not worker documents (that's Compliance).",
      },
      {
        slug: "qms-audits",
        title: "QMS — Internal Audits",
        match: ["/qms/audits"],
        summary: "PRL's own periodic self-checks that a part of the business is actually run the way procedures say — not a client audit or a site inspection.",
        tips: ["Findings raised during an audit (Minor/Major/Observation) are separate from the NCR register — a serious finding can go on to become its own NCR."],
      },
      {
        slug: "qms-improvements",
        title: "QMS — Continual Improvement",
        match: ["/qms/improvements"],
        summary: "A log of suggestions to improve how PRL operates, from any source — staff, an audit, a complaint, an NCR.",
      },
      {
        slug: "qms-management-review",
        title: "QMS — Management Review",
        match: ["/qms/management-review"],
        summary: "The formal record of senior management periodically reviewing business and quality performance.",
        tips: ["Opening a review auto-pulls live figures (active contractors, compliance rate, total invoiced, NCR/audit/risk summaries) — it's a genuine snapshot, not a blank form."],
      },
      {
        slug: "qms-ncr",
        title: "QMS — Non-Conformance Register (NCR)",
        match: ["/qms/ncr"],
        summary: "The formal log of things that went wrong with PRL's own processes/service, tracked through to a proper fix — not worker compliance issues.",
        tips: ["\"CAPA\" = Corrective and Preventive Action — fixing the immediate problem and stopping it happening again. Overdue NCRs are flagged red."],
      },
      {
        slug: "qms-risk-register",
        title: "QMS — Risk Register",
        match: ["/qms/risk-register"],
        summary: "PRL's business risk log, scored on a 5×5 likelihood × impact matrix.",
      },
      {
        slug: "qms-policy",
        title: "QMS — Quality Policy",
        match: ["/qms/policy"],
        summary: "PRL's internal Quality Policy statement, which staff formally acknowledge reading.",
      },
      {
        slug: "qms-reports",
        title: "QMS — Reports",
        match: ["/qms/reports"],
        summary: "Five auto-generated ISO evidence reports: Training Matrix, Approved Supplier Index, Master Document Index, Customer Feedback, Supplier Questionnaires.",
        tips: ["These are exactly the kind of reports a client's own auditor might ask to see — all read live from the database, not static files."],
      },
      {
        slug: "policies",
        title: "Policies",
        match: ["/policies"],
        summary: "PRL's compliance evidence pack — anti-bribery, modern slavery, data protection, H&S, accreditations.",
        tips: ["Only documents marked \"Public\" show on the client-facing page — check that toggle if something's missing."],
      },
    ],
  },
  {
    section: "Activity Log & GDPR",
    topics: [
      {
        slug: "activity-log",
        title: "Activity Log",
        match: ["/activity"],
        summary: "A full audit trail of who did what and when across the system, including failed logins.",
      },
      {
        slug: "gdpr",
        title: "GDPR",
        match: ["/gdpr"],
        summary: "Subject Access Requests and Right to Erasure. Erasure is permanent and admin-only to execute.",
      },
    ],
  },
  {
    section: "Suppliers",
    topics: [
      {
        slug: "suppliers",
        title: "Suppliers",
        match: ["/suppliers"],
        summary: "Tracks third-party labour suppliers/agencies and their performance. Currently hidden from the main menu but still working at this address.",
      },
    ],
  },
];

const ALL_TOPICS: HelpTopic[] = HELP_CONTENT.flatMap((s) => s.topics);

/**
 * Finds the best-matching help topic for a given pathname. `includes` matches
 * (for nested routes a prefix can't express, e.g. /contractors/[id]/ir35)
 * take priority over prefix matches; among prefix matches, the longest wins.
 */
export function findHelpTopic(pathname: string): HelpTopic | null {
  for (const topic of ALL_TOPICS) {
    if (topic.includes?.some((s) => pathname.includes(s))) return topic;
  }

  let best: HelpTopic | null = null;
  let bestLen = -1;
  for (const topic of ALL_TOPICS) {
    for (const prefix of topic.match) {
      if (pathname === prefix || pathname.startsWith(prefix)) {
        if (prefix.length > bestLen) {
          best = topic;
          bestLen = prefix.length;
        }
      }
    }
  }
  return best;
}
