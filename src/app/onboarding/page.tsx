"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PublicFormShell } from "@/components/public-form-shell";
import { AlreadyRegistered } from "@/components/already-registered";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  /**
   * Whether this contact email already belongs to a PRISM contractor.
   *
   * Checked as they leave the email box on step 1, so somebody already
   * registered is told before working through rates, right-to-work and
   * next-of-kin. See src/components/already-registered.tsx.
   */
  const [existing, setExisting] = useState<{ registered: boolean; hasLogin: boolean } | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [blockedAtSubmit, setBlockedAtSubmit] = useState(false);

  async function checkEmail(value: string) {
    const email = value.trim().toLowerCase();
    if (!email.includes("@")) {
      setExisting(null);
      return;
    }
    setCheckingEmail(true);
    try {
      const res = await fetch("/api/apply/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setExisting({ registered: Boolean(data.registered), hasLogin: Boolean(data.hasLogin) });
    } catch {
      // Never block onboarding on the check failing; the submit-time 409 is the
      // backstop.
      setExisting(null);
    } finally {
      setCheckingEmail(false);
    }
  }

  // Form state
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyRegNo, setCompanyRegNo] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const [supplyOf, setSupplyOf] = useState("");
  const [siteLocation, setSiteLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [breakdown, setBreakdown] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");

  const [detailsConfirmed, setDetailsConfirmed] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName, companyAddress, companyRegNo,
          contactName, contactEmail, contactPhone,
          supplyOf, siteLocation, startDate,
          breakdown: breakdown.split("\n").filter(Boolean),
          additionalInfo,
          detailsConfirmed,
          consentGiven,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        // Already registered — not something a retry fixes. Switch the page to
        // the "you already have an account" state instead of showing an error.
        if (res.status === 409 && data.alreadyRegistered) {
          setExisting({ registered: true, hasLogin: Boolean(data.hasLogin) });
          setBlockedAtSubmit(true);
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }
        throw new Error(data.error || "Submission failed");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (blockedAtSubmit && existing?.registered) {
    return <AlreadyRegistered email={contactEmail} hasLogin={existing.hasLogin} variant="page" />;
  }

  if (success) {
    return (
      <div className="min-h-screen bg-prism-canvas flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="rounded-lg border border-prism-line bg-prism-paper p-8 shadow-[0_1px_2px_rgb(27_36_48_/_6%)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-prism-ok/10 mb-4">
              <svg className="h-8 w-8 text-prism-ok" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-prism-ink mb-2">Agreement Submitted!</h1>
            <p className="text-sm text-gray-600 mb-4">
              Thank you, {contactName}. Your subcontractor agreement has been submitted to PRL Site Solutions for review.
            </p>
            <p className="text-xs text-gray-500">
              We&apos;ll be in touch shortly. If you have any questions, call us on <strong>0800 772 3959</strong> or email <strong>info@prlsitesolutions.co.uk</strong>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PublicFormShell title="Subcontractor Agreement">
      <div className="mx-auto max-w-3xl px-4 py-6">
        {/* Intro */}
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-900">
            This agreement is issued in conjunction with our Terms of Business. Please complete all sections below.
            Contact us on <strong>0800 772 3959</strong> or <strong>info@prlsitesolutions.co.uk</strong> with any queries.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-6 flex items-center gap-2">
          {[1, 2].map((s) => (
            <button
              key={s}
              onClick={() => setStep(s)}
              className={`flex-1 rounded-lg py-2 text-center text-xs font-medium transition-colors ${
                step === s
                  ? "bg-[#005f8c] text-white"
                  : step > s
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {s === 1 ? "Company Details" : "Supply Details"}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Step 1: Company Details */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Company Details</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                  <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Address</label>
                  <textarea value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} rows={2}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Person</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input type="email" value={contactEmail}
                    onChange={(e) => { setContactEmail(e.target.value); if (existing) setExisting(null); }}
                    onBlur={(e) => checkEmail(e.target.value)} required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            {checkingEmail && (
              <p className="text-xs text-gray-500" aria-live="polite">Checking…</p>
            )}

            {existing?.registered && (
              <AlreadyRegistered email={contactEmail} hasLogin={existing.hasLogin} />
            )}

            <button
              onClick={() => setStep(2)}
              disabled={!companyName || !contactName || !contactEmail || existing?.registered}
              className="w-full rounded-xl bg-[#005f8c] px-4 py-3 text-sm font-semibold text-white hover:bg-[#004a6b] disabled:opacity-50 transition-colors"
            >
              Next: Supply Details →
            </button>
          </div>
        )}

        {/* Step 2: Supply & Rates */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Supply Details</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">For the Supply of</label>
                  <input type="text" value={supplyOf} onChange={(e) => setSupplyOf(e.target.value)}
                    placeholder="e.g. Bolting Technicians, Electricians"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Site Location</label>
                  <input type="text" value={siteLocation} onChange={(e) => setSiteLocation(e.target.value)}
                    placeholder="e.g. UK Wide, Manchester"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Breakdown &amp; Additional Info</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Breakdown (one line per item)</label>
                  <textarea value={breakdown} onChange={(e) => setBreakdown(e.target.value)} rows={3}
                    placeholder={"First 40 hrs Mon-Fri (including breaks)\nAfter 40 hrs Mon-Fri & all hrs Saturday\nAll hrs Sunday"}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Additional Information</label>
                  <textarea value={additionalInfo} onChange={(e) => setAdditionalInfo(e.target.value)} rows={3}
                    placeholder="e.g. Breaks to be paid (15 min, 30 min, 15 min)"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={detailsConfirmed}
                  onChange={(e) => setDetailsConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-xs text-red-800">
                  I declare that all details provided in this form — including my medical history and any
                  health conditions relevant to my fitness to work — are true, complete and accurate. I
                  understand that withholding or misrepresenting this information could affect site safety,
                  insurance cover, and my engagement with PRL Site Solutions.
                </span>
              </label>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-amber-800">
                  I consent to PRL Site Solutions processing my data as described in the{" "}
                  <a href="/privacy" className="underline text-blue-700 hover:text-blue-900" target="_blank" rel="noopener noreferrer">
                    Privacy Policy
                  </a>. I confirm the information provided is accurate.
                </span>
              </label>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)}
                className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || existing?.registered || !companyName || !contactName || !contactEmail || !detailsConfirmed || !consentGiven}
                className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? "Submitting..." : "Submit Agreement ✓"}
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-prism-ink-muted pb-8">
          <p>PRL Site Solutions | 0800 772 3959 | info@prlsitesolutions.co.uk</p>
          <p className="mt-1">259 Wallasey Village, Wallasey, Wirral, Merseyside CH45 3LR | Company Reg: 14358717</p>
        </div>
      </div>
    </PublicFormShell>
  );
}
