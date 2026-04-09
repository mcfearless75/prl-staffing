"use client";

import { useState } from "react";

export default function AgreementPage() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [seekingWork, setSeekingWork] = useState("");
  const [country, setCountry] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [signature, setSignature] = useState("");

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none";
  const selectClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    if (!country || !address || !city || !postcode || !signature) {
      setError("Please fill in all required fields.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/agreement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          seekingWork,
          country,
          address,
          city,
          postcode,
          signature,
          submittedDate: new Date().toISOString(),
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
              Thank you{firstName ? `, ${firstName}` : ""}. Your Work Finding Services Agreement has been submitted to PRL Site Solutions.
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
            <h1 className="text-xl font-bold">Work Finding Services Agreement</h1>
            <p className="text-sm text-blue-100">PRL Site Solutions -- Recruitment Specialists</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6">
        {/* Title block */}
        <div className="mb-6 text-center">
          <h2 className="text-lg font-bold text-gray-900">Work Finding Services Agreement</h2>
          <p className="text-sm text-gray-600 mt-1">Between PRL Site Solutions LIMITED [EMPLOYMENT BUSINESS]</p>
          <p className="text-sm font-semibold text-gray-700 mt-2">AND</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Worker Details */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Your Details</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Seeking work in or position sought</label>
                <input
                  type="text"
                  value={seekingWork}
                  onChange={(e) => setSeekingWork(e.target.value)}
                  placeholder="Please specify the type of work you are seeking or position sought which may be offered in an assignment"
                  className={inputClass}
                />
                <p className="text-xs text-gray-400 mt-1">Please specify the type of work you are seeking or position sought which may be offered in an assignment.</p>
              </div>
            </div>
          </div>

          {/* Parties */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Parties</h2>
            <div className="mb-4 rounded-lg bg-gray-50 border border-gray-200 p-4">
              <p className="text-xs text-gray-700">
                (1) PRL Site Solutions, incorporated and registered in England and Wales with Company number
                14358717. Who&apos;s Registered office address is at: 15 Beryl Road, Prenton - Wirral. CH43 9RS
                (Employment Business); and
              </p>
            </div>

            <p className="text-sm text-gray-600 mb-4">(2) The Worker (you):</p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country / Region *</label>
                <select required value={country} onChange={(e) => setCountry(e.target.value)} className={selectClass}>
                  <option value="">Select...</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Ireland">Ireland</option>
                  <option value="Poland">Poland</option>
                  <option value="Romania">Romania</option>
                  <option value="Portugal">Portugal</option>
                  <option value="Lithuania">Lithuania</option>
                  <option value="Latvia">Latvia</option>
                  <option value="Bulgaria">Bulgaria</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zip / Postal Code *</label>
                <input type="text" required value={postcode} onChange={(e) => setPostcode(e.target.value)} className={inputClass} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                <input type="text" required value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                <input type="text" required value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>

          {/* Signature */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Signature</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Signature (type your full name) *</label>
                <input type="text" required value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Full name" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="text" readOnly value={new Date().toLocaleDateString("en-GB")} className={`${inputClass} bg-gray-50`} />
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
            {submitting ? "Submitting..." : "Submit Agreement"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6 pb-8">
          PRL Site Solutions | 0800 772 3959 | info@prlsitesolutions.co.uk
        </p>
      </div>
    </div>
  );
}
