# Feature Deep-Dive — Timesheet Portal / ETZ / Bullhorn InTime / Access FastTrack360
Pulled: 2026-07-24 (web research agent). Known planned PRISM gaps (AWR tracker, credit notes, absence, schedule view, reports hub, payments reconciliation, trades taxonomy) excluded from headline findings.

## 1. Timesheet Portal (Recruitment Edition)

### Timesheet capture
- Clock in/out via mobile app with GPS recording as an alternative to weekly timesheets (timesheetportal.com/recruitment/timesheet/)
- Configurable time-entry rules: limit hours per timesheet; overtime auto-calculated from recorded time using rules defined at placement level, not worker choice (timesheetportal.com/recruitment/benefits)
- Client submits on behalf of workers, single or bulk (timesheetportal.com/recruitment/timesheet/)
- Unsubmitted/unapproved timesheet reports to drive the chase before payroll cutoff
- **Partial timesheet billing**: bill part of a timesheet in one period, system finds the rest later; no lost or double-billed lines

### Approvals
- Approval by online portal, email, OR text message; single and multi-stage chains

### Billing
- **PO management with burn-down**: POs linked to multiple placements, value + expiry; usage decremented as timesheets approve; automated email warnings when a PO nears depletion (timesheetportal.com/recruitment/billing/)
- **Invoice grouping presets** per client: group by PO, contract, or site
- Accounting export keeps invoice numbers synchronised, posts to correct ledgers/tracking categories in Sage/Xero/QuickBooks
- **Contractor self-billing**: auto-generate supplier self-bill invoices from approved timesheets, auto-send remittance advice, includes CIS deductions and HMRC intermediary reporting (timesheetportal.com/recruitment/pay/)

### Compliance
- **PAYE assist module**: real-time holiday accrual + AWR status tracked automatically; auto-updated pay rates and accrual percentages; export-ready payroll data

### Worker experience
- PAYE temps view accrued holiday balance and request holiday pay in the portal/mobile (standout worker-facing feature)
- Contractors download their own self-bill invoices
- Expenses: mobile receipt upload, multi-approver chains, rechargeable vs reimbursable flags, differing tax codes, mileage auto-calculated from postcode entry

### Reporting
- Consultant margin reports; commission splits and net margin analysis

### Complaints
- Only 2 Capterra UK reviews, both positive. Low-signal.

## 2. ETZ Payments

### Capture
- Any device; multi-currency
- **One-click bulk chase of overdue timesheets** via both text and email from a real-time overdue view

### Billing
- "Timesheet into an invoice in 60 seconds"; any-currency billing; expenses in the same flow; moving toward faster-payment products

### Compliance (ETZ Comply)
- Doc capture (passports, visas, licences), send-and-sign e-signature, reminders, "HMRC ready data", configurable rules per jurisdiction

### Complaints
1. "Overpriced"; agency itself billed incorrectly multiple times (G2)
2. No customer/client portal comparable to competitors (G2)
3. Poor customer service in some reviews; GetApp support 3/5
4. Dated UI
5. Reporting weaker than rivals (GetApp)

## 3. Bullhorn (InTime / Time & Expense / Recruitment Cloud WFM)

### Capture
- Multiple methods in one system: online with email approval, mobile, paper upload, bulk upload from third-party/VMS systems (bullhorn.com/marketplace/rsm/)
- VMS integration for electronic time capture ("minimize mismatches")
- **Time-interpretation rules configured to match exact regulatory and client billing requirements** (bullhorn.com/products/time-expense/)

### Billing
- Client-specific configurable invoice engine aimed at DSO
- InTime enhanced: PO tracking, **bulk pay/bill adjustments**, advanced billing tools, Statement of Works (SOW) module for milestone billing (rsmuk.com/campaign/intime)
- Ltd/umbrella/off-payroll payment management; InPay handles PAYE, CIS, holiday

### Compliance
- AWR tracking + online contract packs, e-signatures, expiry notifications as enforcement

### Worker/stakeholder experience
- **Role-scoped portals for candidates, client managers, AND umbrella companies** (umbrellas get their own access)
- WFM: workers update availability, accept/reject shifts, request work; mass shift actions; risk and fatigue management; rate card management module

### Reporting / architecture (steal-worthy)
- **Pay & bill summary dashboards inside the CRM against placement/client/worker records**, SSO drill-down; actuals flow back so reporting is on actuals not estimates
- Open data access: SQL Server, MySQL, BigQuery integrations
- Scale: 3m timesheets/yr, 400+ agencies, 30%+ of UK top-100 recruiters

### Complaints
1. Slow/inconsistent support and account management (G2)
2. Outdated, non-intuitive UI; steep learning curve
3. Performance: slow loads, glitches, reports needing re-runs
4. Flexibility locked behind paid services
5. Configuration challenges

## 4. Access Recruitment Pay & Bill / FastTrack360 Evo

### Capture / rate interpretation
- **AI-enhanced intelligent time interpretation engine**: applies complex pay rules automatically, calculates pay, flags discrepancies, issues invoices; claimed 90% error reduction (theaccessgroup.com/en-gb/products/fasttrack360/)
- **AI validation detects anomalies BEFORE payroll runs; Copilot prompts guide staff to resolve flagged issues** — exception-driven payroll workflow (most steal-worthy pattern found)

### Billing
- "Every invoice right the first time"; AI-driven profit calculations highlighting growth drivers; DSO-reduction framing; multi-market pay rules

### Compliance / payroll
- HMRC-recognised; automatic compliance with HMRC and pension providers (RTI + auto-enrolment in-product); run payroll as often as needed with real-time checks
- Also sold as a managed pay & bill service to SLAs

### Worker experience
- Candidate and client portals bundled; mobile payroll approvals for managers

### Reporting
- Live payroll dashboards; real-time CRM↔payroll↔finance sync; "one version of the truth"

### Complaints
1. Support black hole: ignored emails, unreachable account managers (Trustpilot, Access Group-wide)
2. Slow admin ops (4 months to add a licence; unclear invoices)
3. Dev-fix latency ("months"); blame-the-user culture perceived
4. Painful implementation; FastTrack360 backend setup "challenging" (Capterra)

---

## Cross-cutting patterns worth stealing (highest-signal)
1. **Exception-driven pay/bill run** (Access): validate + anomaly-flag timesheets before invoicing/payroll, with guided fix prompts.
2. **PO burn-down with depletion alerts** (Timesheet Portal): direct construction relevance (POs against projects).
3. **Contractor self-billing + auto remittance + CIS deductions** (TSP / InTime): the missing half of PRISM's invoicing.
4. **One-click bulk chase of overdue timesheets via SMS+email** (ETZ): mirrors PRISM's compliance-doc chasing; reuse for timesheets.
5. **Client-configurable invoice grouping** (TSP/Bullhorn): per-client invoice format presets as data, not code.
6. **Back-office dashboards embedded in front-office records** (Bullhorn/RSM): pay/bill status widgets on contractor, client, project pages.
7. **Worker holiday-balance view + holiday-pay request** (TSP): cheap, high-goodwill portal addition; pairs with WTR 12.07% accrual work.
8. **Approve-by-SMS/email-reply** (TSP): lowers client friction vs portal-only chains.
9. **Time interpretation rules per placement** (Bullhorn/Access): OT/shift-premium derivation from rules (after 39hrs, weekends, nights).
10. **Mistakes to avoid** (uniform): support responsiveness is complaint #1 everywhere; dated UI and weak reporting #2; don't lock configurability behind services; keep implementation self-serve.

Sources: timesheetportal.com/recruitment/ (+ /timesheet/, /billing/, /pay/, /benefits), etzpayments.com/features/ (+ /invoices/, /etzcomply/, /reporting/), rsmuk.com InTime pages, bullhorn.com/marketplace/rsm/, bullhorn.com/products/time-expense/, bullhorn.com/uk/bullhorn-recruitment-cloud-workforce-management/, theaccessgroup.com pay-and-bill + fasttrack360 pages, Capterra UK TSP, G2 ETZ, GetApp ETZ, G2 Bullhorn, Trustpilot Access Group, Capterra FastTrack360.
