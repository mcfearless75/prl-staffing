# Cyber Essentials — IASME Danzell Question Set (v16.2, April 2026)
## Pre-filled Application — PRL Site Solutions Ltd
**Status:** Ready for submission — items marked ⚠️ need PRL to confirm before submitting
**Apply at:** https://iasme.co.uk/cyber-essentials/
**Estimated cost:** ~£300–£500 + VAT (self-assessment)
**Certificate valid:** 12 months — set renewal reminder for May 2027

---

## SECTION A1 — YOUR COMPANY

**A1.1 Organisation name**
PRL Site Solutions Ltd

**A1.2 Organisation type**
LTD — Limited Company

**A1.3 Number of employees**
⚠️ [Enter total headcount including agency workers and contractors who access organisational data]

**A1.4 Registration number**
⚠️ [Enter Companies House number — find at beta.companieshouse.gov.uk]

**A1.5 Registered address**
⚠️ [Enter registered address as shown on Companies House]

**A1.5.1 Operational address (if different)**
⚠️ [Enter office/operational address — exclude home worker addresses]

**A1.6 More than one legal entity in scope?**
No — PRL Site Solutions Ltd is the single legal entity

**A1.7 Main business**
Construction (Labour Supply / Site Staffing)

**A1.8 Website**
prlsitesolutions.co.uk

**A1.9 First time or renewal?**
First Time Application

**A1.10 Two main reasons for applying**
1. To generally improve our security
2. To give confidence to our customers

**A1.11 Have you read the CE Requirements for IT Infrastructure document?**
Yes — CE Requirements for IT Infrastructure v3.3 (April 2026) reviewed

**A1.12 Spoken to an assured NCSC Cyber Advisor?**
No

**A1.13 Can IASME contact you if you experience a breach?**
Yes

**A1.14 Where did you hear about Cyber Essentials?**
Internet Search / Other

**A1.15 Can IASME contact you for research purposes?**
Yes

**A1.16 Have you signed up to NCSC Early Warning Service?**
⚠️ Sign up at ncsc.gov.uk/early-warning-service (free, recommended before applying)

---

## SECTION A2 — SCOPE OF ASSESSMENT

**A2.1 Whole organisation or partial?**
Whole organisation

**A2.2 Scope description** *(only if partial — N/A)*
N/A

**A2.2.1 Excluded networks** *(N/A — whole org)*
N/A — no networks excluded

**A2.3 Networks used at company locations?**
Yes

**A2.3.1 Internet connection at each site?**
Yes

**A2.4 List of in-scope networks**
- Main office network at [office address] — used for all administrative and operational work
- Remote working — staff connect via home ISP router using software firewall on company laptops

**A2.4.1 How many staff are home or remote workers?**
⚠️ [Enter number of staff who have permission to work remotely — any who do so even occasionally must be included]

**A2.4.2 How do home/remote workers connect?**
Via home router (ISP-provided, not managed by PRL). Windows Defender Firewall is active on all laptops — this is the software firewall for remote connections. Staff access organisational data and services via browser (Microsoft 365, PRISM) and Microsoft 365 apps with MFA enforced.

**A2.5 Network equipment (firewalls/routers)**
⚠️ List your office router/firewall:
- [Make e.g. BT/Virgin/Draytek] [Model e.g. Business Hub 6] — quantity: 1 — office boundary router/firewall
- Note: All staff laptops use Windows Defender Firewall (software firewall) — active at all times including when connecting via home/public networks

**A2.6 Laptops, desktops and virtual desktops**
⚠️ IMPORTANT — you must provide make, Windows edition AND feature version:

Example format: "5 x Dell laptops running Windows 11 Professional 24H2"

Things to confirm:
- [ ] Make of laptops (Dell, HP, Lenovo, etc.)
- [ ] Exact Windows edition (Home, Pro, Enterprise)
- [ ] Feature version (check: Settings > System > About — look for "Version 24H2" or similar)
- [ ] **CRITICAL:** No devices must be running Windows 10 without ESU subscription (EOL Oct 14 2025)
- [ ] Any BYOD devices that access M365 or PRISM must also be listed

**A2.6.1 Thin clients** — None in use

**A2.7 Servers, virtual servers, VDI**
No on-premises servers. All services are cloud-hosted:
- PRISM application hosted on Railway (PaaS) — no server managed by PRL
- PostgreSQL database hosted on Railway (PaaS) — no server managed by PRL
Railway manages OS-level patching of underlying infrastructure.

**A2.8 Tablets and mobile devices**
⚠️ List all mobile devices where staff access organisational data (M365 email/Teams/PRISM):
- Personal smartphones (BYOD) used for Microsoft 365 (Outlook/Teams) — must be listed
- Example format: "iPhone iOS 18.x" or "Samsung Android 15"
- Note: Devices used ONLY for MFA app or voice/text calls are out of scope

**A2.9 Cloud services**
All cloud services in use (cloud services cannot be excluded from scope):

| Service | Type | Purpose |
|---|---|---|
| Microsoft 365 (GoDaddy-hosted) | SaaS | Email, Teams, OneDrive, SharePoint |
| Railway | PaaS | PRISM app hosting + PostgreSQL database |
| Cloudflare R2 | IaaS/SaaS | Document storage for compliance docs |
| GitHub (github.com) | SaaS | Code repository |
| Resend | SaaS | Transactional email (compliance notifications) |
| GoDaddy | SaaS | Domain + M365 admin |
| ⚠️ LinkedIn | SaaS | Business social media — accessed via work accounts |
| ⚠️ [Any other social media] | SaaS | List any Facebook/X/Instagram used for business |

Note: Social media accounts accessed via work accounts or email addresses are cloud services under CE definition.

**A2.10 Person responsible for managing IT systems**
⚠️ [Name] — [Role e.g. Managing Director / Office Manager]
Note: Must be a member of PRL staff, not an external IT provider.

---

## SECTION A3 — INSURANCE

**A3.1 Head office in UK and turnover less than £20m?**
Yes — PRL Site Solutions Ltd is UK-domiciled

**A3.2 Opt into included cyber insurance?**
⚠️ Recommended: Opt-in (free, no cost, included with certification)
Review policy terms at iasme.co.uk/cyber-essentials/cyber-liability-insurance

**A3.3 Organisation email for insurance documents**
⚠️ [Enter main business email e.g. info@prlsitesolutions.co.uk]

---

## SECTION A4 — FIREWALLS

**A4.1 Firewalls at boundaries between networks and internet?**
Yes — office network is protected by router/firewall at boundary. All staff laptops have Windows Defender Firewall enabled at all times including when connected to home/public networks.

**A4.1.1 Software firewalls enabled on all computers, laptops and servers?**
Yes — Windows Defender Firewall is enabled on all Windows 11 laptops. It is active at all times, including when behind the office router. Staff are not permitted to disable it.

**A4.2 Changed default passwords on all boundary firewall devices?**
Yes — the office router/firewall admin password has been changed from the manufacturer default to a strong, unique password.

**A4.2.1 Process for changing firewall password**
Access router admin interface via browser (192.168.x.x or device-specific address), navigate to Admin/Password settings, enter current and new password. New password is stored securely in the organisation's password manager. Process is carried out by [MD/IT lead] when required.

**A4.3 How is firewall password configured?**
⚠️ Select the option that applies to your office router:
- **Option A** — Multi-factor authentication, minimum 8-character password *(if your router admin supports MFA)*
- **Option C** — Minimum 12-character password, no maximum length *(most likely for office routers)*

For Windows Defender Firewall: Protected by Windows login credentials which use Microsoft 365 MFA (Option A).

**A4.4 Change firewall password when compromised?**
Yes — there is an established process to change router and Windows account passwords immediately if a compromise is known or suspected. MD is responsible for coordinating this.

**A4.5 Process to manage firewall?**
Yes — inbound connections are reviewed annually. Any requirement to open a port is approved by the MD, documented in writing, and reviewed to confirm it is still needed. No inbound ports are currently open beyond defaults.

**A4.6 Firewall rules reviewed in last 12 months?**
⚠️ Confirm: Has someone logged into the office router admin and checked that no unnecessary rules are open?
Process: MD or designated person reviews router settings annually, removes any rules no longer needed, and documents the review date. Review completed: [date].

**A4.7 Firewall configured to allow unauthenticated inbound connections?**
No — firewall blocks all unauthenticated inbound connections by default. Only outbound connections initiated by devices on the network are permitted.

**A4.8 How are allowed inbound connections approved and documented?**
No inbound connections are currently configured. If a business need arose, it would be approved in writing by the MD, documented with the business justification, and reviewed annually.

**A4.9 Boundary firewalls configured to allow access to configuration settings over the internet?**
No — router admin interface is only accessible from inside the office network. Remote administration is not enabled.

*(A4.10 and A4.11 — not applicable as A4.9 = No)*

---

## SECTION A5 — SECURE CONFIGURATION

**A5.1 Unnecessary software and services removed/disabled?**
Yes. Staff laptops run Windows 11 with standard configuration. Unnecessary Windows features (e.g. Remote Desktop, Telnet, FTP client) are disabled. No unnecessary software is installed. Cloud services (M365) are configured to enable only required features. AutoPlay is disabled.
Process: New devices are configured before issue, removing unnecessary software. Periodic review of installed apps via Settings > Apps.

**A5.2 Only necessary user accounts on all devices and cloud services?**
Yes. Each staff member has an individual Windows account and individual M365 account. Guest accounts and built-in administrator accounts are disabled on Windows laptops. M365 accounts are reviewed monthly and disabled within 24 hours of a staff departure.

**A5.3 Default passwords changed on all user and administrator accounts?**
Yes. No device retains a factory default password. Windows accounts require individual passwords set by each user. M365 enforces a minimum 12-character password with MFA.
Technical control: Multi-factor authentication (Option A — MFA with minimum 8-character password, no maximum length).

**A5.4 Do you run or host external services providing data access over the internet?**
Yes — PRISM, a web application providing contractor and compliance management, is hosted on Railway and accessed by PRL staff over the internet.

**A5.5 Authentication option for external services (PRISM)**
Option A — Multi-factor authentication.
PRISM staff accounts are protected by MFA enforced through Microsoft 365 (Conditional Access / SSO). Additionally, PRISM has rate limiting on login attempts (maximum 10 attempts per 5 minutes via in-app rate limiter). Passwords are stored as bcrypt hashes.

**A5.6 Process for changing passwords on external services when compromised**
If a compromise is known or suspected:
1. MD or IT lead immediately resets affected account password via M365 admin or PRISM admin interface
2. All active sessions are revoked
3. MFA methods are reviewed
4. Users are notified and required to change their passwords
5. Incident is logged

**A5.7 Brute-force protection on external services (when not using MFA)**
Not applicable — MFA is used on all external services. Additionally, PRISM has rate-limiting: max 10 attempts per 5 minutes (Option A — throttling).

**A5.8 Auto-run disabled for downloaded/imported files?**
Yes — Windows AutoPlay and AutoRun are disabled on all company laptops. Windows Defender SmartScreen is active and prompts users before running downloaded executables.

**A5.9 Device locking mechanisms set?**
Yes — all laptops require Windows login with password/PIN before access. Screen lock activates automatically after inactivity. Mobile devices require PIN/biometric to unlock.

**A5.10 Method used to unlock devices**
Laptops: Windows password (minimum 12 characters, protected by MFA for M365 services). Windows enforces lockout after 10 failed attempts (Windows default behaviour).
Mobile devices: PIN or biometric (fingerprint/face). Device manufacturer's default lockout settings apply.

---

## SECTION A6 — SECURITY UPDATE MANAGEMENT

**A6.1 All operating systems supported with regular security updates?**
Yes — all devices run Windows 11 (supported by Microsoft until at least 2031). No device runs Windows 10 or earlier without ESU subscription.
⚠️ Confirm: Check no device is running Windows 10 — EOL was October 14 2025.

**A6.2 All software supported with regular vulnerability fixes?**
Yes — all software in use is from supported vendors: Microsoft 365, Windows 11, Microsoft Edge/Chrome browsers. Unsupported software is not in use.

**A6.2.1 Internet browsers**
⚠️ List all browsers and their current version numbers:
- Microsoft Edge — Version [check: Edge menu > Help > About] e.g. "Edge 136.x"
- Google Chrome — Version [check: Chrome menu > Help > About] e.g. "Chrome 136.x" (if installed)
Both browsers receive automatic updates.

**A6.2.2 Malware protection software**
Microsoft Defender Antivirus — Version: ⚠️ [check: Windows Security > Virus & threat protection > About]
Example: "Microsoft Defender Antivirus — Definition version 1.425.x, Engine version 1.1.x"
Updates automatically via Windows Update.

**A6.2.3 Email applications**
Microsoft Outlook (Microsoft 365 Apps) — Version: ⚠️ [check: Outlook > File > Office Account > About Outlook]
Example: "Microsoft Outlook Version 2504 (Microsoft 365)"
Updates automatically via Microsoft 365.

**A6.2.4 Office applications**
Microsoft 365 Apps (Word, Excel, PowerPoint, Teams, OneDrive) — Version: ⚠️ [check: any Office app > File > Account > About]
Example: "Microsoft 365 Apps — Version 2504, Current Channel"
Updates automatically.

**A6.3 Any unlicensed or unsupported software?**
No — all software is licensed (Microsoft 365 subscription, Windows 11 OEM/Volume). No pirated or unsupported software in use.

**A6.4 High-risk/critical OS updates applied within 14 days?**
Yes — Windows Update is set to automatic on all devices. Critical and high-risk updates are applied automatically, typically within 24–72 hours of release, well within the 14-day requirement.

**A6.4.1 Auto updates enabled for operating systems?**
Yes — Windows Update is set to automatic on all laptops.

**A6.4.2 Where auto updates not used — how are updates applied?** *(N/A — all devices use auto updates)*
All devices use automatic Windows Update. N/A.

**A6.5 High-risk/critical application updates applied within 14 days?**
Yes — Microsoft 365 Apps, Edge, and Chrome update automatically. Critical updates are applied within the 14-day window via automatic update channels.

**A6.5.1 Auto updates enabled for applications?**
Yes — Microsoft 365 Apps update via Microsoft's automatic Current Channel. Edge and Chrome update automatically.

**A6.5.2 Where auto updates not used — how applied?** *(N/A)*
N/A — all applications use automatic updates.

**A6.6 Removed software no longer supported?**
Yes — no unsupported software is in use. When software reaches end-of-life, it is removed or replaced.

**A6.7 Unsupported software moved out of scope?**
Not applicable — no unsupported software is in use across the organisation.

---

## SECTION A7 — USER ACCESS CONTROL

**A7.1 User accounts only created after approval process?**
Yes. New staff accounts are created by the MD or designated administrator only after employment is confirmed. M365 accounts require admin approval to create. PRISM accounts are created by an admin user. No accounts are created without authorisation.

**A7.2 All user and admin accounts accessed with unique credentials?**
Yes — all accounts (Windows, M365, PRISM, cloud services) are individual, unique accounts. No shared accounts are in use.

**A7.3 Process for disabling accounts when staff leave?**
When a staff member leaves:
1. MD or admin is notified on or before last day
2. M365 account is disabled within 24 hours of departure (GoDaddy/M365 admin portal)
3. Active sessions are signed out remotely via M365 admin
4. PRISM account is disabled via admin interface
5. Windows laptop password is reset and device retrieved

**A7.4 Staff only have access privileges they need?**
Yes — principle of least privilege applied. Standard users have standard Windows and M365 accounts. Only the MD and designated administrator have M365 admin roles. PRISM access is role-based (staff vs admin). When roles change, access is reviewed and adjusted.

**A7.5 Formal process for granting administrator access?**
Yes — administrator access is granted only by the MD. Any request for admin-level access requires MD approval. This is documented (email or written record) before access is granted.

**A7.6 Separate accounts used for administrative tasks?**
⚠️ This is a common fail point — confirm the following is in place:
- The M365 global admin account is a SEPARATE account from the day-to-day user account (e.g., admin@prlsitesolutions.co.uk used only for admin tasks, not for email/browsing)
- The Windows local administrator account is not used for day-to-day work
- PRISM admin account used only for admin tasks

If the MD uses a single account for both admin and day-to-day work, this needs to be changed before applying.

**A7.7 Admin accounts not used for email/browsing?**
Yes — administrative accounts are used only for configuration and user management tasks. Day-to-day email, browsing and operational work is done on standard user accounts. Staff are trained on this policy.

**A7.8 Formally track who has administrator accounts?**
Yes — a record is maintained (spreadsheet or document) listing all accounts with administrator privileges across:
- M365 (admin portal shows all admin role assignments)
- Windows local admin accounts
- PRISM admin accounts
- Cloud service admin accounts (Railway, Cloudflare, GitHub, GoDaddy)

⚠️ Create this list if not already documented.

**A7.9 Administrator access reviewed regularly?**
Yes — admin access is reviewed annually (or when staff change roles). The MD reviews the admin account list and removes access that is no longer required.

**A7.10 Password brute-force protection**
All accounts are protected by multi-factor authentication (MFA), which is the primary protection. Additionally:
- M365: MFA enforced for all sign-ins. Account lockout after multiple failed attempts (Microsoft default)
- Windows: Lockout after 10 failed attempts (Windows default policy)
- PRISM: Rate limiting — max 10 attempts per 5 minutes, implemented via in-app middleware

**A7.11 Technical controls for password quality**
Multi-factor authentication (MFA) — using multi-factor authentication satisfies the password quality requirement.
- M365: MFA enforced via Microsoft Authenticator app for all users and admins
- PRISM: MFA via M365 (minimum 8-character password + authenticator app)
- All cloud services: MFA enabled

**A7.12 Encouraging unique and strong passwords**
- Staff are briefed at onboarding on password hygiene
- A password manager is available and recommended for all staff
- Staff are encouraged to use three-random-word passphrases (NCSC guidance)
- Regular password expiry is NOT enforced (in line with NCSC best practice)
- Password complexity requirements (special chars, numbers) are NOT enforced — length and uniqueness are prioritised

**A7.13 Process when passwords suspected compromised?**
Yes — established process:
1. Affected user or IT lead immediately changes the compromised password
2. Active sessions are signed out across all devices (M365 sign-out all devices)
3. MFA methods are reviewed and reset if necessary
4. Incident is logged
5. If personal data may have been accessed — DPP breach procedure is followed

**A7.14 Do all cloud services have MFA available?**
Yes — all cloud services used by PRL have MFA available:
- Microsoft 365 ✓
- GoDaddy ✓
- Railway ✓
- Cloudflare ✓
- GitHub ✓
- LinkedIn ✓ (⚠️ confirm MFA is enabled on business LinkedIn accounts)
- Resend ✓

**A7.15 Cloud services without MFA available** — N/A (all services support MFA)

**A7.16 MFA applied to all cloud service administrators?**
Yes — MFA is enforced on all admin accounts across M365, GoDaddy, Railway, Cloudflare, and GitHub.

**A7.17 MFA applied to all cloud service users?**
Yes — MFA is enforced for all M365 users (Conditional Access policy). All other cloud services have MFA enabled on the accounts used by PRL staff.

---

## SECTION A8 — MALWARE PROTECTION

**A8.1 Devices protected from malware?**
Option A — Anti-malware software installed on all Windows laptops (Microsoft Defender Antivirus).
Option B — Application allow listing: Windows Defender SmartScreen blocks unsigned/unrecognised applications. Staff are not permitted to install unsigned software. Mobile devices use app store restrictions (iOS App Store / Google Play) — only signed, store-approved apps.

**A8.2 Anti-malware set to update and prevent malware on detection?**
Yes — Microsoft Defender Antivirus is configured with:
- Automatic definition updates (via Windows Update and Microsoft Update)
- Real-time protection enabled — prevents malware from running on detection
- Periodic scanning (weekly full scan)
- Cloud-delivered protection enabled

**A8.3 Anti-malware set to scan web pages and warn about malicious sites?**
Yes — Microsoft Defender SmartScreen is enabled in Microsoft Edge (default browser) and blocks access to known phishing and malware sites. Microsoft 365 Defender provides Safe Links for email links.

**A8.4 Users restricted from installing unsigned applications?**
Yes — Windows Defender SmartScreen blocks execution of unrecognised or unsigned applications. Staff are instructed not to bypass SmartScreen warnings. Standard user accounts cannot install software without admin credentials.

**A8.5 Only approved applications installed, with maintained list?**
⚠️ Create and maintain an approved applications list. This does not require MDM software — a documented list of approved software is sufficient.
Current approved applications include:
- Microsoft 365 Apps (Word, Excel, Outlook, Teams, OneDrive)
- Microsoft Edge
- Google Chrome (if used)
- [Any other software — list here]
Staff are instructed to request any new software via the MD before installation.

---

## GAPS TO ADDRESS BEFORE SUBMITTING

| # | Item | Action Required |
|---|---|---|
| 1 | Windows version/edition | Check all laptops: Settings > System > About. Need edition (Pro/Home) and Version (24H2 etc.) |
| 2 | No Windows 10 devices | Confirm all laptops are Windows 11. Windows 10 is EOL since Oct 2025 |
| 3 | Mobile devices | List all phones/tablets used for M365 or PRISM (make + OS version) |
| 4 | Browser versions | Check Edge and Chrome version numbers |
| 5 | Defender version | Check Windows Security > Virus protection > About |
| 6 | Office/Outlook version | Check any Office app > File > Account > About |
| 7 | Router make/model | Check office router — needed for A2.5 |
| 8 | Router password process | Confirm default password was changed, document how to change it |
| 9 | Firewall rules reviewed | Log into router admin and confirm no unnecessary inbound rules — document date |
| 10 | Separate admin accounts | Confirm M365 admin is a separate account from day-to-day M365 account |
| 11 | Admin account register | Create a spreadsheet listing all admin accounts across all systems |
| 12 | Social media MFA | Enable MFA on LinkedIn and any other business social media accounts |
| 13 | NCSC Early Warning | Sign up at ncsc.gov.uk/early-warning-service (free) |
| 14 | Approved apps list | Document list of approved applications staff may install |
| 15 | Remote worker count | Count all staff permitted to work remotely |
| 16 | Companies House number | Needed for A1.4 |
| 17 | Staff count | Including anyone with access to org data |
| 18 | IT responsible person | Name and role of internal person managing IT |

---

## INSURANCE BONUS NOTE

PRL Site Solutions is UK-domiciled with turnover almost certainly under £20m — **you are eligible for free cyber liability insurance included with CE certification**. Opt in during the application. No cost. Cover typically includes:
- Incident response costs
- Legal and regulatory costs
- Business interruption
- PR and reputational costs
Review at: iasme.co.uk/cyber-essentials/cyber-liability-insurance
