export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="text-center mb-8">
            <img src="/prl-logo.png" alt="PRL" className="mx-auto h-16 w-16 rounded-full mb-4" />
            <h1 className="text-2xl font-bold text-gray-900">Privacy Policy</h1>
            <p className="mt-1 text-sm text-gray-500">PRL Site Solutions Ltd — PRISM Platform</p>
            <p className="text-xs text-gray-400 mt-2">Version 1.0 | Effective: 24 March 2026 | Ref: PRL-PP-001</p>
          </div>

          <div className="prose prose-sm max-w-none text-gray-700 space-y-6">
            <section>
              <h2 className="text-lg font-semibold text-gray-900">1. Introduction</h2>
              <p>PRL Site Solutions Ltd (&quot;PRL&quot;, &quot;we&quot;, &quot;us&quot;) is committed to protecting the privacy and security of personal data belonging to our contractors, clients, suppliers, and website visitors.</p>
              <p>This Privacy Policy explains how we collect, use, store, and protect your personal information in accordance with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.</p>
              <p>PRL Site Solutions Ltd is the data controller for the personal data described in this policy.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900">2. Personal Data We Collect</h2>
              <h3 className="text-sm font-semibold text-gray-800 mt-3">2.1 Contractor Data</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>Full name, date of birth, and contact details (email, phone, address)</li>
                <li>National Insurance number and UTR number</li>
                <li>Emergency contact details</li>
                <li>CSCS card, DBS checks, right to work documentation, and qualifications</li>
                <li>IR35 status determination and assessment results</li>
                <li>Professional insurance certificates</li>
                <li>Timesheet data including hours worked and overtime</li>
                <li>Assignment history and performance records</li>
              </ul>
              <h3 className="text-sm font-semibold text-gray-800 mt-3">2.2 Client and Supplier Data</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>Company name, registration number, and address</li>
                <li>Contact person details and contract information</li>
                <li>Invoice and payment information</li>
              </ul>
              <h3 className="text-sm font-semibold text-gray-800 mt-3">2.3 System Data</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>Login credentials (email and encrypted password)</li>
                <li>System activity logs and audit trail data</li>
                <li>Session cookies (essential only)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900">3. Legal Basis for Processing</h2>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li><strong>Contract Performance</strong> (Article 6(1)(b)) — to fulfil contractual obligations</li>
                <li><strong>Legal Obligation</strong> (Article 6(1)(c)) — required by employment law, tax regulations, and H&amp;S legislation</li>
                <li><strong>Legitimate Interests</strong> (Article 6(1)(f)) — for workforce planning, quality management, and fraud prevention</li>
                <li><strong>Consent</strong> (Article 6(1)(a)) — where applicable, you may withdraw consent at any time</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900">4. How We Use Your Data</h2>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>Contractor recruitment, onboarding, and placement management</li>
                <li>Compliance verification (right to work, CSCS, DBS, IR35)</li>
                <li>Timesheet processing, approval, and payroll/invoicing</li>
                <li>Health and safety management and emergency contact purposes</li>
                <li>Quality management and ISO 9001 compliance</li>
                <li>System security, audit, and fraud prevention</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900">5. Data Sharing</h2>
              <p>We may share data with: client companies (for placements), umbrella companies (for payroll), HMRC (legal requirement), cloud service providers (hosting), and auditors (ISO compliance). We do not sell personal data to third parties.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900">6. Data Storage and Security</h2>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>All data encrypted in transit (TLS/SSL) and at rest</li>
                <li>Passwords stored using bcrypt hashing (industry standard)</li>
                <li>Role-based access control with unique credentials</li>
                <li>Full audit trail on all system actions</li>
                <li>Sensitive data (NI numbers, UTR) masked in display</li>
                <li>Medical data classified as special category with restricted access</li>
                <li>Cloud infrastructure on SOC 2-compliant platforms with automated backups</li>
                <li>Security headers enforced (HSTS, CSP, X-Frame-Options)</li>
                <li>Rate limiting on authentication endpoints</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900">7. Data Retention</h2>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>Active contractor records — duration of engagement plus 6 years</li>
                <li>Compliance documents — 6 years after expiry</li>
                <li>Timesheet and payroll data — 6 years (HMRC requirement)</li>
                <li>Client and supplier records — 6 years after end of contract</li>
                <li>System audit logs — 3 years</li>
                <li>Unsuccessful applicant data — 12 months</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900">8. Your Rights</h2>
              <p>Under UK GDPR, you have the right to:</p>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li><strong>Access</strong> — request a copy of your personal data</li>
                <li><strong>Rectification</strong> — request correction of inaccurate data</li>
                <li><strong>Erasure</strong> — request deletion where no compelling reason to continue processing</li>
                <li><strong>Restrict Processing</strong> — request limitation of data use</li>
                <li><strong>Data Portability</strong> — receive your data in a structured format</li>
                <li><strong>Object</strong> — object to processing based on legitimate interests</li>
              </ul>
              <p className="mt-2">To exercise these rights, contact us at <strong>info@prlsitesolutions.co.uk</strong> or call <strong>0800 772 3959</strong>. We will respond within one calendar month.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900">9. Cookies</h2>
              <p>We use essential cookies only for authentication and session management. No advertising or analytics cookies are used.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900">10. Contact & Complaints</h2>
              <p>Data Protection Contact: <strong>info@prlsitesolutions.co.uk</strong> | <strong>0800 772 3959</strong></p>
              <p>If unsatisfied, you may lodge a complaint with the ICO: <strong>www.ico.org.uk</strong> | <strong>0303 123 1113</strong></p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900">11. Changes to This Policy</h2>
              <p>We may update this policy to reflect changes in practices or legal requirements. The current version is always available at this URL.</p>
            </section>

            <div className="mt-8 pt-6 border-t border-gray-200 text-xs text-gray-400">
              <p>Approved by: Adella Thomas, Director | Date: 24 March 2026 | Next Review: 24 March 2027</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
