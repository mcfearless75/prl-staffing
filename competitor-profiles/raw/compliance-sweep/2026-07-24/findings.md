# UK Construction Workforce Compliance — Competitor Sweep (raw findings)
Pulled: 2026-07-24 (web research agent). Data for synthesis — see ../_sweep summary when built.

## Strategic headline: the CSCS Smart Check API is the table-stakes gap

CSCS exposes an API (Smart Check) that validates all 2.3M cards across all 38 partner card schemes (CSCS, CPCS, ECS etc.) in real time, with flags for expired/revoked/fraudulent cards, now returning GPS of where the card was read. Mace, Morgan Sindall, Balfour Beatty, Kier rely on it. There are **36 approved IT Partners** including Biosite, Causeway, MSite, Datascope, innDex, GetOnSite, CloudPass, One.Site — **and Requidex** (the back-office competitor already profiled has this; PRISM does not). Becoming a Smart Check IT Partner is the single most concrete feature move available.
Sources: https://www.cscs.uk.com/blog/cscs-smart-check-api-construction-site-access-systems/ • https://www.cscsgroup.co.uk/cscs-smart-check-it-partners/ • https://www.cscs.uk.com/news/cscs-smart-check-upgrade-delivers-richer-site-level-data-to-support-industry-workforce-planning/

---

## 1. Biosite Systems (Assa Abloy)
- **URL**: https://www.biositesystems.com — biometric access control + workforce management for construction sites. Target: main contractors (Wates, Bouygues UK, Willmott Dixon, BAM). Pricing: enterprise/hardware-led, quote only.
- **Features**: fingerprint algorithm tuned for degraded construction-worker fingerprints; reads/imports CSCS SmartCard data and validates against the CITB database before arrival; online induction module; delivery management; competency mapping and fatigue management data.
- **Standouts PRISM lacks**:
  1. **Automatic lockout on credential failure** — operatives are physically denied site entry if a card is flagged fake or an accreditation has expired; expiry alerts by SMS/email are wired to the access decision, not just a report.
  2. **Pre-arrival credential validation** — cards validated against the awarding database before the worker travels to site.
- Sources: https://www.biometricupdate.com/201707/biosite-biometric-access-control-to-protect-bam-western-construction-sites • http://etmm.biositesystems.com/about/ • https://www.biositesystems.com/global/en/documents/Online-Induction-Biosite-Systems.pdf

## 2. MSite (Infobric / ex-Human Recognition Systems)
- **URL**: https://msite.com — construction workforce management: access, inductions, competency, from one cloud platform. Target: tier-1 contractors. Pricing: enterprise, quote only.
- **Features**: online inductions with booking system; automated competency checks pre-arrival; site access/attendance; reporting; Smart Check IT partner.
- **Standouts PRISM lacks**:
  1. **Fatigue Risk Management System** — tracks hours worked, commute times and rest days from attendance data; alerts site teams when fatigue thresholds are breached (https://www.msite.com/fatigue-risk-management-system). Directly relevant to an agency supplying labour on long shifts — PRISM has timesheets but no working-hours/fatigue rules engine.
  2. **Inductions auto-translated into 30+ languages**, with induction content assembled per site + job role + company (https://msite.com/software/online-inductions/, https://bdcmagazine.com/2024/02/construction-workforce-induction-platform-to-simplify-diversity-complexity/).
  3. **"Identity brokering"** — one verified worker identity reused across sites/contractors.

## 3. Causeway Donseed / CausewayOne Attendance
- **URL**: https://www.causeway.com/workforce/time-and-attendance — biometric labour management (fingerprint + IR facial recognition), part of the Causeway construction suite. Target: contractors/groundworks (Quinn, B&E Construction). Pricing: quote only.
- **Features**: to-the-minute biometric-verified T&A; portable rugged biometric tablets for temporary/mobile sites; live who's-on-site; compliance verification at sign-in; claims up to 20% labour savings.
- **Standouts PRISM lacks**: **mobile biometric clock-in verified by face/fingerprint** (kills buddy-punching on agency timesheets); portable device model suited to short-lived sites.
- Sources: https://www.biometricupdate.com/201902/causeway-technologies-acquires-biometric-workplace-management-specialist-donseed • https://www.pbctoday.co.uk/news/digital-construction/construction-technology-news/facial-recognition-contractors/74783/

## 4. innDex
- **URL**: https://inndex.co.uk — modular workforce management with a strong worker mobile app. Target: civils/main contractors, mid-market up. Pricing: modular, quote only (Capterra listed).
- **Features**: digital inductions completed in advance (videos, policies, doc upload incl. RTW); **real-time CSCS check against the CITB database at induction and access**; biometric turnstiles; RAMS & briefings; timesheets; fatigue monitoring; incident reporting; Scope 3 carbon tracking from workforce data.
- **Standouts PRISM lacks**:
  1. **Worker-owned profile in a consumer-grade app** — operative carries induction history, competencies and RTW docs between projects; sign-in/daily briefings in-app.
  2. **Automated CSCS verification embedded in the induction flow**, not a separate admin task.
- Sources: https://www.inndex.co.uk/en-us/construction-management-software/workforce-management/inductions • https://inndex.co.uk/construction-workforce-management

## 5. Skillko (now HSI)
- **URL**: https://skillko.com — training, safety and compliance management; Irish origin, EU+UK. Target: contractors and their supply chains. Acquired by HSI (US EHS/LMS group). Pricing: SaaS, quote only.
- **Features**: training matrix with expiry automation and notifications; LMS with course delivery; supplier/subcontractor onboarding and qualification ("80% reduction in contractor & qualification verification"); insurance-document tracking for subcontractors; integrates as a data source into DataScope's access platform.
- **Standouts PRISM lacks**:
  1. **Supply-chain compliance layer** — qualifies subcontractor *companies* (insurances, policies) and their workers in one flow; PRISM tracks workers, not supplier organisations.
  2. **Integrated LMS** — close training gaps by pushing a course, not just a chase email.
- Sources: https://skillko.com/resource-training-compliance • https://hsi.com/news/hsi-acquires-workforce-compliance-management-leader-skillko-and-bolsters-european-presence • https://constructionmagazine.ie/transforming-competency-training-and-supply-chain-compliance-in-the-construction-industry/

## 6. HandsHQ
- **URL**: https://www.handshq.com — RAMS creation + Training Register (training matrix) for high-risk SMEs/mid-market. 2,000+ companies incl. NHS, Babcock, G4S. Pricing: annual subscription, published tiers on site (RAMS individual plans exist; not enterprise-gated).
- **Features**: RAMS builder with 40+ trade content library ("98% lower client rejection"); training register with expiry emails, evidence storage, gap analysis; 150+ iHasco eLearning courses that **auto-update expiry dates and certificates on completion**; API to HR systems (Salesforce, Dynamics, monday.com).
- **Standouts PRISM lacks**:
  1. **RAMS ↔ competency link** — project RAMS pull through the assigned operatives' live training records, so the method statement itself evidences competence. PRISM has RAMS docs (static .docx) with no data link to its compliance records.
  2. **eLearning loop closing expiries automatically** (course completion writes the new cert + expiry back to the matrix).
- Sources: https://www.handshq.com/training-register • https://www.handshq.com/rams

## 7. Boxcore
- **URL**: https://www.boxcore.com — lightweight worker compliance/training-matrix platform for contractors in Ireland/UK/US. Target: SME–mid civils and subcontractors (closest in weight-class to PRISM). Pricing: SaaS, quote only.
- **Features**: workers upload CSCS/Safe Pass cards; live training matrix updates instantly on upload/expiry; automatic flags for missing docs; induction software; links compliance to site access (only compliant workers can clock in).
- **Standouts PRISM lacks**:
  1. **Live, shareable training matrix for clients/auditors/insurers on demand** — a read-only live compliance view per project. PRISM's gap reports are internal; a client-facing live matrix is a sales weapon for a labour agency.
  2. **Task-level competency mapping** — "trained for the exact tasks on a specific project", not just card-held.
- Sources: https://www.boxcore.com/construction-competency-management-software-app/ • https://www.boxcore.com/training-matrix-software-construction-boxcore/

## 8. GoContractor
- **URL**: https://gocontractor.com — pre-site digital onboarding/orientation for construction workforces (500k+ workers onboarded). Target: GCs and subcontractors, US/Ireland/UK. Pricing: quote only.
- **Features**: workers self-complete orientation + credential upload before arriving; manager review/approve queue; automatic expiry notifications to the *worker*; multilingual delivery; integrates with access control so only completed workers check in.
- **Standout PRISM lacks**: **worker-driven onboarding with in-flow quizzing/orientation content** — PRISM's pre-hire funnel collects documents; GoContractor also delivers and tests induction training before day one, cutting first-day site time ("onboard 3x faster").
- Source: https://gocontractor.com/

## 9. Credas / TrustID / uComply (IDVT — direct feature inspiration for RTW)
- **Credas**: https://credas.com/products/right-to-work-check/ — DVS (Digital Verification Service) Trust Framework-certified IDSP; facial-recognition ID verification by SMS link; pay-as-you-go per-check pricing with monthly starter package (https://credas.com/pricing-and-packages/); recent payroll-provider deal covering 150k UK workers (https://www.biometricupdate.com/202604/uk-payroll-provider-deal-brings-credas-biometric-right-to-work-checks-to-150k).
- **TrustID**: https://www.trustid.co.uk/trustid-services-right-to-work/right-to-work-checks/ — certified IDSP for digital RTW **plus Right to Rent and DBS**; software + human expert review hybrid. Notably **TrustID is already an integration inside DataScope's site-access platform**.
- **uComply**: https://ucomply.co.uk — document-forensics angle: uAuthenticate scans 3,000+ ID document types in UV/IR/white light + RFID chip read, pass/fail in seconds, statutory excuse audit trail, expiry alerts on passports/visas/ECS checks (https://ucomply.co.uk/foolproof-id-checking-solution-for-the-construction-industry/).
- **PRISM gap**: PRISM captures share codes (British/Irish citizens don't have share codes — they need IDVT or manual document checks). Integrating a certified IDSP API (Credas/TrustID per-check pricing) would give statutory-excuse-grade RTW for the whole workforce, not just visa holders.

## 10. DataScope Systems
- **URL**: https://www.datascopesystems.com — site access + workforce management + QHSE for construction (Chester, UK; strong in fit-out). Pricing: quote only.
- **Standout pattern**: **integration-hub architecture** — real-time verification against CSCS, TrustID (RTW), Skillko (training), DVLA, Companies House, FORS; every person on site auto-checked against approved industry databases. The lesson for PRISM: verification via authoritative APIs rather than staff eyeballing uploads ("bulk verify" is PRISM's manual equivalent).
- Source: https://www.datascopesystems.com/us/platform/api-and-integrations/ • https://www.datascopesystems.com/construction-workforce-management/

---

## Lower relevance (checked, park these)
- **CHAS / Veriforce** (https://www.chas.co.uk) — accreditation scheme, not software; relevant as a *requirement* on PRL (SSIP / Common Assessment Standard membership), and CHAS Elite's 13 risk areas are a useful checklist for PRISM's QMS content. Labour-only subcontractors count as employees for CHAS headcount.
- **Re-flow** (https://re-flow.co.uk/pricing) — field management/digital forms, from £38.50/user/month; qualification tracking exists but it's a jobs/forms tool, not a compliance platform.
- **Eque2** (https://www.eque2.co.uk) — construction accounting/ERP (Sage-based). Not a compliance competitor.
- **SafetyCulture (iAuditor)** — generic inspection/audit checklists; overlaps PRISM's ISO 9001 audits module only.
- **GateKeeper** — turned out to be Alvarado's turnstile lane-control software (US, not compliance); "AVERT" not found as a UK site-access product. Dead ends.
- **SmartAwards/Skillsight** — no substantive UK product found under those names. Adjacent finds worth a later look: **SmartSite** (https://www.smartsite-app.com/) — AI RAMS + CSCS card management app, SME-targeted; **CompetencyCloud** (https://competencycloud.co.uk/construction/) — UK construction certification-tracking niche player.

## Top 5 feature-gap themes for PRISM (synthesis input)
1. **CSCS Smart Check API integration** (become an IT Partner) — automated, authoritative card verification replacing manual verify; Requidex already has it.
2. **IDVT-certified RTW via IDSP API** (Credas/TrustID per-check) — covers British/Irish citizens the share-code flow cannot.
3. **Compliance-gated site access / clock-in** (Biosite, Boxcore, innDex) — expiry doesn't just email someone, it blocks assignment/timesheet.
4. **Fatigue/working-hours rules engine** (MSite, innDex) — thresholds on hours + rest days from timesheet data, alerts on breach.
5. **Client-facing live training matrix + pre-arrival induction delivery** (Boxcore, GoContractor, MSite) — shareable read-only compliance view per client/project; multilingual induction content delivered and tested pre-start.
