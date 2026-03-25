"use client";

import { useState } from "react";

function StarRating({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="focus:outline-none transition-transform hover:scale-110"
          >
            <svg
              className={`h-8 w-8 ${
                star <= (hover || value)
                  ? "text-yellow-400 fill-yellow-400"
                  : "text-gray-300 fill-gray-300"
              } transition-colors`}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SurveyPage() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [dateOfService, setDateOfService] = useState("");
  const [overallSatisfaction, setOverallSatisfaction] = useState(0);
  const [qualityOfWorkers, setQualityOfWorkers] = useState(0);
  const [communication, setCommunication] = useState(0);
  const [compliance, setCompliance] = useState(0);
  const [valueForMoney, setValueForMoney] = useState(0);
  const [recommend, setRecommend] = useState("");
  const [whatDidWell, setWhatDidWell] = useState("");
  const [whatToImprove, setWhatToImprove] = useState("");
  const [otherComments, setOtherComments] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    if (!companyName || !contactName || !contactEmail || !overallSatisfaction) {
      setError("Please fill in all required fields and provide an overall satisfaction rating.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          contactName,
          contactEmail,
          dateOfService,
          overallSatisfaction,
          qualityOfWorkers,
          communication,
          compliance,
          valueForMoney,
          recommend,
          whatDidWell,
          whatToImprove,
          otherComments,
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
            <h1 className="text-xl font-bold text-gray-900 mb-2">Thank you for your feedback!</h1>
            <p className="text-sm text-gray-600 mb-4">
              Your response has been submitted to PRL Site Solutions. We value your feedback and use it to continually improve our service.
            </p>
            <p className="text-xs text-gray-500">
              If you have any further questions, call us on <strong>0800 772 3959</strong> or email <strong>info@prlsitesolutions.co.uk</strong>.
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
            <h1 className="text-xl font-bold">Customer Satisfaction Survey</h1>
            <p className="text-sm text-blue-100">PRL Site Solutions — Recruitment Specialists</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-900">
            We appreciate you taking the time to complete this survey. Your feedback helps us maintain and improve our service quality.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contact Details */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Your Details</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Company Name *</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name *</label>
                <input
                  type="text"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email *</label>
                <input
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Service</label>
                <input
                  type="date"
                  value={dateOfService}
                  onChange={(e) => setDateOfService(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Ratings */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Service Ratings</h2>
            <p className="text-xs text-gray-500 mb-4">Please rate the following areas from 1 (Poor) to 5 (Excellent).</p>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <StarRating label="Overall Satisfaction *" value={overallSatisfaction} onChange={setOverallSatisfaction} />
              <StarRating label="Quality of Workers Provided" value={qualityOfWorkers} onChange={setQualityOfWorkers} />
              <StarRating label="Communication & Responsiveness" value={communication} onChange={setCommunication} />
              <StarRating label="Compliance & Documentation" value={compliance} onChange={setCompliance} />
              <StarRating label="Value for Money" value={valueForMoney} onChange={setValueForMoney} />
            </div>
          </div>

          {/* Recommendation */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Recommendation</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Would you recommend PRL Site Solutions?</label>
              <div className="flex gap-4">
                {["Yes", "No", "Maybe"].map((opt) => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="recommend"
                      value={opt}
                      checked={recommend === opt}
                      onChange={(e) => setRecommend(e.target.value)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Comments */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Comments</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">What did we do well?</label>
                <textarea
                  rows={3}
                  value={whatDidWell}
                  onChange={(e) => setWhatDidWell(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">What could we improve?</label>
                <textarea
                  rows={3}
                  value={whatToImprove}
                  onChange={(e) => setWhatToImprove(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Any other comments?</label>
                <textarea
                  rows={3}
                  value={otherComments}
                  onChange={(e) => setOtherComments(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-[#005f8c] px-6 py-3 text-sm font-semibold text-white hover:bg-[#004d73] disabled:opacity-50 transition-colors"
          >
            {submitting ? "Submitting..." : "Submit Survey"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          PRL Site Solutions | 0800 772 3959 | info@prlsitesolutions.co.uk
        </p>
      </div>
    </div>
  );
}
