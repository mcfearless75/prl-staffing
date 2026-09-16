"use client";

import { useState } from "react";
import { PublicFormShell } from "@/components/public-form-shell";

export default function GrievancePage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    site: "",
    incidentDate: "",
    grievanceType: [] as string[],
    grievanceOther: "",
    description: "",
    desiredOutcome: "",
    raisedInformally: "",
    witnesses: "",
    signature: "",
  });

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleType(type: string) {
    setForm((prev) => ({
      ...prev,
      grievanceType: prev.grievanceType.includes(type)
        ? prev.grievanceType.filter((t) => t !== type)
        : [...prev.grievanceType, type],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.description || !form.signature) {
      setError("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/grievance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Submission failed");
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-prism-canvas flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-prism-paper rounded-lg border border-prism-line p-8 text-center shadow-[0_1px_2px_rgb(27_36_48_/_6%)]">
          <div className="mx-auto w-16 h-16 bg-prism-ok/10 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-prism-ok" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-prism-ink mb-2">Grievance Submitted</h2>
          <p className="text-sm text-prism-ink-muted">
            Your grievance has been submitted to PRL Site Solutions. A member of the team will be in touch within 5 working days.
          </p>
          <a href="/grievance" className="mt-4 inline-block text-sm text-prism-info hover:underline">
            Submit another grievance
          </a>
        </div>
      </div>
    );
  }

  const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
  const labelCls = "block text-xs font-semibold text-gray-700 mb-1";

  const grievanceTypes = [
    "Bullying / Harassment",
    "Discrimination",
    "Health & Safety",
    "Working Conditions",
    "Management",
    "Colleague Conduct",
    "Other",
  ];

  return (
    <PublicFormShell title="Grievance Form">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <p className="text-sm text-prism-ink-muted mb-6">
          Use this form to raise a formal grievance. All submissions are treated confidentially. We aim to acknowledge within 5 working days.
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Details */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Your Details</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Full Name *</label>
                <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} required className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Role / Job Title</label>
                <input type="text" value={form.role} onChange={(e) => set("role", e.target.value)} placeholder="e.g. Electrician" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Email Address *</label>
                <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Phone Number</label>
                <input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Site / Employer</label>
                <input type="text" value={form.site} onChange={(e) => set("site", e.target.value)} placeholder="Site or company name" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Date of Incident / Issue</label>
                <input type="date" value={form.incidentDate} onChange={(e) => set("incidentDate", e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>

          {/* Nature of Grievance */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Nature of Grievance</h3>
            <div className="flex flex-wrap gap-3">
              {grievanceTypes.map((type) => (
                <label
                  key={type}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm cursor-pointer transition-all ${
                    form.grievanceType.includes(type)
                      ? "border-red-500 bg-red-50 text-red-700 font-medium"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.grievanceType.includes(type)}
                    onChange={() => toggleType(type)}
                    className="sr-only"
                  />
                  <span className={`h-4 w-4 rounded border flex items-center justify-center text-[10px] ${
                    form.grievanceType.includes(type) ? "bg-red-500 border-red-500 text-white" : "border-gray-300"
                  }`}>
                    {form.grievanceType.includes(type) && "✓"}
                  </span>
                  {type}
                </label>
              ))}
            </div>
            {form.grievanceType.includes("Other") && (
              <div className="mt-3">
                <label className={labelCls}>Please specify:</label>
                <input type="text" value={form.grievanceOther} onChange={(e) => set("grievanceOther", e.target.value)} className={inputCls} />
              </div>
            )}
          </div>

          {/* Description */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-1">Description of Grievance *</h3>
            <p className="text-xs text-gray-400 mb-3">Please describe what happened, when, where, and who was involved.</p>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              required
              rows={5}
              placeholder="Provide as much detail as possible..."
              className={inputCls + " resize-none"}
            />
          </div>

          {/* Desired Outcome */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-1">Desired Outcome</h3>
            <p className="text-xs text-gray-400 mb-3">What outcome are you seeking from this grievance?</p>
            <textarea
              value={form.desiredOutcome}
              onChange={(e) => set("desiredOutcome", e.target.value)}
              rows={3}
              placeholder="e.g. Apology, disciplinary action, change of working conditions..."
              className={inputCls + " resize-none"}
            />
          </div>

          {/* Additional Info */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Additional Information</h3>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Have you raised this informally?</label>
                <div className="flex gap-4 mt-1">
                  {["Yes", "No"].map((opt) => (
                    <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        name="raisedInformally"
                        value={opt}
                        checked={form.raisedInformally === opt}
                        onChange={() => set("raisedInformally", opt)}
                        className="accent-blue-600"
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Witnesses (names, if any)</label>
                <input
                  type="text"
                  value={form.witnesses}
                  onChange={(e) => set("witnesses", e.target.value)}
                  placeholder="Optional — names of anyone who witnessed the issue"
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* Declaration */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Declaration</h3>
            <p className="text-xs text-gray-500 mb-3">
              I confirm the information provided above is accurate and complete to the best of my knowledge. I understand this grievance will be handled in confidence.
            </p>
            <div>
              <label className={labelCls}>Signature (type your full name) *</label>
              <input
                type="text"
                value={form.signature}
                onChange={(e) => set("signature", e.target.value)}
                required
                placeholder="Type your full name"
                className={inputCls + " font-medium"}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#005f8c] py-4 text-base font-bold text-white hover:bg-[#004d73] disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            {loading ? "Submitting..." : "Submit Grievance"}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-prism-ink-muted pb-8">
          <p>PRL Site Solutions | 0800 772 3959 | info@prlsitesolutions.co.uk</p>
          <p className="mt-1">259 Wallasey Village, Wallasey, Wirral, Merseyside CH45 3LR</p>
        </div>
      </div>
    </PublicFormShell>
  );
}
