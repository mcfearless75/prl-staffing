"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_RATES = [
  { description: "Basic Rate (Day)", rate: "", basis: "Per Hour" },
  { description: "Basic Rate (Night)", rate: "", basis: "Per Hour" },
  { description: "Overtime Rate (1)", rate: "", basis: "Per Hour" },
  { description: "Overtime Rate (2)", rate: "", basis: "Per Hour" },
  { description: "Expenses", rate: "", basis: "Per Day" },
  { description: "Lodge", rate: "", basis: "" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

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
  const [rates, setRates] = useState(DEFAULT_RATES);
  const [breakdown, setBreakdown] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [niNumber, setNiNumber] = useState("");
  const [utrNumber, setUtrNumber] = useState("");
  const [address, setAddress] = useState("");
  const [postcode, setPostcode] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyRelation, setEmergencyRelation] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);

  function updateRate(idx: number, field: string, value: string) {
    const updated = [...rates];
    (updated[idx] as Record<string, string>)[field] = value;
    setRates(updated);
  }

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
          rates, breakdown: breakdown.split("\n").filter(Boolean),
          additionalInfo,
          firstName, lastName, dateOfBirth, niNumber, utrNumber,
          address, postcode,
          emergencyContactName: emergencyName,
          emergencyContactPhone: emergencyPhone,
          emergencyContactRelation: emergencyRelation,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Submission failed");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="rounded-xl border border-emerald-200 bg-white p-8 shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mb-4">
              <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Agreement Submitted!</h1>
            <p className="text-sm text-gray-600 mb-4">
              Thank you, {contactName || firstName}. Your supply agreement has been submitted to PRL Site Solutions for review.
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#005f8c] text-white">
        <div className="mx-auto max-w-3xl px-4 py-6 flex items-center gap-4">
          <img src="/prl_logo.jpg" alt="PRL" width={56} height={56} className="rounded-full border-2 border-white/30" />
          <div>
            <h1 className="text-xl font-bold">Supply Agreement</h1>
            <p className="text-sm text-blue-100">PRL Site Solutions — Recruitment Specialists</p>
          </div>
        </div>
      </header>

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
          {[1, 2, 3].map((s) => (
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
              {s === 1 ? "Company Details" : s === 2 ? "Supply & Rates" : "Personal & Emergency"}
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Reg No</label>
                  <input type="text" value={companyRegNo} onChange={(e) => setCompanyRegNo(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
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
                  <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!companyName || !contactName || !contactEmail}
              className="w-full rounded-xl bg-[#005f8c] px-4 py-3 text-sm font-semibold text-white hover:bg-[#004a6b] disabled:opacity-50 transition-colors"
            >
              Next: Supply &amp; Rates →
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
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Charge Rates</h2>
              <div className="space-y-3">
                {rates.map((r, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2">
                    <input type="text" value={r.description} onChange={(e) => updateRate(i, "description", e.target.value)}
                      placeholder="Description"
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                    <input type="text" value={r.rate} onChange={(e) => updateRate(i, "rate", e.target.value)}
                      placeholder="e.g. £29.90"
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                    <input type="text" value={r.basis} onChange={(e) => updateRate(i, "basis", e.target.value)}
                      placeholder="e.g. Per Hour"
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                  </div>
                ))}
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

            <div className="flex gap-3">
              <button onClick={() => setStep(1)}
                className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                ← Back
              </button>
              <button onClick={() => setStep(3)}
                className="flex-1 rounded-xl bg-[#005f8c] px-4 py-3 text-sm font-semibold text-white hover:bg-[#004a6b] transition-colors">
                Next: Personal Details →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Personal & Emergency */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Details</h2>
              <p className="text-xs text-gray-500 mb-4">If you are an individual contractor, please complete this section.</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NI Number</label>
                  <input type="text" value={niNumber} onChange={(e) => setNiNumber(e.target.value)}
                    placeholder="e.g. AB123456C"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">UTR Number</label>
                  <input type="text" value={utrNumber} onChange={(e) => setUtrNumber(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Postcode</label>
                  <input type="text" value={postcode} onChange={(e) => setPostcode(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-red-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-red-900 mb-4">🚨 Emergency Contact</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                  <input type="text" value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                  <input type="tel" value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                  <select value={emergencyRelation} onChange={(e) => setEmergencyRelation(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                    <option value="">Select...</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Partner">Partner</option>
                    <option value="Parent">Parent</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Friend">Friend</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
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
              <button onClick={() => setStep(2)}
                className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !companyName || !contactName || !contactEmail || !consentGiven}
                className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? "Submitting..." : "Submit Agreement ✓"}
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400 pb-8">
          <p>PRL Site Solutions | 0800 772 3959 | info@prlsitesolutions.co.uk</p>
          <p className="mt-1">259 Wallasey Village, Wallasey, Wirral, Merseyside CH45 3LR | Company Reg: 14358717</p>
        </div>
      </div>
    </div>
  );
}
