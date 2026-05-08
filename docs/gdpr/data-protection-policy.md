# Data Protection Policy
**Organisation:** PRL Site Solutions Ltd
**Version:** 1.0
**Effective Date:** May 2026
**Review Date:** May 2027
**Owner:** Managing Director

---

## 1. Purpose

This policy sets out how PRL Site Solutions Ltd ("PRL", "we", "us") collects, uses, stores, and protects personal data. It applies to all staff, contractors, and third parties who process personal data on behalf of PRL.

PRL is committed to complying with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.

---

## 2. Scope

This policy applies to:
- All personal data processed by PRL, in any format (digital or paper)
- All PRL staff (permanent, temporary, and agency)
- All contractors and sub-contractors who access PRL systems or data
- All third-party suppliers who process data on PRL's behalf

---

## 3. Data Protection Principles

Under UK GDPR, PRL must ensure that personal data is:

1. **Lawfully, fairly, and transparently processed** — we have a lawful basis for every use of personal data and we are open about how we use it
2. **Collected for specified, explicit, and legitimate purposes** — data is not used for purposes beyond what was originally intended
3. **Adequate, relevant, and limited** — we only collect what we need (data minimisation)
4. **Accurate and kept up to date** — we take reasonable steps to correct inaccurate data
5. **Kept no longer than necessary** — we delete data when it is no longer needed
6. **Kept secure** — we protect personal data against unauthorised access, loss, or destruction

---

## 4. Lawful Basis for Processing

PRL processes personal data on the following legal bases:

| Data Type | Lawful Basis |
|---|---|
| Staff employment records | Contract / Legal obligation |
| Contractor records (name, address, NI, bank details) | Contract |
| Compliance documents (CSCS, insurances, qualifications) | Legal obligation / Legitimate interests |
| Site attendance and timesheets | Contract / Legitimate interests |
| Marketing to prospective clients | Legitimate interests |
| CV and application data | Consent / Pre-contractual |
| Health and safety records | Legal obligation |
| CCTV (if applicable on managed sites) | Legitimate interests |

---

## 5. What Personal Data We Hold

### 5.1 Contractors and Workers

- Full name, date of birth, address, contact details
- National Insurance number
- Bank account details (for payroll)
- Emergency contact details
- CSCS card number and qualification certificates
- Insurance certificates (PLI, ELI)
- Right to work documentation
- Site attendance records and timesheets
- Compliance status (PRISM system)

### 5.2 Clients and Contacts

- Business contact details (name, email, telephone)
- Company name and address
- Contract and invoice records

### 5.3 Staff (Employees)

- Full name, address, date of birth, NI number
- Employment contract details
- Payroll and tax records
- Holiday and absence records
- Training records
- Disciplinary records (where applicable)

---

## 6. Data Storage and Security

### 6.1 Digital Data

- Contractor and compliance records are stored in the PRISM system, hosted on Railway (UK/EU data centres) with PostgreSQL database
- Documents are stored in Cloudflare R2 (encrypted at rest)
- Microsoft 365 (hosted by Microsoft in UK/EU) is used for email, documents, and communication
- Access to PRISM requires authenticated login with role-based permissions
- The ISO 9001 Auditor portal uses JWT authentication with httpOnly cookies

### 6.2 Physical Data

- Any paper records containing personal data are stored in locked filing cabinets
- Paper records are not left unattended in public areas
- Sensitive paper records are shredded using a cross-cut shredder when no longer needed

### 6.3 Security Controls

- Multi-factor authentication is required for all cloud accounts
- Passwords must be a minimum of 12 characters and unique per service
- Windows Defender Antivirus with real-time protection is active on all company devices
- Windows Update is set to automatic — security patches applied within 14 days
- BitLocker encryption is enabled on laptops that hold or can access company data
- All staff complete data protection awareness training on joining

---

## 7. Data Retention

| Category | Retention Period | Basis |
|---|---|---|
| Contractor compliance records | 6 years after last engagement | Legal obligation (HMRC, H&S) |
| Payroll records | 7 years | HMRC requirement |
| Employment contracts | 6 years after employment ends | Limitation Act 1980 |
| Application/CV data (unsuccessful) | 6 months | ICO guidance |
| Site attendance records | 3 years | Legitimate interests |
| CCTV footage (if applicable) | 31 days | ICO guidance |
| Marketing contact data | Until consent withdrawn or 3 years inactive | Consent / Legitimate interests |
| Accident/incident records | 3 years (minor), 11 years (children) | RIDDOR requirement |

Data is deleted or anonymised at the end of its retention period. PRISM system records are marked for deletion and removed in quarterly reviews.

---

## 8. Data Subject Rights

Under UK GDPR, individuals have the following rights:

| Right | How to Exercise | Our Response Time |
|---|---|---|
| Right of access (Subject Access Request) | Email info@prlsitesolutions.co.uk | Within 1 calendar month |
| Right to rectification | Email or written request | Within 1 calendar month |
| Right to erasure ("right to be forgotten") | Email or written request | Within 1 calendar month (subject to legal retention obligations) |
| Right to restrict processing | Email or written request | Within 1 calendar month |
| Right to data portability | Email or written request | Within 1 calendar month |
| Right to object | Email or written request | Within 1 calendar month |
| Rights related to automated decision-making | Email or written request | Within 1 calendar month |

To exercise any right, contact: **info@prlsitesolutions.co.uk** or write to our registered address.

We do not charge a fee for Subject Access Requests unless they are manifestly unfounded or excessive.

---

## 9. Data Sharing and Third Parties

### 9.1 Permitted Sharing

We may share personal data with:
- HMRC and government agencies (legal obligation)
- Pension providers (legal obligation)
- Payroll processors (contractual necessity)
- Site clients — limited to name, qualifications, and compliance status only
- Insurance providers
- IT service providers (under Data Processing Agreements)

### 9.2 Third-Party Processors

The following third parties process data on our behalf under written agreements:

| Processor | Purpose | Location |
|---|---|---|
| Railway (Diode) | PRISM app hosting and database | EU/US (adequacy/SCCs) |
| Cloudflare | Document storage (R2) | EU |
| Microsoft | M365 email, OneDrive, Teams | UK/EU |
| Resend | Compliance email notifications | EU |
| GoDaddy | Domain and email hosting | UK/EU |

All processors are required to process data only on our instructions and to maintain appropriate security.

### 9.3 International Transfers

Where data is transferred outside the UK/EEA, we ensure appropriate safeguards are in place (UK adequacy decision, Standard Contractual Clauses, or equivalent).

---

## 10. Data Breach Procedure

### 10.1 What Constitutes a Breach

A personal data breach is any security incident leading to the accidental or unlawful destruction, loss, alteration, unauthorised disclosure of, or access to personal data.

### 10.2 Response Steps

1. **Contain** — stop the breach from continuing (e.g. revoke access, isolate system)
2. **Assess** — determine what data was affected and how many individuals
3. **Notify the ICO** — if the breach is likely to result in a risk to individuals, notify the Information Commissioner's Office within **72 hours** of becoming aware at **https://ico.org.uk/report-a-breach/**
4. **Notify individuals** — if the breach is likely to result in high risk to individuals, notify them without undue delay
5. **Document** — record all breaches in the Breach Register, regardless of whether ICO notification is required

### 10.3 Reporting Internally

All staff must report any actual or suspected data breach immediately to the Managing Director. Do not attempt to investigate or contain alone — escalate immediately.

---

## 11. Responsibilities

| Role | Responsibility |
|---|---|
| Managing Director | Overall accountability for data protection compliance |
| All Staff | Follow this policy; report breaches immediately |
| IT / System Admin | Implement technical security controls |
| Line Managers | Ensure their teams receive training and follow this policy |

PRL does not have a statutory obligation to appoint a Data Protection Officer (DPO) at current size, but the Managing Director acts as the designated data protection lead.

---

## 12. Training

All staff receive data protection awareness training:
- On joining PRL
- Annually thereafter
- When this policy is significantly updated

Training covers: what personal data is, lawful bases, data subject rights, how to handle a breach, and safe data practices.

---

## 13. Privacy Notice

PRL's Privacy Notice, setting out how we process personal data for contractors and clients, is available at **[prlsitesolutions.co.uk/privacy]** and is provided to individuals at the point of data collection.

---

## 14. Policy Review

This policy is reviewed annually, or sooner if there is a significant change in legislation, a data breach, or a material change to how PRL processes data.

| Version | Date | Change |
|---|---|---|
| 1.0 | May 2026 | Initial policy |

**Approved by:** [Managing Director signature]
**Date:** May 2026
