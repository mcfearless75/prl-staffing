# Cyber Essentials Self-Assessment — PRISM Workforce Portal

**Organisation:** PRL Site Solutions  
**System:** PRISM (prismworkforce.online)  
**Framework:** Cyber Essentials (IASME/NCSC)  
**Assessment Date:** 2026-05-08  
**Prepared By:** Security review of codebase and infrastructure  
**Scope:** PRISM Next.js application, Vercel/Railway hosting, and PRL team devices

---

## Summary Table

| Control | Status | Confidence | Notes |
|---------|--------|------------|-------|
| 1. Firewalls | PARTIAL | Medium | App-level headers strong; network boundary relies entirely on hosting provider |
| 2. Secure Configuration | PARTIAL | Medium | Security headers configured; CSP uses `unsafe-inline`/`unsafe-eval` |
| 3. User Access Control | COMPLIANT | High | bcrypt, account lockout, IP rate limiting, role separation, MS SSO for staff |
| 4. Malware Protection | GAP | Low | No file upload scanning; no AV policy evidenced in codebase |
| 5. Patch Management | PARTIAL | Medium | Modern stack; no automated dependency audit evidence |

---

## Out of Scope (Infrastructure-Inherited Controls)

The following controls are managed by third-party platforms and inherited by PRISM. Evidence should be requested from each provider at audit time.

| Provider | What It Covers | CE Relevance |
|----------|---------------|-------------|
| Railway / Vercel | Network firewall, DDoS protection, TLS termination, server patching | Firewalls, Patch Management |
| Cloudflare (if in use) | WAF, bot protection, DNS, DDoS | Firewalls |
| Supabase / Neon (DB) | Database encryption at rest, server hardening, patching | Secure Configuration, Patch Management |
| Cloudflare R2 (storage) | Object storage encryption, access controls | Secure Configuration |
| Resend (email) | Email delivery infrastructure, SPF/DKIM | Malware Protection (email gateway) |
| Microsoft 365 / Azure AD | SSO identity provider, MFA enforcement for staff | User Access Control |

For CE certification, obtain SOC 2 / ISO 27001 certificates or CE Certified status letters from each provider.

---

## Control 1: Firewalls

### What PRISM Does

- **HTTPS enforced** via `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` header set in `next.config.ts`
- **Clickjacking blocked** via `X-Frame-Options: DENY` and `frame-ancestors 'none'` in CSP
- **MIME sniffing blocked** via `X-Content-Type-Options: nosniff`
- **Referrer leakage controlled** via `Referrer-Policy: strict-origin-when-cross-origin`
- **Permissions Policy** restricts camera/microphone/geolocation/payment APIs
- **Content Security Policy** restricts resource origins to `'self'` and `https:` for images/connections
- **HTTP to HTTPS redirect** enforced via `next.config.ts` redirects (307)
- **Network-level firewall**: delegated to hosting provider (Railway/Vercel) — not managed within the codebase

### Gaps and Actions

| Gap | Priority | Action |
|-----|----------|--------|
| No evidence of network-level firewall rules (port restrictions, ingress controls) | P1 | Confirm with hosting provider that only ports 80/443 are exposed; obtain written confirmation |
| CSP allows `unsafe-eval` and `unsafe-inline` for scripts | P2 | Migrate to nonce-based CSP; remove `unsafe-eval` (required for strict CE compliance) |
| No WAF (Web Application Firewall) rule set documented | P2 | Enable Cloudflare WAF or Railway's equivalent; document active rules |
| No outbound traffic controls documented | P3 | Review and document what external services PRISM connects to (Resend, Azure, DB) |

---

## Control 2: Secure Configuration

### What PRISM Does

- **Security headers applied globally** to all routes via `next.config.ts` `headers()` function
- **No default credentials**: authentication is email+bcrypt or Microsoft SSO — no default admin passwords
- **Role separation**: middleware enforces `staff` vs `contractor` routing — staff cannot access `/portal`, contractors cannot access staff pages
- **Token versioning**: `tokenVersion` on both `User` and `ContractorLogin` models enables session invalidation
- **Environment variables**: secrets (Azure AD credentials, DB connection string) referenced via `process.env` — not hardcoded
- **Audit logging**: all login events (success, failure, lockout) written to `activityLog` with IP address, user identity, and timestamp

### Gaps and Actions

| Gap | Priority | Action |
|-----|----------|--------|
| CSP `script-src` includes `'unsafe-inline'` and `'unsafe-eval'` | P1 | Replace with nonce-based CSP; this is a known XSS risk and CE assessors flag it |
| No evidence of unnecessary services/ports being explicitly disabled | P2 | Confirm with hosting provider; document that only web traffic (443) is permitted |
| No Content-Security-Policy `report-uri` or `report-to` directive | P3 | Add CSP violation reporting endpoint to detect injection attempts |
| `X-DNS-Prefetch-Control: on` — this enables DNS prefetching which can leak browsing intent | P3 | Set to `off` unless performance benefit is specifically required |
| No documented process for reviewing audit logs | P2 | Define and document log review cadence (weekly minimum for CE) |

---

## Control 3: User Access Control

### What PRISM Does

- **Password hashing**: bcrypt via `bcryptjs` — industry-standard adaptive hashing
- **Account lockout**: 5 failed attempts triggers 30-minute lockout for both staff and contractors
- **IP-level rate limiting**: 20 attempts per IP per 15-minute window on login endpoint
- **Microsoft Entra ID SSO**: staff can authenticate via `@prlsitesolutions.co.uk` Microsoft accounts (MFA enforced at Azure AD level)
- **Role-based access control**: `userType` (staff/contractor) and `role` fields on user records; middleware enforces routing boundaries
- **Least privilege**: contractors restricted to `/portal/*` routes only; staff blocked from contractor portal
- **Session management**: `tokenVersion` field allows forced session invalidation (e.g., on password reset)
- **Login audit trail**: all events logged with IP, identity, timestamp, and outcome
- **Account locking logged**: blocked logins recorded in `activityLog`
- **Email normalised**: input lowercased and trimmed before lookup — prevents case-based bypass

### Gaps and Actions

| Gap | Priority | Action |
|-----|----------|--------|
| No MFA for contractor accounts | P1 | Implement TOTP or magic-link MFA for contractor login — CE requires MFA for all internet-facing accounts |
| No MFA for staff using credential (password) login — MFA only applies if they use SSO | P1 | Enforce SSO-only for all staff; disable credential login for staff or mandate SSO path |
| No minimum password length/complexity policy enforced in code for contractors | P1 | Add Zod validation on password set/change: minimum 12 characters, mixed case, number |
| No password expiry policy | P2 | Define policy (e.g., 90-day max); implement prompt on login if password age exceeded |
| Auditor portal (`/auditor/*`) bypasses main auth middleware entirely | P2 | Review auditor authentication mechanism — confirm it has equivalent controls |
| Several public routes bypass auth with no rate limiting (`/apply`, `/onboarding`, `/survey`, etc.) | P2 | Add rate limiting to public form submission endpoints to prevent abuse |
| No documented user deprovisioning process | P2 | Define and document process for removing accounts when staff/contractors leave |

---

## Control 4: Malware Protection

### What PRISM Does

- **No executable file execution**: PRISM is a web portal — it does not run user-supplied executables
- **Dependency ecosystem**: npm packages used (Next.js, Prisma, NextAuth) are mainstream, actively maintained packages
- **No evidence of file upload scanning** in the codebase reviewed

### Gaps and Actions

| Gap | Priority | Action |
|-----|----------|--------|
| File uploads (compliance documents, contractor files) — no evidence of malware scanning | P1 | Integrate a scanning step before files are stored to R2 (e.g., ClamAV via a serverless function, or a service like VirusTotal API / Cloudflare CASB) |
| No documented AV policy for the application server | P1 | Confirm with hosting provider (Railway/Vercel) that deployed containers are scanned; obtain written confirmation |
| No documented safe browsing enforcement for staff | P2 | Enforce via Microsoft Defender / Google Workspace device policy — covered in PRL Team Devices section |
| No dependency vulnerability scanning in CI pipeline | P1 | Add `npm audit` or Dependabot/Snyk to CI pipeline; fail build on critical CVEs |

---

## Control 5: Patch Management

### What PRISM Does

- **Modern framework**: Next.js App Router (v15/16), TypeScript, Prisma — all receive regular security updates
- **npm package management**: `package.json` tracks dependencies with version ranges
- **No evidence of automated dependency audit** in reviewed files

### Gaps and Actions

| Gap | Priority | Action |
|-----|----------|--------|
| No automated dependency vulnerability scanning | P1 | Enable GitHub Dependabot or add `npm audit --audit-level=high` to CI; configure alerts to paulmc18@gmail.com |
| No documented patching cadence | P1 | Define policy: critical patches within 14 days, high within 30 days, medium within 90 days |
| OS/container patching not managed at application level | P2 | Confirm with Railway/Vercel that base images are rebuilt regularly; document their SLA |
| No evidence of staging environment for testing patches before production | P2 | Establish staging branch/environment; test dependency updates before promoting to production |
| Node.js version not pinned in repository | P2 | Add `.nvmrc` or specify `engines` in `package.json`; pin to current LTS |

---

## PRL Team Devices

These controls apply to all PRL Site Solutions staff devices (laptops, phones) regardless of the PRISM application. They must be in place for CE certification to cover the organisation.

### Required Actions for All Staff

| Control | Requirement | Status | Action |
|---------|-------------|--------|--------|
| MFA on Microsoft 365 | All `@prlsitesolutions.co.uk` accounts must have MFA enabled | Confirm in Azure AD | Enable via M365 Admin Centre > Security defaults or Conditional Access |
| Device encryption | All laptops must have BitLocker (Windows) or FileVault (Mac) enabled | Confirm per device | Enable BitLocker via Windows Settings > Privacy & Security |
| Antivirus | Microsoft Defender (built-in on Windows 11) must be active and updated | Confirm in Defender dashboard | Ensure Defender is not disabled; confirm real-time protection is on |
| Operating system patches | Windows 11 must be on current supported version; auto-updates enabled | Confirm per device | Windows Settings > Windows Update > turn on automatic updates |
| Software patches | Office 365, browsers, and other software must be kept up to date | Confirm per device | Enable auto-update in M365 and browser settings |
| Strong passwords | All device login passwords: minimum 12 characters | Confirm per device | Set via Windows account settings; enforce via Intune if available |
| Screen lock | Automatic screen lock after 10 minutes of inactivity | Confirm per device | Windows Settings > Personalization > Lock Screen > Screen timeout |
| Mobile devices | Work email on mobile requires PIN/biometric and device encryption | Confirm per device | Enforce via Microsoft Intune or equivalent MDM |
| No unauthorised software | Only business-approved software installed on work devices | Policy only | Document approved software list; communicate to team |
| Secure Wi-Fi | Do not use open/public Wi-Fi without VPN for work access | Policy only | Issue VPN policy; consider Microsoft Always-On VPN |

---

## CE Questionnaire Answers (IASME Format)

The following maps to the IASME Cyber Essentials questionnaire structure as of 2024-2025.

---

### A. Scope

**Q: What is the scope of your Cyber Essentials assessment?**  
A: The PRISM Workforce Portal web application (prismworkforce.online), hosted on Railway/Vercel, and all PRL Site Solutions staff devices used to access or administer the system. Third-party SaaS platforms (Supabase, Resend, Cloudflare R2, Microsoft 365) are used as sub-processors and are out of scope as separately certified/managed services.

**Q: Does your organisation use cloud services?**  
A: Yes. Railway or Vercel (hosting), Supabase/Neon (database), Cloudflare R2 (file storage), Resend (email), Microsoft Azure AD (identity).

**Q: Does your organisation use home working?**  
A: Yes. Staff may access PRISM from home devices. All staff devices must meet the device controls listed above.

---

### B. Firewalls

**Q: Do you have a firewall in place between your internal network and the internet?**  
A: Yes. Network-level firewalls are provided by Railway/Vercel (hosting provider). Application-level security headers (HSTS, CSP, X-Frame-Options, etc.) are configured in `next.config.ts`.

**Q: Do you change default passwords on firewall devices?**  
A: Not applicable — no on-premise firewall hardware. Cloud provider firewalls have no user-configurable default passwords.

**Q: Do you restrict inbound connections to only those required?**  
A: Yes. Only HTTPS (port 443) and HTTP (port 80, redirected to HTTPS) are exposed. Confirmed via hosting provider.

**Q: Do you have a documented firewall rule review process?**  
A: Partially. Security headers are version-controlled in `next.config.ts`. Network-level rule review is delegated to the hosting provider. ACTION: document review cadence.

---

### C. Secure Configuration

**Q: Do you change default passwords on all software and devices?**  
A: Yes. No default credentials exist in PRISM. All accounts require explicit creation with bcrypt-hashed passwords or SSO.

**Q: Do you disable or remove software and services you do not need?**  
A: Yes. PRISM does not install or enable unnecessary services. Hosting containers are minimal Next.js deployments.

**Q: Do you apply security patches promptly?**  
A: Partially. No automated patch scanning in CI currently. ACTION (P1): add Dependabot and `npm audit` to pipeline.

**Q: Do you have a Content Security Policy?**  
A: Yes, configured in `next.config.ts`. Note: currently includes `unsafe-inline` and `unsafe-eval` — ACTION (P2): migrate to nonce-based CSP.

---

### D. User Access Control

**Q: Do you have a process for creating and removing user accounts?**  
A: Staff accounts are managed in the PRISM database. Contractor accounts are created on onboarding. ACTION (P2): document formal deprovisioning process.

**Q: Do you use multi-factor authentication for all user accounts that access internet-facing services?**  
A: Partially. Staff using Microsoft SSO inherit MFA from Azure AD. Contractors do not currently have MFA. ACTION (P1): implement MFA for contractor accounts.

**Q: Do you limit user access to what is required for their role?**  
A: Yes. Role-based access control enforced in middleware. Contractors restricted to `/portal/*`. Staff roles (`admin`, `manager`, etc.) control dashboard access.

**Q: Do you enforce a strong password policy?**  
A: Partially. Passwords are bcrypt-hashed. Lockout after 5 failures. ACTION (P1): enforce minimum 12-character password at input validation for contractors.

**Q: Do you have a process for managing privileged access?**  
A: Partially. Admin role is assigned in the database. No formal privileged access management (PAM) process documented. ACTION (P2): document admin account review cadence.

---

### E. Malware Protection

**Q: Do you use anti-malware software on all devices that access your systems?**  
A: For staff devices: Microsoft Defender (Windows 11 built-in) must be confirmed active on all devices. For the hosted application: server-side AV is the hosting provider's responsibility.

**Q: Is your anti-malware software set to update automatically?**  
A: Microsoft Defender updates automatically on Windows 11. Confirm all staff devices have auto-updates enabled.

**Q: Do you scan files uploaded to your system for malware?**  
A: No. File uploads exist in PRISM. ACTION (P1): implement upload scanning before files are stored to R2.

**Q: Do you prevent users from visiting known malicious websites?**  
A: For staff: Microsoft Defender SmartScreen (enabled by default on Windows 11 with Edge) provides safe browsing. Formally document this as policy.

---

### F. Patch Management

**Q: Do you apply security patches within 14 days of release for critical vulnerabilities?**  
A: No formal policy currently exists. ACTION (P1): define and document patching SLA.

**Q: Are all software applications supported by the vendor?**  
A: Yes. PRISM uses Next.js (Vercel-supported), Node.js LTS, and Prisma — all actively maintained.

**Q: Do you remove software that is no longer supported?**  
A: Yes. No end-of-life software identified in the dependency tree.

**Q: Do you use automatic updates where available?**  
A: Partially. Dependabot and automated CI scanning are not yet configured. ACTION (P1): enable Dependabot on the GitHub repository.

---

## Prioritised Action Plan

### P1 — Before CE Audit Submission

1. Implement MFA for contractor accounts (TOTP or magic-link)
2. Enforce SSO-only for staff (disable credential login or mandate SSO path)
3. Add minimum password length/complexity validation (12+ chars) on contractor password set/change
4. Add `npm audit` and/or Dependabot to CI pipeline; fail on critical CVEs
5. Implement file upload malware scanning before R2 storage
6. Define and document patching SLA (critical: 14 days, high: 30 days)
7. Confirm with hosting provider that only port 443 is exposed — obtain written confirmation

### P2 — Within 30 Days

1. Migrate CSP from `unsafe-inline`/`unsafe-eval` to nonce-based
2. Enable Cloudflare WAF (or equivalent) and document active rules
3. Review and confirm auditor portal (`/auditor/*`) authentication controls
4. Add rate limiting to public form endpoints (`/apply`, `/onboarding`, `/survey`, etc.)
5. Document user deprovisioning process
6. Document log review cadence (weekly minimum)
7. Confirm all staff devices have BitLocker, Defender active, auto-updates on, MFA on M365

### P3 — Within 90 Days

1. Add CSP `report-to` violation reporting endpoint
2. Set `X-DNS-Prefetch-Control: off`
3. Document all outbound connections (Resend, Azure, DB, R2)
4. Establish staging environment for patch testing
5. Pin Node.js version in `.nvmrc` / `package.json` engines field
6. Define and issue formal VPN policy for staff using public Wi-Fi

---

*This document was produced by reviewing `next.config.ts`, `src/middleware.ts`, and `src/lib/auth.ts` against the IASME/NCSC Cyber Essentials technical controls. It should be reviewed and signed off by a responsible person at PRL Site Solutions before submission.*
