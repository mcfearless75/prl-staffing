# Business Continuity and Disaster Recovery Plan
**Organisation:** PRL Site Solutions Ltd
**Version:** 1.0
**Effective Date:** May 2026
**Review Date:** May 2027
**Owner:** Managing Director

---

## 1. Purpose and Scope

This plan sets out how PRL Site Solutions Ltd ("PRL") will maintain essential business operations and recover critical systems in the event of a significant disruption.

**In scope:** All business-critical functions, IT systems, and data assets operated by PRL.

**Objectives:**
- Protect staff, contractors, and clients from the impact of disruption
- Maintain payment, compliance, and site staffing operations within agreed timeframes
- Recover IT systems within defined recovery time objectives (RTOs)
- Meet legal and contractual obligations during and after an incident

---

## 2. Business Impact Assessment

### 2.1 Critical Business Functions

| Function | Priority | Max Tolerable Downtime | RTO Target |
|---|---|---|---|
| Contractor payment processing | Critical | 48 hours | 24 hours |
| Site staffing coordination (phone/email) | Critical | 4 hours | 2 hours |
| Compliance record access | High | 72 hours | 48 hours |
| PRISM system (contractor management) | High | 72 hours | 48 hours |
| Client communication | High | 4 hours | 2 hours |
| Invoicing and accounts | Medium | 5 business days | 3 business days |
| Internal HR/admin | Low | 5 business days | 3 business days |

### 2.2 Critical Systems and Dependencies

| System | Function | Provider | Recovery Method |
|---|---|---|---|
| Microsoft 365 | Email, Teams, OneDrive, documents | Microsoft | Microsoft platform resilience; local copies on OneDrive |
| PRISM application | Contractor/compliance management | Railway (hosted) | Railway infrastructure; database backups |
| PostgreSQL database | Contractor data | Railway | Daily automated backups; point-in-time recovery |
| Cloudflare R2 | Compliance documents | Cloudflare | Cloudflare redundant storage |
| Mobile phones | Staff communication | O2 / Vodafone | Personal devices as fallback |
| Company laptops | Day-to-day operations | Windows 11 / OneDrive | Data synced to OneDrive; replacement device |

---

## 3. Threat Scenarios

| Scenario | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Staff member illness / unavailability | High | Medium | Cross-trained staff; documented processes |
| Laptop loss or theft | Medium | Medium | BitLocker encryption; OneDrive sync; remote wipe via M365 |
| Ransomware / malware attack | Medium | High | Defender AV; offline backups; M365 version history |
| Internet / ISP outage | Medium | High | Mobile data fallback; staff work from alternative location |
| Microsoft 365 outage | Low | High | Local OneDrive cache; alternative contact via mobile |
| Railway / PRISM outage | Low | High | Railway SLA; read-only compliance data export |
| Cloudflare R2 outage | Low | Medium | Cloudflare 99.9% SLA; local document cache |
| Office premises unavailable | Low | High | Remote working capability (all staff have laptops) |
| Key person loss (MD) | Low | High | Documented authority levels; named deputy |
| Data breach | Low | High | See Data Protection Policy; ICO notification within 72 hours |

---

## 4. Continuity Procedures

### 4.1 Loss of Premises / Office Access

PRL staff are equipped to work remotely. In the event of premises being unavailable:

1. MD activates remote working for all staff immediately
2. Communication switches to Microsoft Teams and mobile phones
3. Staff access PRISM and documents via browser (cloud-hosted)
4. Client and contractor calls handled via mobile
5. Post diverted or held — notify clients of alternative contact details
6. Alternative meeting space: local serviced office or client site (arrange as needed)

**Remote working is fully operational within 2 hours — no on-premises infrastructure dependency.**

### 4.2 Loss of Internet Connectivity

1. Staff switch to mobile data (personal hotspot where available)
2. Microsoft 365 — email and Teams available via mobile app
3. PRISM — accessible via mobile browser using hotspot
4. OneDrive — locally cached files available offline
5. If outage exceeds 4 hours, staff relocate to location with connectivity (home or co-working space)
6. Notify affected clients via mobile if email is impaired

### 4.3 Cyber Attack or Ransomware

**Immediate response:**
1. **Isolate** — disconnect affected device(s) from network immediately (unplug ethernet, disable Wi-Fi)
2. **Escalate** — notify MD within 30 minutes
3. **Assess** — determine which systems and data are affected
4. **Do not pay** any ransom demand
5. **Contact** cyber incident support: Action Fraud 0300 123 2040 / NCSC 0300 303 5222
6. **Preserve evidence** — do not power off devices unless advised

**Recovery:**
1. Restore affected systems from clean backups (see Section 5)
2. Reset all passwords and revoke active sessions
3. Enable MFA if not already active on affected accounts
4. Review and close the attack vector before reconnecting systems
5. Notify ICO within 72 hours if personal data was compromised (see Data Protection Policy)
6. Document the incident in the Incident Register

**Estimated recovery time: 24–48 hours (clean rebuild from backup)**

### 4.4 Loss of PRISM / Railway Outage

1. Check Railway status page: **status.railway.app**
2. If outage is confirmed on Railway's side — wait; Railway SLA is 99.9% uptime
3. For extended outage (>4 hours): switch to manual processes
   - Contractor contact list — maintained in M365 Contacts and as Excel export (updated weekly)
   - Compliance documents — accessible via Cloudflare R2 direct if PRISM UI is down
   - Timesheets — accept via email/WhatsApp as interim
4. Notify affected clients and contractors if operational impact is expected
5. Resume normal PRISM operation when Railway service restores

**Last Resort:** Railway provides database exports on request. An emergency export can be requested to restore to an alternative host if Railway is unavailable for >48 hours.

### 4.5 Loss of Microsoft 365 Access

1. Check Microsoft service status: **admin.microsoft.com / status**
2. For individual account lockout — contact GoDaddy M365 admin support
3. For platform-wide outage — use mobile phones for urgent communication
4. Locally cached OneDrive files remain accessible offline
5. Critical contractor contact details maintained as phone contacts on mobile

### 4.6 Key Person Unavailability

**If MD is unavailable:**
- Named deputy: [Operations Manager / Senior Staff Member — name to be inserted]
- Deputy has access to: M365 admin, PRISM admin, bank account authority
- Payroll instruction authority delegated to deputy for up to 30 days
- All critical passwords are held in password manager accessible to deputy

**If sole operator of a function:**
- Cross-training is required for all business-critical tasks
- Process documentation maintained in SharePoint/OneDrive
- Any single point of knowledge must have a documented handover note

---

## 5. Data Backup and Recovery

### 5.1 Backup Schedule

| Data | Backup Method | Frequency | Retention | Location |
|---|---|---|---|---|
| PostgreSQL (PRISM database) | Railway automated backups | Daily | 7 days rolling | Railway infrastructure |
| OneDrive / SharePoint | Microsoft 365 version history | Continuous | 180 days | Microsoft cloud |
| Compliance documents (R2) | Cloudflare redundant storage | Continuous | Until deleted | Cloudflare (multi-region) |
| Emails | Microsoft 365 (Exchange Online) | Continuous | Per retention policy | Microsoft cloud |
| Local files | OneDrive sync | Continuous | Version history 180 days | Microsoft cloud |

### 5.2 Backup Testing

- Railway database restore is tested **annually** by restoring to a staging environment
- OneDrive file recovery is tested **bi-annually** by recovering a test file
- Results documented in the IT Maintenance Log

### 5.3 Recovery Procedure — PRISM Database

1. Log into Railway dashboard
2. Navigate to the PostgreSQL service → Backups
3. Select the most recent clean backup (prior to incident)
4. Restore to production or a new Railway service
5. Update PRISM environment variables if new database URL is generated
6. Verify data integrity — spot check 10 contractor records
7. Notify staff that PRISM is restored

**Estimated restoration time: 2–4 hours**

### 5.4 Recovery Procedure — Laptop (Lost or Corrupted)

1. Obtain replacement device (laptop from stock or emergency purchase)
2. Sign in with staff member's Microsoft 365 account
3. OneDrive sync restores all documents automatically
4. Install required software: Microsoft 365 Apps, browser, any specialist tools
5. Staff member can resume full work within 4 hours of receiving replacement device

---

## 6. Communication Plan

### 6.1 Internal Communication

| Scenario | Primary Channel | Backup |
|---|---|---|
| Normal operations | Microsoft Teams / email | — |
| Teams / email unavailable | Mobile phone calls | WhatsApp group |
| Premises unavailable | Microsoft Teams (remote) | Mobile phone |
| Major incident | MD phones all staff directly | WhatsApp group |

**Emergency contact list** (maintained in MD's mobile and a printed copy in office):
- All staff mobile numbers
- Key contractor contacts
- Key client contacts

### 6.2 External Communication

| Stakeholder | Scenario | Method | Lead |
|---|---|---|---|
| Clients | Service disruption >4 hours | Phone / email | MD / Senior staff |
| Contractors | Payment delay | Email / phone | MD |
| ICO | Data breach (if notifiable) | Online report within 72 hours | MD |
| Insurance | Any major incident | Phone to broker | MD |
| HMRC | Payroll disruption | Phone | Payroll processor |

### 6.3 Client Communication Template (Major Disruption)

> Subject: Service Update — PRL Site Solutions
>
> Dear [Client Name],
>
> We are currently experiencing [brief description of issue] which is affecting [specific service]. We are working to resolve this and expect to be fully operational by [date/time].
>
> In the meantime, please contact [name] on [mobile] for any urgent requirements.
>
> We apologise for any inconvenience and will keep you updated.
>
> PRL Site Solutions

---

## 7. Incident Management

### 7.1 Incident Declaration

An incident is declared by the MD (or deputy) when a disruption:
- Affects a critical business function
- Is expected to last more than 2 hours
- Affects personal data (automatic declaration)

### 7.2 Incident Response Team

| Role | Name | Contact |
|---|---|---|
| Incident Lead | Managing Director | [Mobile] |
| Deputy Lead | [Operations Manager] | [Mobile] |
| IT contact | [IT Provider / internal] | [Contact] |
| Legal / DPO contact | [Solicitor / ICO] | ico.org.uk |

### 7.3 Incident Log

All incidents must be logged with:
- Date and time detected
- Date and time resolved
- Description of the incident
- Impact on operations and data
- Actions taken
- Lessons learned
- Whether ICO notification was required

Incident log is maintained in: **SharePoint / OneDrive → Admin → Incident Register**

---

## 8. Plan Testing and Maintenance

### 8.1 Testing Schedule

| Test Type | Frequency | Method |
|---|---|---|
| Plan review | Annual | MD and senior staff review |
| Database restore test | Annual | Restore to staging environment |
| Remote working test | Annual | All staff work remotely for one day |
| Communication cascade test | Annual | Verify all contact details are current |
| Backup file recovery test | Bi-annual | Recover test file from OneDrive history |

### 8.2 Trigger for Unscheduled Review

This plan must be reviewed immediately following:
- Any actual incident
- Significant change to IT systems or cloud providers
- Change in staff or key person responsibilities
- Change in business operations or client base
- Change in legislation or regulatory requirements

---

## 9. Insurance

PRL maintains the following insurance relevant to business continuity:

| Cover | Purpose |
|---|---|
| Business interruption | Income loss during disruption |
| Cyber liability | Costs of a cyber incident or breach |
| Professional indemnity | Claims arising from service failure |
| Employers liability | Statutory requirement |
| Public liability | Claims from third parties |

Review insurance covers annually with broker to ensure they remain appropriate.

---

## 10. Approval and Review

| Version | Date | Author | Approved By |
|---|---|---|---|
| 1.0 | May 2026 | PRL Site Solutions | Managing Director |

**Next review due:** May 2027

**Signed:** ___________________________
**Date:** ___________________________
