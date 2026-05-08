# Cyber Essentials Application — PRL Site Solutions
**Scheme:** IASME Cyber Essentials (Self-Assessment)
**Certifying Body:** IASME / NCSC-approved assessor
**Applicant:** PRL Site Solutions Ltd
**Prepared:** May 2026
**Status:** Ready to submit

---

## Organisation Details

| Field | Answer |
|---|---|
| Organisation name | PRL Site Solutions Ltd |
| Sector | Construction / Labour Supply |
| Number of employees | < 50 |
| Do you use cloud services? | Yes |
| Do you use remote working? | Yes |
| Do you process personal data? | Yes |

---

## SECTION 1 — Firewalls

### 1.1 Boundary Firewall

**Q: Do all computers that connect directly to the internet have a boundary firewall in place?**

A: Yes. All staff laptops connect via Windows Firewall (enabled and enforced). Internet-facing services are hosted on Railway (cloud PaaS) which provides network-layer isolation. Cloudflare R2 storage is accessed via authenticated API only — no direct public exposure. No on-premises servers are directly internet-facing.

**Q: Is the firewall configured to block all inbound connections by default, unless explicitly permitted?**

A: Yes. Windows Firewall is set to block inbound connections by default on all profiles (Domain, Private, Public). Outbound connections are permitted. Railway and Cloudflare infrastructure handle their own perimeter firewall rules.

**Q: Are default firewall rules reviewed and unnecessary rules removed?**

A: Yes. Windows Firewall default rules are active. No custom inbound rules have been added beyond those required by Windows Update and Microsoft 365.

### 1.2 Software Firewall

**Q: Do all devices that could connect to untrusted networks have a software firewall enabled?**

A: Yes. Windows Defender Firewall is active on all Windows laptops. Auto-configured via Windows Security. Staff are not permitted to disable it.

---

## SECTION 2 — Secure Configuration

### 2.1 Default Passwords

**Q: Have all default passwords on devices and software been changed before use?**

A: Yes. All staff accounts require individual passwords set by the user. Microsoft 365 admin accounts have unique strong passwords. PRISM application uses bcrypt-hashed passwords with no default credentials. Router/access point default credentials are changed on setup.

### 2.2 Unnecessary Software and Services

**Q: Have unnecessary user accounts, software, and services been removed or disabled?**

A: Yes. Staff laptops are configured with standard Windows 11. Unnecessary Windows features and services are disabled or not installed. PRISM application runs only required services (Next.js, PostgreSQL via Railway). No legacy or unused software is knowingly retained.

### 2.3 Auto-Run / Auto-Play

**Q: Is AutoRun/AutoPlay disabled for removable media?**

A: Yes. AutoPlay is disabled on all company laptops via Windows settings.

### 2.4 Password Policy

**Q: Is a password policy enforced requiring passwords of sufficient strength?**

A: Yes. Microsoft 365 enforces a minimum 12-character password policy. PRISM application enforces minimum 8-character passwords with complexity requirements. Passwords are stored as bcrypt hashes (never plaintext).

---

## SECTION 3 — User Access Control

### 3.1 Standard User Accounts

**Q: Do standard users operate without administrator privileges for day-to-day activities?**

A: Yes. Staff use standard Windows accounts for day-to-day work. Administrator accounts are separate and only used when required for software installation or configuration.

### 3.2 Admin Account Restrictions

**Q: Are administrator accounts only used for administrative tasks?**

A: Yes. Microsoft 365 global admin accounts are separate from day-to-day user accounts. PRISM admin access is role-based — staff accounts have limited permissions.

### 3.3 Multi-Factor Authentication

**Q: Is multi-factor authentication (MFA) enabled for all internet-facing services, including cloud services and remote access?**

A: Yes. MFA is enforced on:
- Microsoft 365 (all accounts, including admin) — Authenticator app
- GoDaddy account — MFA enabled
- Railway (hosting) — MFA enabled
- Cloudflare (R2 storage) — MFA enabled
- GitHub (code repository) — MFA enabled

**Q: Is MFA required for privileged/admin accounts?**

A: Yes — all accounts listed above have MFA active. No exceptions.

### 3.4 Account Review

**Q: Are user accounts reviewed regularly, and are accounts for leavers disabled promptly?**

A: Yes. Microsoft 365 accounts are reviewed monthly. Leavers have accounts disabled within 24 hours of departure. The PRISM application has an admin interface for disabling contractor and staff accounts.

### 3.5 Password Manager / Unique Passwords

**Q: Are unique passwords used for all accounts, particularly admin and cloud service accounts?**

A: Yes. Staff are required to use unique passwords per service. A password manager is recommended and in use by key staff.

---

## SECTION 4 — Malware Protection

### 4.1 Anti-Malware Software

**Q: Is anti-malware software installed, active, and kept up to date on all devices?**

A: Yes. Windows Defender Antivirus is enabled on all Windows laptops with real-time protection active. Signature updates are automatic via Windows Update. No devices are excluded from protection.

**Q: Is the anti-malware software set to scan files automatically?**

A: Yes. Windows Defender real-time protection scans files on access. Scheduled weekly full scans are also active.

### 4.2 Malicious Websites

**Q: Is web browsing filtered to block access to known malicious websites?**

A: Yes. Microsoft Defender SmartScreen is enabled in Microsoft Edge (default browser) and blocks access to known phishing and malware sites. Microsoft 365 Defender provides Safe Links protection for email.

### 4.3 Code Execution

**Q: Are controls in place to prevent execution of untrusted code?**

A: Yes. Windows Defender Application Guard and SmartScreen block execution of unrecognised applications. Staff do not have permission to disable these controls.

---

## SECTION 5 — Patch Management

### 5.1 Operating System Updates

**Q: Is the operating system on all in-scope devices kept up to date with security patches?**

A: Yes. Windows Update is set to automatic on all laptops. Security patches are applied within 14 days of release (typically within 48–72 hours via automatic updates). Windows 11 is the operating system in use — all devices are within Microsoft's support lifecycle.

### 5.2 Application Updates

**Q: Are all applications on in-scope devices kept up to date?**

A: Yes. Microsoft 365 apps update automatically via Microsoft's update channel. Third-party applications are reviewed and updated regularly. Unsupported or end-of-life applications are not in use.

### 5.3 Firmware Updates

**Q: Is device firmware (BIOS/UEFI) kept up to date?**

A: Yes. Laptop manufacturer firmware updates are applied when available via Windows Update (where supported) or manually on an ad-hoc basis.

### 5.4 Cloud Services

**Q: Are cloud services and hosted applications kept patched and up to date?**

A: Yes. PRISM application (Next.js) dependencies are reviewed and updated regularly using `npm audit`. Railway (hosting platform) manages OS-level patching of the underlying infrastructure. Cloudflare R2 is a managed service with no patching required by PRL.

---

## Known Exceptions / Accepted Risks

| Item | Risk | Mitigation | Status |
|---|---|---|---|
| postcss dependency (transitive via Next.js) | Moderate — inside Next.js internals, not directly exploitable | Mitigated by Next.js upgrade path; not directly accessible | Accepted — vendor risk, tracked |
| GitHub Dependabot alerts (2 moderate) | Moderate | Under review — to be resolved in next sprint | In progress |

---

## In-Scope Devices

All company-owned Windows laptops used by PRL Site Solutions staff.

Cloud services in scope:
- Microsoft 365 (GoDaddy-hosted)
- Railway (PRISM app hosting)
- Cloudflare R2 (document storage)
- GitHub (code repository)

---

## Certification Checklist

- [x] Firewalls enabled and configured on all devices
- [x] Default passwords changed on all systems
- [x] MFA enabled on all internet-facing accounts
- [x] Standard user accounts in use (no admin for day-to-day)
- [x] Windows Defender active on all devices
- [x] Automatic updates enabled — patches applied within 14 days
- [x] User accounts reviewed — leavers removed promptly
- [x] AutoPlay disabled
- [x] No unsupported operating systems in use
- [x] Web filtering active (Defender SmartScreen)

**Readiness assessment: PASS — ready to submit application**

---

## Next Steps to Apply

1. Go to **https://iasme.co.uk/cyber-essentials/** and select "Apply for Cyber Essentials"
2. Choose self-assessment (Cyber Essentials) or with assessor verification (Cyber Essentials Plus)
3. Create an account and complete the online questionnaire using the answers above
4. Estimated cost: £300–£500 + VAT (self-assessment)
5. Certificate valid for 12 months — set a renewal reminder for May 2027
