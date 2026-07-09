"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";

interface SurveyResponse {
  id: string;
  createdAt: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  dateOfService: string | null;
  overallSatisfaction: number;
  qualityOfWorkers: number;
  communication: number;
  compliance: number;
  valueForMoney: number;
  recommend: string;
  whatDidWell: string;
  whatToImprove: string;
  otherComments: string;
}

function Stars({ count }: { count: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          className={`h-4 w-4 ${s <= count ? "text-yellow-400 fill-yellow-400" : "text-gray-300 fill-gray-300"}`}
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1}
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </span>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <span className="inline-flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          className="focus:outline-none"
        >
          <svg
            className={`h-7 w-7 transition-colors ${
              s <= (hovered || value) ? "text-yellow-400 fill-yellow-400" : "text-gray-300 fill-gray-300"
            }`}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
    </span>
  );
}

const EMPTY_FORM = {
  companyName: "",
  contactName: "",
  contactEmail: "",
  dateOfService: "",
  overallSatisfaction: 0,
  qualityOfWorkers: 0,
  communication: 0,
  compliance: 0,
  valueForMoney: 0,
  recommend: "",
  whatDidWell: "",
  whatToImprove: "",
  otherComments: "",
};

export default function CustomerFeedbackPage() {
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [rawPreview, setRawPreview] = useState("");
  const [fetchError, setFetchError] = useState<string | null>(null);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/qms-reports/customer-feedback/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to parse");
      const { rawText, ...fields } = data;
      setForm(f => ({ ...f, ...fields }));
      setRawPreview(rawText || "");
      setShowModal(true);
    } catch (err) {
      alert("Could not parse document. Try the manual form instead.");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  function loadResponses() {
    fetch("/api/qms-reports/customer-feedback")
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setFetchError(data.error || `Server error ${res.status}`);
          return;
        }
        const data = await res.json();
        setResponses(data);
        setFetchError(null);
      })
      .catch((err) => setFetchError(err instanceof Error ? err.message : "Failed to load responses"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadResponses(); }, []);

  const totalResponses = responses.length;
  const avgScore =
    totalResponses > 0
      ? (responses.reduce((sum, r) => sum + (r.overallSatisfaction || 0), 0) / totalResponses).toFixed(1)
      : "0.0";
  const yesCount = responses.filter((r) => r.recommend === "Yes").length;
  const recommendRate = totalResponses > 0 ? Math.round((yesCount / totalResponses) * 100) : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.companyName || !form.contactName || !form.contactEmail || !form.overallSatisfaction) {
      setError("Company, contact name, email, and overall score are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to save");
      setShowModal(false);
      setForm(EMPTY_FORM);
      setLoading(true);
      loadResponses();
    } catch {
      setError("Failed to save response. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Customer Feedback" />
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Feedback"
        action={
          <div className="flex items-center gap-3">
            <label className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${importing ? "bg-gray-400" : "bg-emerald-600 hover:bg-emerald-700"}`}>
              {importing ? "Reading..." : "Import Document"}
              <input type="file" accept=".docx,.doc,.pdf" className="hidden" onChange={handleImport} disabled={importing} />
            </label>
            <button
              onClick={() => { setRawPreview(""); setForm(EMPTY_FORM); setShowModal(true); }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              + Add Response
            </button>
            <Link
              href="/qms/reports"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back to Reports
            </Link>
          </div>
        }
      />

      {/* Error banner */}
      {fetchError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          ⚠️ Could not load responses: {fetchError}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Average Score</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">{avgScore}</span>
            <span className="text-sm text-gray-500">/ 5</span>
          </div>
          <Stars count={Math.round(Number(avgScore))} />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Responses</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{totalResponses}</p>
          <p className="text-xs text-gray-500 mt-1">survey submissions</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Recommendation Rate</p>
          <p className="mt-1 text-3xl font-bold text-emerald-600">{recommendRate}%</p>
          <p className="text-xs text-gray-500 mt-1">would recommend PRL</p>
        </div>
      </div>

      {/* Responses Table */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">All Survey Responses</h2>
        </div>

        {responses.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-gray-500 mb-4">No survey responses yet.</p>
            <button
              onClick={() => setShowModal(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              + Add First Response
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Company</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Contact</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Overall Score</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Recommend</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600"></th>
                </tr>
              </thead>
              <tbody>
                {responses.map((r) => (
                  <>
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{r.companyName}</td>
                      <td className="px-4 py-3 text-gray-600">{r.contactName}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(r.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3">
                        <Stars count={r.overallSatisfaction || 0} />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            r.recommend === "Yes"
                              ? "bg-emerald-100 text-emerald-700"
                              : r.recommend === "No"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {r.recommend || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800"
                        >
                          {expandedId === r.id ? "Hide" : "View"}
                        </button>
                      </td>
                    </tr>
                    {expandedId === r.id && (
                      <tr key={`${r.id}-details`} className="bg-gray-50">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Quality of Workers</p>
                              <Stars count={r.qualityOfWorkers || 0} />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Communication</p>
                              <Stars count={r.communication || 0} />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Compliance & Docs</p>
                              <Stars count={r.compliance || 0} />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Value for Money</p>
                              <Stars count={r.valueForMoney || 0} />
                            </div>
                            {r.dateOfService && (
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Service Date</p>
                                <p className="text-sm text-gray-900">{new Date(r.dateOfService).toLocaleDateString("en-GB")}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Email</p>
                              <p className="text-sm text-gray-900">{r.contactEmail}</p>
                            </div>
                          </div>
                          {(r.whatDidWell || r.whatToImprove || r.otherComments) && (
                            <div className="mt-4 space-y-3 border-t border-gray-200 pt-4">
                              {r.whatDidWell && (
                                <div>
                                  <p className="text-xs font-medium text-gray-500">What we did well</p>
                                  <p className="text-sm text-gray-900 mt-0.5">{r.whatDidWell}</p>
                                </div>
                              )}
                              {r.whatToImprove && (
                                <div>
                                  <p className="text-xs font-medium text-gray-500">What to improve</p>
                                  <p className="text-sm text-gray-900 mt-0.5">{r.whatToImprove}</p>
                                </div>
                              )}
                              {r.otherComments && (
                                <div>
                                  <p className="text-xs font-medium text-gray-500">Other comments</p>
                                  <p className="text-sm text-gray-900 mt-0.5">{r.otherComments}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Response Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <h2 className="text-base font-semibold text-gray-900">Add Customer Feedback Response</h2>
              <button onClick={() => { setShowModal(false); setError(""); setForm(EMPTY_FORM); }} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
              {error && <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">{error}</p>}
              {rawPreview && (
                <details className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-500">
                  <summary className="cursor-pointer font-medium text-gray-700">Extracted document text (click to view / verify)</summary>
                  <pre className="mt-2 whitespace-pre-wrap font-mono text-[10px] max-h-40 overflow-y-auto">{rawPreview}</pre>
                </details>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Company Name <span className="text-red-500">*</span></label>
                  <input type="text" required value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Contact Name <span className="text-red-500">*</span></label>
                  <input type="text" required value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Contact Email <span className="text-red-500">*</span></label>
                  <input type="email" required value={form.contactEmail} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Date of Service</label>
                  <input type="date" value={form.dateOfService} onChange={e => setForm(f => ({ ...f, dateOfService: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
              </div>

              <div className="space-y-3 rounded-lg bg-gray-50 p-4">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Ratings</p>
                {[
                  { label: "Overall Satisfaction", key: "overallSatisfaction", required: true },
                  { label: "Quality of Workers", key: "qualityOfWorkers", required: false },
                  { label: "Communication", key: "communication", required: false },
                  { label: "Compliance & Docs", key: "compliance", required: false },
                  { label: "Value for Money", key: "valueForMoney", required: false },
                ].map(({ label, key, required }) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</span>
                    <StarPicker
                      value={form[key as keyof typeof form] as number}
                      onChange={v => setForm(f => ({ ...f, [key]: v }))}
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Would you recommend PRL?</label>
                <select value={form.recommend} onChange={e => setForm(f => ({ ...f, recommend: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="">Select...</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                  <option value="Maybe">Maybe</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">What did we do well?</label>
                <textarea rows={2} value={form.whatDidWell} onChange={e => setForm(f => ({ ...f, whatDidWell: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">What could we improve?</label>
                <textarea rows={2} value={form.whatToImprove} onChange={e => setForm(f => ({ ...f, whatToImprove: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Other comments</label>
                <textarea rows={2} value={form.otherComments} onChange={e => setForm(f => ({ ...f, otherComments: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => { setShowModal(false); setError(""); setForm(EMPTY_FORM); }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  {submitting ? "Saving..." : "Save Response"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
