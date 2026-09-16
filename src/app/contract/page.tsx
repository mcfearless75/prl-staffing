import { PrintButton } from "@/app/(dashboard)/compliance/report/print-button";

export const dynamic = "force-dynamic";

const TODAY = new Date().toLocaleDateString("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default function ContractPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 print:bg-white print:py-0 print:px-0">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 print:shadow-none print:border-none">

        {/* Header */}
        <div className="border-b border-gray-200 px-10 py-8 print:px-8 print:py-6">
          <div className="flex items-start justify-between">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/prl-logo.png" alt="PRL Site Solutions" className="h-14 w-14 rounded-full mb-4 print:h-12 print:w-12" />
              <h1 className="text-2xl font-bold text-gray-900">Software Services Agreement</h1>
              <p className="text-sm text-gray-500 mt-1">PRISM — Contractor Management Portal</p>
            </div>
            <div className="text-right text-sm text-gray-500">
              <p className="font-medium text-gray-700">Date</p>
              <p>{TODAY}</p>
            </div>
          </div>
        </div>

        <div className="px-10 py-8 print:px-8 space-y-8 text-gray-700">

          {/* Parties */}
          <section>
            <h2 className="text-base font-bold text-gray-900 uppercase tracking-wide mb-4 border-b pb-2">1. Parties</h2>
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 print:bg-white">
                <p className="font-semibold text-gray-800 mb-2">Service Provider</p>
                <p className="font-medium">RuFlo Digital Ltd</p>
                <p className="text-gray-500 text-xs mt-1">("the Developer")</p>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-400">Signature: ___________________</p>
                  <p className="text-xs text-gray-400 mt-2">Date: ______________________</p>
                </div>
              </div>
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 print:bg-white">
                <p className="font-semibold text-gray-800 mb-2">Client</p>
                <p className="font-medium">PRL Site Solutions</p>
                <p className="text-gray-500 text-xs mt-1">("the Client")</p>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-400">Signature: ___________________</p>
                  <p className="text-xs text-gray-400 mt-2">Date: ______________________</p>
                </div>
              </div>
            </div>
          </section>

          {/* Scope */}
          <section>
            <h2 className="text-base font-bold text-gray-900 uppercase tracking-wide mb-4 border-b pb-2">2. Scope of Work</h2>
            <p className="text-sm leading-relaxed mb-3">
              The Developer has designed, developed, and delivered the <strong>PRISM Contractor Management Portal</strong> — a bespoke web application hosted at{" "}
              <span className="font-medium text-blue-700">www.prismworkforce.online</span>, including the following core modules as at the date of this Agreement:
            </p>
            <ul className="text-sm space-y-1.5 pl-4 list-none">
              {[
                "Contractor database — profile management, emergency contacts, compliance records",
                "Staff administration portal with role-based access control",
                "Contractor self-service portal (PRISM) — timesheets, payslips, pay queries, documents",
                "Timesheet submission, approval, and billing workflow",
                "Onboarding module — new starter forms, document collection",
                "Compliance tracking — document expiry alerts and verification",
                "Assignment and company management",
                "Supplier and rates management",
                "Email campaign module — invite tracking, open tracking",
                "Microsoft 365 SSO integration for PRL staff",
                "Secure contractor login with account lockout and password reset",
                "Activity audit log",
                "QMS and GDPR modules",
                "Intelligence / reporting dashboard",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-500 font-bold mt-0.5">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Payment */}
          <section>
            <h2 className="text-base font-bold text-gray-900 uppercase tracking-wide mb-4 border-b pb-2">3. Fees &amp; Payment</h2>

            <div className="rounded-lg border border-gray-200 overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Item</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Amount</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">Initial Development Fee</p>
                      <p className="text-xs text-gray-500">Full delivery of PRISM as described in Section 2</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-lg font-bold text-gray-900">£4,000</p>
                      <p className="text-xs text-gray-500">+ VAT if applicable</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      On signing of this Agreement
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">Monthly Support &amp; Hosting Retainer</p>
                      <p className="text-xs text-gray-500">Ongoing hosting, maintenance, bug fixes, and support</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-lg font-bold text-gray-900">£1,000<span className="text-sm font-normal text-gray-500">/month</span></p>
                      <p className="text-xs text-gray-500">+ VAT if applicable</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      1st of each month, by invoice
                    </td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">Total Year 1</td>
                    <td className="px-4 py-3 font-bold text-gray-900 text-lg">£16,000</td>
                    <td className="px-4 py-3 text-xs text-gray-500">£4k upfront + 12 × £1k</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm">
              <p className="font-semibold text-blue-800 mb-1">Payment terms</p>
              <p className="text-blue-700 leading-relaxed">
                Invoices are due within 14 days of issue. Late payments incur a statutory interest charge of 8% above the Bank of England base rate per annum under the Late Payment of Commercial Debts Act 1998. Monthly retainer invoices will be issued on the 1st of each calendar month.
              </p>
            </div>
          </section>

          {/* New Features */}
          <section>
            <h2 className="text-base font-bold text-gray-900 uppercase tracking-wide mb-4 border-b pb-2">4. New Features &amp; Additional Development</h2>
            <p className="text-sm leading-relaxed mb-3">
              Any features, modules, or integrations not described in Section 2 are outside the scope of this Agreement and the monthly retainer. New feature requests will be handled as follows:
            </p>
            <ol className="text-sm space-y-2 list-decimal pl-5">
              <li>The Client submits a written feature request describing the requirements.</li>
              <li>The Developer provides a written cost estimate and indicative timeline within 5 working days.</li>
              <li>Work commences only on written acceptance of the estimate by the Client.</li>
              <li>Additional features are invoiced separately — 50% on acceptance, 50% on delivery.</li>
            </ol>
            <p className="text-sm text-gray-500 mt-3">
              Day rate for additional development: <strong className="text-gray-700">£[TBC] per day</strong> (to be agreed in writing prior to each project).
            </p>
          </section>

          {/* Support & Hosting */}
          <section>
            <h2 className="text-base font-bold text-gray-900 uppercase tracking-wide mb-4 border-b pb-2">5. Support &amp; Hosting (Monthly Retainer)</h2>
            <p className="text-sm leading-relaxed mb-3">The monthly retainer of £1,000 covers:</p>
            <ul className="text-sm space-y-1.5 pl-4 list-none mb-4">
              {[
                "Application hosting on Railway cloud infrastructure",
                "Database hosting and automated backups",
                "Bug fixes arising from the delivered codebase",
                "Security patches and dependency updates",
                "Email delivery infrastructure (Resend)",
                "Up to 4 hours of minor amendments per month (styling, copy, small config changes)",
                "Technical support via email — response within 1 business day",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-blue-500 font-bold mt-0.5">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-gray-500">
              The retainer does <strong>not</strong> cover new feature development, third-party licence fees (e.g. Microsoft 365, Resend plan upgrades), or issues caused by third-party changes outside the Developer&apos;s control.
            </p>
          </section>

          {/* IP & Ownership */}
          <section>
            <h2 className="text-base font-bold text-gray-900 uppercase tracking-wide mb-4 border-b pb-2">6. Intellectual Property</h2>
            <p className="text-sm leading-relaxed">
              Upon receipt of the initial development fee of £4,000, full intellectual property rights to the PRISM codebase as described in Section 2 transfer to the Client. The Developer retains no rights to resell or redistribute the Client&apos;s specific implementation, data, or branding. Open-source dependencies remain subject to their respective licences.
            </p>
          </section>

          {/* Confidentiality */}
          <section>
            <h2 className="text-base font-bold text-gray-900 uppercase tracking-wide mb-4 border-b pb-2">7. Confidentiality</h2>
            <p className="text-sm leading-relaxed">
              Both parties agree to keep confidential all proprietary information, contractor data, business processes, and technical details shared under this Agreement. The Developer will not disclose, share, or use the Client&apos;s data for any purpose other than delivering the services described herein. This obligation survives termination of the Agreement.
            </p>
          </section>

          {/* Termination */}
          <section>
            <h2 className="text-base font-bold text-gray-900 uppercase tracking-wide mb-4 border-b pb-2">8. Termination</h2>
            <p className="text-sm leading-relaxed mb-2">
              Either party may terminate the monthly retainer with <strong>30 days&apos; written notice</strong>. On termination:
            </p>
            <ul className="text-sm space-y-1.5 pl-4 list-none">
              <li className="flex items-start gap-2"><span className="text-gray-400 mt-0.5">→</span><span>All outstanding invoices become immediately due and payable.</span></li>
              <li className="flex items-start gap-2"><span className="text-gray-400 mt-0.5">→</span><span>The Developer will provide a full export of the Client&apos;s data within 10 business days.</span></li>
              <li className="flex items-start gap-2"><span className="text-gray-400 mt-0.5">→</span><span>The Developer will provide reasonable handover assistance for up to 5 hours at no additional cost.</span></li>
              <li className="flex items-start gap-2"><span className="text-gray-400 mt-0.5">→</span><span>Hosting services will continue for 30 days post-notice to allow migration.</span></li>
            </ul>
          </section>

          {/* Liability */}
          <section>
            <h2 className="text-base font-bold text-gray-900 uppercase tracking-wide mb-4 border-b pb-2">9. Limitation of Liability</h2>
            <p className="text-sm leading-relaxed">
              The Developer&apos;s total liability under this Agreement shall not exceed the fees paid in the 3 months immediately preceding the event giving rise to the claim. Neither party shall be liable for indirect, consequential, or loss-of-profit damages. This does not limit liability for fraud, wilful misconduct, or death and personal injury caused by negligence.
            </p>
          </section>

          {/* Governing Law */}
          <section>
            <h2 className="text-base font-bold text-gray-900 uppercase tracking-wide mb-4 border-b pb-2">10. Governing Law</h2>
            <p className="text-sm leading-relaxed">
              This Agreement is governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.
            </p>
          </section>

          {/* Signatures */}
          <section className="mt-8 pt-6 border-t-2 border-gray-300">
            <h2 className="text-base font-bold text-gray-900 uppercase tracking-wide mb-6">Agreed and Signed</h2>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-4">For the Service Provider</p>
                <div className="space-y-4 text-sm">
                  <div className="border-b border-gray-300 pb-1">
                    <p className="text-xs text-gray-400 mb-1">Signature</p>
                    <div className="h-10" />
                  </div>
                  <div className="border-b border-gray-300 pb-1">
                    <p className="text-xs text-gray-400 mb-1">Full name</p>
                    <div className="h-6" />
                  </div>
                  <div className="border-b border-gray-300 pb-1">
                    <p className="text-xs text-gray-400 mb-1">Date</p>
                    <div className="h-6" />
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-4">For PRL Site Solutions</p>
                <div className="space-y-4 text-sm">
                  <div className="border-b border-gray-300 pb-1">
                    <p className="text-xs text-gray-400 mb-1">Signature</p>
                    <div className="h-10" />
                  </div>
                  <div className="border-b border-gray-300 pb-1">
                    <p className="text-xs text-gray-400 mb-1">Full name</p>
                    <div className="h-6" />
                  </div>
                  <div className="border-b border-gray-300 pb-1">
                    <p className="text-xs text-gray-400 mb-1">Date</p>
                    <div className="h-6" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Print button — hidden when printing. Must be the shared client
              component: an inline onClick here is an event handler crossing the
              server/client boundary, which threw at render and 500'd the page. */}
          <div className="mt-8 flex gap-3 print:hidden">
            <PrintButton
              label="Print / Save as PDF"
              className="flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
            />
            <a
              href="/"
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Back to dashboard
            </a>
          </div>

        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-10 py-4 print:px-8">
          <p className="text-xs text-gray-400 text-center">
            PRISM Contractor Management Portal · PRL Site Solutions · Confidential
          </p>
        </div>
      </div>
    </div>
  );
}
