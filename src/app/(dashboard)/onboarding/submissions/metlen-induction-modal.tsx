"use client";

import { useEffect, useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DEFAULTS = {
  contractorName: "",
  contractorEmail: "",
  dayDate: "Monday 12/05",
  arrivalTime: "0800",
  inductionStartTime: "0900",
  inductionFormLink: "https://forms.office.com/e/mCJUtRQ2aT",
  documentsEmail: "protosinductions@metlen.com",
  contactName: "Graham Challis",
  contactPhone: "07985 727464",
  postcode: "CH2 4LB",
  baseRate: "£19.00",
  otThreshold: "50hrs",
  otMultiplier: "1.5",
  satSunRate: "1.5",
};

const inputBase =
  "w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 border-gray-300";
const inputHighlight =
  "w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-amber-50 border-amber-300";

export default function MetlenInductionModal({ open, onClose, onSuccess }: Props) {
  const [contractorName, setContractorName] = useState(DEFAULTS.contractorName);
  const [contractorEmail, setContractorEmail] = useState(DEFAULTS.contractorEmail);
  const [dayDate, setDayDate] = useState(DEFAULTS.dayDate);
  const [arrivalTime, setArrivalTime] = useState(DEFAULTS.arrivalTime);
  const [inductionStartTime, setInductionStartTime] = useState(DEFAULTS.inductionStartTime);
  const [inductionFormLink, setInductionFormLink] = useState(DEFAULTS.inductionFormLink);
  const [documentsEmail, setDocumentsEmail] = useState(DEFAULTS.documentsEmail);
  const [contactName, setContactName] = useState(DEFAULTS.contactName);
  const [contactPhone, setContactPhone] = useState(DEFAULTS.contactPhone);
  const [postcode, setPostcode] = useState(DEFAULTS.postcode);
  const [baseRate, setBaseRate] = useState(DEFAULTS.baseRate);
  const [otThreshold, setOtThreshold] = useState(DEFAULTS.otThreshold);
  const [otMultiplier, setOtMultiplier] = useState(DEFAULTS.otMultiplier);
  const [satSunRate, setSatSunRate] = useState(DEFAULTS.satSunRate);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setContractorName(DEFAULTS.contractorName);
      setContractorEmail(DEFAULTS.contractorEmail);
      setDayDate(DEFAULTS.dayDate);
      setArrivalTime(DEFAULTS.arrivalTime);
      setInductionStartTime(DEFAULTS.inductionStartTime);
      setInductionFormLink(DEFAULTS.inductionFormLink);
      setDocumentsEmail(DEFAULTS.documentsEmail);
      setContactName(DEFAULTS.contactName);
      setContactPhone(DEFAULTS.contactPhone);
      setPostcode(DEFAULTS.postcode);
      setBaseRate(DEFAULTS.baseRate);
      setOtThreshold(DEFAULTS.otThreshold);
      setOtMultiplier(DEFAULTS.otMultiplier);
      setSatSunRate(DEFAULTS.satSunRate);
      setError("");
      setSubmitting(false);
    }
  }, [open]);

  async function handleSend() {
    if (!contractorName.trim() || !contractorEmail.trim()) {
      setError("Contractor name and email are required");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding/metlen-induction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractorName,
          contractorEmail,
          dayDate,
          arrivalTime,
          inductionStartTime,
          inductionFormLink,
          documentsEmail,
          contactName,
          contactPhone,
          postcode,
          baseRate,
          otThreshold,
          otMultiplier,
          satSunRate,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to send");
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

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="max-w-2xl w-full mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#005f8c] px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="text-white font-semibold text-lg">Metlen Induction Email</h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Section 1 — Send To */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-900">Send To</p>
              <span className="text-xs text-amber-600 font-medium">Update for each contractor</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contractor Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className={inputHighlight}
                placeholder="e.g. Joel Smith"
                value={contractorName}
                onChange={(e) => setContractorName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contractor Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                className={inputHighlight}
                placeholder="e.g. joel.smith@email.com"
                value={contractorEmail}
                onChange={(e) => setContractorEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Section 2 — Induction Details */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-900">Induction Details</p>
              <span className="text-xs text-amber-600 font-medium">Update for each contractor</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Induction day &amp; date</label>
              <input
                type="text"
                className={inputHighlight}
                value={dayDate}
                onChange={(e) => setDayDate(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-0.5">e.g. Monday 12/05</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Arrive on site at</label>
              <input
                type="text"
                className={inputBase}
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Induction starts at</label>
              <input
                type="text"
                className={inputBase}
                value={inductionStartTime}
                onChange={(e) => setInductionStartTime(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Induction booking form link</label>
              <input
                type="url"
                className={inputBase}
                value={inductionFormLink}
                onChange={(e) => setInductionFormLink(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Send cards/passport to</label>
              <input
                type="email"
                className={inputBase}
                value={documentsEmail}
                onChange={(e) => setDocumentsEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Section 3 — Site Contact */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
            <p className="text-sm font-semibold text-gray-900 mb-3">Site Contact</p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
              <input
                type="text"
                className={inputHighlight}
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
              <input
                type="tel"
                className={inputHighlight}
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Site Postcode</label>
              <input
                type="text"
                className={inputBase}
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
              />
            </div>
          </div>

          {/* Section 4 — Rates */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
            <p className="text-sm font-semibold text-gray-900 mb-3">Rates</p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base Rate</label>
              <input
                type="text"
                className={inputBase}
                value={baseRate}
                onChange={(e) => setBaseRate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">OT after</label>
              <input
                type="text"
                className={inputBase}
                value={otThreshold}
                onChange={(e) => setOtThreshold(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mon–Fri OT rate</label>
              <input
                type="text"
                className={inputBase}
                value={otMultiplier}
                onChange={(e) => setOtMultiplier(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sat &amp; Sun rate</label>
              <input
                type="text"
                className={inputBase}
                value={satSunRate}
                onChange={(e) => setSatSunRate(e.target.value)}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 font-medium">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={submitting}
            className="rounded-lg bg-[#005f8c] px-5 py-2 text-sm font-medium text-white hover:bg-[#004e75] transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {submitting && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            Send Induction Email
          </button>
        </div>
      </div>
    </div>
  );
}
