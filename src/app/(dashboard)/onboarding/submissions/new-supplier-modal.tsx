"use client";

import { useEffect, useState } from "react";

const DEFAULT_RATES = [
  { description: "Basic Rate (Day)", rate: "", basis: "Per Hour" },
  { description: "Basic Rate (Night)", rate: "", basis: "Per Hour" },
  { description: "Overtime Rate (1)", rate: "", basis: "Per Hour" },
  { description: "Overtime Rate (2)", rate: "", basis: "Per Hour" },
  { description: "Expenses", rate: "", basis: "Per Day" },
  { description: "Lodge", rate: "", basis: "" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NewSupplierModal({ open, onClose, onSuccess }: Props) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [stepError, setStepError] = useState("");

  // Step 1
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // Step 2
  const [supplyOf, setSupplyOf] = useState("");
  const [siteLocation, setSiteLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [rates, setRates] = useState(DEFAULT_RATES.map((r) => ({ ...r })));
  const [breakdown, setBreakdown] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");

  // Step 3
  const [sendToEmail, setSendToEmail] = useState("");

  // Reset all state when modal is opened
  useEffect(() => {
    if (open) {
      setStep(1);
      setSubmitting(false);
      setError("");
      setStepError("");
      setCompanyName("");
      setCompanyAddress("");
      setContactName("");
      setContactEmail("");
      setContactPhone("");
      setSupplyOf("");
      setSiteLocation("");
      setStartDate("");
      setRates(DEFAULT_RATES.map((r) => ({ ...r })));
      setBreakdown("");
      setAdditionalInfo("");
      setSendToEmail("");
    }
  }, [open]);

  function updateRate(idx: number, field: string, value: string) {
    const updated = [...rates];
    (updated[idx] as Record<string, string>)[field] = value;
    setRates(updated);
  }

  function handleNext() {
    setStepError("");
    if (step === 1) {
      if (!companyName.trim()) {
        setStepError("Company Name is required.");
        return;
      }
      if (!contactName.trim()) {
        setStepError("Contact Name is required.");
        return;
      }
      if (!contactEmail.trim()) {
        setStepError("Contact Email is required.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
      // Pre-fill sendToEmail from contactEmail if not yet set
      setSendToEmail((prev) => (prev ? prev : contactEmail));
    }
  }

  function handleBack() {
    setStepError("");
    setStep((s) => s - 1);
  }

  async function handleSend() {
    setStepError("");
    if (!sendToEmail.trim()) {
      setStepError("Contractor email address is required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          companyAddress,
          contactName,
          contactEmail,
          contactPhone,
          supplyOf,
          siteLocation,
          startDate,
          rates,
          breakdown: breakdown.split("\n").filter(Boolean),
          additionalInfo,
          sendToEmail,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to send invite");
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const stepLabels = ["Company Details", "Supply & Rates", "Review & Send"];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="max-w-3xl w-full mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-[#005f8c]">
          <h2 className="text-lg font-semibold text-white">New Supplier Onboarding</h2>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors rounded-lg p-1"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Step progress */}
          <div className="mb-5 flex items-center gap-2">
            {stepLabels.map((label, idx) => {
              const s = idx + 1;
              return (
                <button
                  key={s}
                  onClick={() => {
                    if (s < step) {
                      setStepError("");
                      setStep(s);
                    }
                  }}
                  className={`flex-1 rounded-lg py-2 text-center text-xs font-medium transition-colors ${
                    step === s
                      ? "bg-[#005f8c] text-white"
                      : step > s
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Step-level validation error */}
          {stepError && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {stepError}
            </div>
          )}

          {/* Step 1: Company Details */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Company Details</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Address</label>
                    <textarea
                      value={companyAddress}
                      onChange={(e) => setCompanyAddress(e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Contact Person</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name *</label>
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email *</label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Supply & Rates */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Supply Details</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">For the Supply of</label>
                    <input
                      type="text"
                      value={supplyOf}
                      onChange={(e) => setSupplyOf(e.target.value)}
                      placeholder="e.g. Bolting Technicians, Electricians"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Site Location</label>
                    <input
                      type="text"
                      value={siteLocation}
                      onChange={(e) => setSiteLocation(e.target.value)}
                      placeholder="e.g. UK Wide, Manchester"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Charge Rates</h3>
                <div className="mb-2 grid grid-cols-3 gap-2">
                  <span className="text-xs font-medium text-gray-500 px-1">Description</span>
                  <span className="text-xs font-medium text-gray-500 px-1">Rate</span>
                  <span className="text-xs font-medium text-gray-500 px-1">Basis</span>
                </div>
                <div className="space-y-2">
                  {rates.map((r, i) => (
                    <div key={i} className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={r.description}
                        readOnly
                        className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600"
                      />
                      <input
                        type="text"
                        value={r.rate}
                        onChange={(e) => updateRate(i, "rate", e.target.value)}
                        placeholder="e.g. £29.90"
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        value={r.basis}
                        onChange={(e) => updateRate(i, "basis", e.target.value)}
                        placeholder="e.g. Per Hour"
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Breakdown &amp; Additional Info</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Breakdown (one line per item)</label>
                    <textarea
                      value={breakdown}
                      onChange={(e) => setBreakdown(e.target.value)}
                      rows={3}
                      placeholder={"First 40 hrs Mon-Fri (including breaks)\nAfter 40 hrs Mon-Fri & all hrs Saturday\nAll hrs Sunday"}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Additional Information</label>
                    <textarea
                      value={additionalInfo}
                      onChange={(e) => setAdditionalInfo(e.target.value)}
                      rows={3}
                      placeholder="e.g. Breaks to be paid (15 min, 30 min, 15 min)"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review & Send */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Company &amp; Contact</h3>
                <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-sm">
                  <div>
                    <dt className="text-xs font-medium text-gray-500">Company Name</dt>
                    <dd className="text-gray-900">{companyName || <span className="text-gray-400 italic">Not provided</span>}</dd>
                  </div>
                  {companyAddress && (
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-medium text-gray-500">Company Address</dt>
                      <dd className="text-gray-900 whitespace-pre-line">{companyAddress}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-xs font-medium text-gray-500">Contact Name</dt>
                    <dd className="text-gray-900">{contactName || <span className="text-gray-400 italic">Not provided</span>}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500">Contact Email</dt>
                    <dd className="text-gray-900">{contactEmail || <span className="text-gray-400 italic">Not provided</span>}</dd>
                  </div>
                  {contactPhone && (
                    <div>
                      <dt className="text-xs font-medium text-gray-500">Contact Phone</dt>
                      <dd className="text-gray-900">{contactPhone}</dd>
                    </div>
                  )}
                </dl>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Supply Details</h3>
                <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-sm">
                  {supplyOf && (
                    <div>
                      <dt className="text-xs font-medium text-gray-500">For the Supply of</dt>
                      <dd className="text-gray-900">{supplyOf}</dd>
                    </div>
                  )}
                  {siteLocation && (
                    <div>
                      <dt className="text-xs font-medium text-gray-500">Site Location</dt>
                      <dd className="text-gray-900">{siteLocation}</dd>
                    </div>
                  )}
                  {startDate && (
                    <div>
                      <dt className="text-xs font-medium text-gray-500">Start Date</dt>
                      <dd className="text-gray-900">{startDate}</dd>
                    </div>
                  )}
                </dl>

                {/* Rates summary */}
                <div className="mt-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">Charge Rates</p>
                  <div className="space-y-1">
                    {rates.map((r, i) => (
                      <div key={i} className="flex items-center justify-between text-sm border-b border-gray-100 py-1 last:border-0">
                        <span className="text-gray-600">{r.description}</span>
                        <span className="text-gray-900 font-medium">
                          {r.rate ? `${r.rate}` : <span className="text-gray-400 italic text-xs">—</span>}
                          {r.rate && r.basis ? <span className="text-gray-500 text-xs ml-1">/ {r.basis}</span> : null}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {breakdown && (
                  <div className="mt-4">
                    <p className="text-xs font-medium text-gray-500 mb-1">Breakdown</p>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-0.5">
                      {breakdown.split("\n").filter(Boolean).map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {additionalInfo && (
                  <div className="mt-4">
                    <p className="text-xs font-medium text-gray-500 mb-1">Additional Information</p>
                    <p className="text-sm text-gray-700">{additionalInfo}</p>
                  </div>
                )}
              </div>

              {/* Send Invite To */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-1">Send Invite To</h3>
                <p className="text-xs text-gray-500 mb-4">This person will receive a link to download the PRISM app</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contractor email address *
                  </label>
                  <input
                    type="email"
                    value={sendToEmail}
                    onChange={(e) => setSendToEmail(e.target.value)}
                    placeholder="contractor@example.com"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {error && (
                  <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleSend}
                  disabled={submitting || !sendToEmail.trim()}
                  className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Sending...
                    </>
                  ) : (
                    "Send Invite"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step < 3 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
            {step > 1 ? (
              <button
                onClick={handleBack}
                className="rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2.5 text-sm font-medium transition-colors"
              >
                Back
              </button>
            ) : (
              <div />
            )}
            <button
              onClick={handleNext}
              className="rounded-lg bg-[#005f8c] text-white hover:bg-[#004d72] px-5 py-2.5 text-sm font-semibold transition-colors"
            >
              {step === 2 ? "Next: Review & Send" : "Next: Supply & Rates"}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center gap-3">
            <button
              onClick={handleBack}
              className="rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2.5 text-sm font-medium transition-colors"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
