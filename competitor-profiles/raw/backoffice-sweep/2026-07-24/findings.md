# UK Recruitment Back-Office / Pay & Bill Competitive Sweep — Raw Findings
Pulled: 2026-07-24 (web research agent). Benchmarks: PRISM (compliance-heavy internal portal) and Requidex (Requisition → Assignment → Timesheet → Invoice/Credit Note spine, AWR, schedule timeline).

### 1. Timesheet Portal (Anfold Software)
- **URL**: https://www.timesheetportal.com/recruitment/
- **Positioning**: Modular timesheets + pay & bill SaaS for small/mid UK recruitment agencies.
- **Pricing signal**: Published, pay-as-you-go per active contractor (Capterra lists from ~£3.94/month flat rate); module-based. One of very few vendors with public pricing.
- **Features**: Online timesheets with reminders, clock-in, multi-rate/overtime; expenses with receipt upload + mileage + multi-currency; auto client invoicing; self-billing and pay-run prep; holiday accrual + AWR management; digital contract signing; contractor onboarding doc upload with expiry flagging; exports to Sage, Xero, QuickBooks; Bullhorn + JobAdder integrations.
- **Steal-worthy vs PRISM/Requidex**:
  1. Pay-as-you-go per-active-contractor billing model (commercial idea, why small agencies pick them).
  2. Contractor self-billing invoices generated from approved timesheets (neither PRISM nor Requidex generates the supplier-side self-bill for ltd/umbrella contractors).
  3. Holiday pay accrual engine tied into the pay run (PRISM doesn't accrue holiday for PAYE temps).
- Sources: timesheetportal.com/recruitment/, /recruitment/pay/, capterra.com/p/101148/Timesheet-Portal/

### 2. ETZ (getetz.com)
- **Positioning**: "Timesheet to invoice in 60 seconds"; claims back-office cost cut up to 85%.
- **Pricing signal**: Not published.
- **Features**: Timesheet capture in any format (online, scanned, faxed, photo, barcoded paper); rules-based overtime/holiday config; bulk invoice generation (1,000 at a click); multi-currency; Xero/Sage; ETZ Comply module (contracts + docs, GDPR); AWR traffic-light compliance system; expenses tied to timesheets/invoices; real-time MI dashboards.
- **Steal-worthy**:
  1. **ETZSign passwordless client approval**: client approves a timesheet via encrypted email link, no login. Attacks the biggest approval-chain friction.
  2. Barcoded paper timesheet + photo ingestion (construction sites still run on paper).
  3. Bulk chase of overdue timesheets from a real-time overdue tracker.
- Sources: getetz.com/products/etz-features/, getetz.com/back-office-recruitment-software/

### 3. RSM InTime (Bullhorn's UK pay & bill partner)
- **URL**: https://www.rsmuk.com/campaign/intime
- **Positioning**: Heavyweight UK pay & bill engine; de-facto back office for Bullhorn agencies. 850+ agency clients, 6m+ timesheets/yr, £8bn+ temp billing.
- **Features**: Multi-channel timesheet capture (online w/ email approval, mobile, paper, bulk upload from client VMS systems); payroll for PAYE, CIS and deemed contractors in real time; advanced billing (discounts, rebates, surcharges); credit notes; AWR monitoring; RTI/intermediary/CIS statutory reporting; auto-enrolment; PO tracking; worker self-service portals; multi-division ringfenced group structure; outsourced pay & bill + funding sold around it.
- **Steal-worthy**:
  1. Pay & bill status dashboards surfaced inside the front-office CRM record (live commercial status against placement/client/worker).
  2. **Bulk pay/bill adjustments**: retro rate changes applied across historical timesheets with automatic credit/re-invoice generation.
  3. Client-system (VMS) timesheet bulk import instead of double keying.
- Sources: rsmuk.com/campaign/intime, bullhorn.com/marketplace/rsm/, bullhorn.com/pay-bill/

### 4. Access Pay & Bill + Access FastTrack360 (The Access Group)
- **Positioning**: Enterprise UK recruitment suite; FastTrack360 (acquired 2022) is the premium configurable pay/bill engine.
- **Features**: Timesheets via mobile/email/portal with one-click client approval; **time interpretation engine** (interprets time logged against pay agreements automatically); payroll for PAYE, ltd co, umbrella, contractor; multi-currency invoicing; credit workflow; holiday pay; IR35 support; worker/client/consultant portals; sub-1% error-rate case studies.
- **Steal-worthy**:
  1. Time interpretation engine: rules layer converting raw hours into pay elements (OT thresholds, shift premiums, weekend uplifts) per pay agreement. Nothing in PRISM/Requidex classifies time automatically.
  2. ROI calculator on the pricing page as lead-gen.
  3. Pay agreements per client/award rather than flat rate cards.
- Sources: theaccessgroup.com/en-gb/recruitment/software/pay-and-bill/, /products/fasttrack360/

### 5. Merit Software
- **URL**: https://www.meritsoftware.co.uk/ — est. 1997 back-office payroll/billing for temp agencies, umbrellas, CIS/PSC bureaus. FCSA partner.
- **Features**: Merit Payroll / Umbrella / Healthcare / Bureau / PSC / Expenses. Rapid timesheet entry, holiday pay calc, ltd-co invoicing, CIS payments, IR35, AWR, RTI, apprenticeship levy, AE; iMerit worker portal; print/email/SMS worker comms; cloud or on-premise.
- **Steal-worthy**: bureau/multi-entity payroll model (agency + own umbrella + CIS book in one instance); SMS as first-class worker comms channel.
- Sources: meritsoftware.co.uk, capterra.co.uk/software/155811/merit-payroll, fcsa.org.uk/business-partner/merit-software/

### 6. Zeel Solutions (Zeel Pay & Bill / Zpayplus / NuEvo)
- **URL**: https://www.zeelsolutions.com/zeel-pay-bill — pay & bill engine for agencies, RPOs, VMS providers, payroll outsourcers. "ZipCube" no longer exists; new cloud-native NuEvo platform (CRM + Pay & Bill + VMS + timesheets + time interpretation + attendance).
- **Features**: E-timesheets, time interpretation, timesheet→payroll automation, onboarding via online forms with e-signing, compliance document monitoring, worker portal, SMS notifications; IR35 off-payroll calculations. Speed claim: 1,000 workers < 5 min.
- **Steal-worthy**:
  1. **Compliance-gated auto-matching**: candidates only surface for selection if compliance docs are current (PRISM tracks expiry but doesn't hard-gate assignment creation).
  2. IR35 deemed calculation inside the pay run (PRISM assesses, doesn't apply).
- Sources: zeelsolutions.com/zeel-pay-bill, zeelsolutions.com/sectors/recruitment

### 7. Vincere Pay & Bill (Access Vincere Evo)
- **URL**: https://www.vincere.io/invoicing/
- **Features**: Auto-raise invoices on timesheet approval; **invoice status dashboard** (fully/partially paid/outstanding); **consolidated invoices** (multiple placements → one client invoice); credits/refunds linked to sales invoices; retainers billed in tranches; temp-specific reports (redeployment, growth, revenue).
- **Steal-worthy**:
  1. Payment-status dashboard on invoices (PRISM exports to Sage and goes blind; Requidex tracks credit notes but not receipt status).
  2. Consolidated invoicing per client per period.
  3. **Redeployment reporting**: flags contractors finishing assignments who weren't re-placed (revenue-leak metric neither PRISM nor Requidex reports).
- Sources: vincere.io/invoicing/, theaccessgroup.com/en-gb/products/vincere/

### 8. Engage (engagetech.com) — construction-native
- **Positioning**: Digital supply chain platform for temporary labour connecting end-hirer, agency, umbrella and worker on ONE shared platform. Construction, FM, rail; enterprise hirers (Wates, ISS, G4S, NHS). 11,000+ MAU. Pay-as-you-go.
- **Features**: **QR-code + geolocation clock-in** on site; digital timesheets with **cost-code allocation to projects**; agency/direct/umbrella/sub-contractor/CIS workers; automated invoice creation with margin management; **invoice-vs-timesheet data matching**; automatic IR35 assessment; **AI Right-to-Work document verification**; role-specific document requirements; neutral/master-vendor models.
- **Steal-worthy**:
  1. Site clock-in via QR + geofence feeding the timesheet (kills disputed hours; most relevant construction feature both PRISM and Requidex lack).
  2. Timesheet-to-invoice line matching as an automated reconciliation control (audit-friendly, fits ISO 9001).
  3. Cost-code allocation per hour so the hirer sees labour against their own project codes.
- Sources: engagetech.com, crunchbase.com/organization/engage-technology-partners-limited

### 9. Flo Group (flo.co.uk)
- **Positioning**: Software + invoice finance + outsourced back office bundled for UK temp agencies (construction/industrial/logistics; also startup agencies via JV model).
- **Features**: Dataflo temp CRM (compliance, timesheets, invoicing); Workflo outsourced back office; Cashflo invoice finance (up to 100% of invoice value weekly); AWR/RTW/HMRC baked in.
- **Takeaway**: threat model, not build item — agencies buy Flo for cashflow, not features. Credit control as a service attached to the invoice ledger.
- Sources: flo.co.uk, flo.co.uk/services/dataflo-temp-recruitment-crm/

### 10. Finity (finity.co.uk)
- **Positioning**: Cloud pay & bill, founded 2016, 150k+ workers paid monthly. APSCO/FCSA/ISO 27001. **Volume-based per-timesheet pricing, decreasing at scale.**
- **Features**: Bulk timesheet collection/approval; mobile worker self-service; auto branded invoices; consolidated invoice grouping; refunds/credits linked to invoices; email-based digital client approval; payroll module; consultant output/commission/margin reporting.
- **Steal-worthy**: per-timesheet transactional pricing (cleanest comparable if PRISM commercialises); rewards programme (points per timesheet redeemable on a Finity Mastercard).
- Source: finity.co.uk/back-office/pay-and-bill/

### 11. Primo Time (primotime.co.uk / Primo Umbrella)
- **Positioning**: Cloud pay & bill for agencies running umbrella/PSC/PAYE mixes; sister product is CIS-specialist. Strong construction overlap.
- **Features**: Candidate/client/consultant portals; timesheet reminders via email/SMS; exception tracking; self-billing for umbrella/PSC suppliers; **direct bank payment processing**; PAYE, AE, AWR, RTI; Primo Umbrella: HMRC subcontractor verification, CIS300 monthly returns, CIS deduction automation.
- **Steal-worthy**:
  1. **Banking integration with automated receipt allocation** (incoming client payments auto-matched to invoices; closes the loop PRISM's Sage export leaves open).
  2. **Worker-facing payment-status tracking** ("where's my money" self-serve; cuts the #1 inbound call).
  3. Self-service umbrella plugin.
- Sources: primotime.co.uk, primoumbrella.co.uk/cis-payroll-software/

### 12. Bullhorn Workforce Management (ex-Sirenum) — scheduling layer
- **Positioning**: Shift scheduling + T&A for high-volume hourly staffing (Salesforce-based). 500k workers on mobile, 300k shifts/month.
- **Features**: Shift/rota scheduling, worker availability management, GPS time clock, compliance management, messaging, dashboards.
- **Steal-worthy**:
  1. **Live fatigue management**: blocks rostering a worker whose cumulative hours breach fatigue/WTD rules.
  2. En-route tracking to predict no-shows before shift start.
  3. Worker availability calendars driving assignment fill (neither PRISM nor Requidex has worker-declared availability).
- Sources: bullhorn.com/products/workforce-management-software/, capterra.com/p/136273/sirenum/

---

### Checked and de-prioritised
- **Eploy**: enterprise ATS; no pay & bill. Not a Requidex competitor.
- **JobAdder**: ATS/CRM; pay & bill via partners. Front-office adjacent.
- **Colleague**: CRM with light invoicing; not temp pay & bill grade.
- **Chronotek**: US; not UK-relevant.
- **StoneRise (stonerise.tech)**: construction workforce/timesheets for contractors (end employers), not agencies — but steal-worthy: labour-gang management with piece-rate (£/m²) tracking + gang self-billing; offline timesheet submission syncing when signal returns.
- **Evertime (evertime.co.uk)**: small UK pay & bill SaaS; thin public detail; watchlist.
- **OneAdvanced Tempest**: appears retired/absorbed. Exclude.

### Closest true Requidex substitutes for a UK construction labour agency
1. **RSM InTime** — same spine at industrial scale, native CIS + deemed payroll, AWR, credit notes, Sage. Most complete like-for-like.
2. **Timesheet Portal** — closest at Requidex's price point/segment; published pricing.
3. **ETZ** — same back-office spine pitch; strongest approval-friction story (ETZSign, paper/photo capture) for site-based workforces.
- **Wildcard**: **Engage** — most construction-native of the sweep (QR/geo clock-in, CIS, cost-codes) but positioned as hirer/supply-chain platform.

### Cross-market gaps PRISM + Requidex both lack (recurring themes)
- Passwordless/email-link timesheet approval (ETZ, Finity, InTime)
- Time interpretation rules engine converting raw hours → pay elements (Access, Zeel, FastTrack360)
- Site-level clock-in (QR/geofence) feeding timesheets (Engage, Sirenum, StoneRise)
- Contractor self-billing + CIS300/HMRC verification automation (Primo, Merit, InTime, Timesheet Portal)
- Invoice payment-status/receipt tracking and banking auto-allocation (Vincere, Primo)
- Holiday pay accrual in the pay run (Timesheet Portal, Merit, Zeel)
- Worker availability + fatigue/WTD-aware scheduling (Sirenum)
- Bulk retro rate adjustment with auto credit/re-invoice (InTime)
- Published/transactional pricing as a sales weapon (Timesheet Portal, Finity)
