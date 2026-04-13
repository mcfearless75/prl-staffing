"use client";

import { useState } from "react";

type HourRow = { date: string; start: string; finish: string; hoursClaimed: string; hoursPaid: string };

export default function PaymentQueryPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    operativeName: "",
    email: "",
    phone: "",
    role: "",
    weekEnding: "",
    queryType: [] as string[],
    queryOther: "",
    totalHoursClaimed: "",
    totalOvertimeClaimed: "",
    totalHoursPaid: "",
    explanation: "",
    signature: "",
  });

  const [hours, setHours] = useState<HourRow[]>([
    { date: "", start: "", finish: "", hoursClaimed: "", hoursPaid: "" },
    { date: "", start: "", finish: "", hoursClaimed: "", hoursPaid: "" },
    { date: "", start: "", finish: "", hoursClaimed: "", hoursPaid: "" },
    { date: "", start: "", finish: "", hoursClaimed: "", hoursPaid: "" },
    { date: "", start: "", finish: "", hoursClaimed: "", hoursPaid: "" },
    { date: "", start: "", finish: "", hoursClaimed: "", hoursPaid: "" },
    { date: "", start: "", finish: "", hoursClaimed: "", hoursPaid: "" },
  ]);

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleQueryType(type: string) {
    setForm((prev) => ({
      ...prev,
      queryType: prev.queryType.includes(type)
        ? prev.queryType.filter((t) => t !== type)
        : [...prev.queryType, type],
    }));
  }

  function updateHour(index: number, field: keyof HourRow, value: string) {
    setHours((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  function addRow() {
    setHours((prev) => [...prev, { date: "", start: "", finish: "", hoursClaimed: "", hoursPaid: "" }]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.operativeName || !form.email || !form.weekEnding || !form.explanation || !form.signature) {
      setError("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/payment-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, hours: hours.filter((h) => h.date) }),
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-emerald-200 p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Query Submitted</h2>
          <p className="text-sm text-gray-500">Your payment query has been submitted to PRL Site Solutions. We will review it and get back to you.</p>
          <a href="/payment-query" className="mt-4 inline-block text-sm text-blue-600 hover:underline">Submit another query</a>
        </div>
      </div>
    );
  }

  const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
  const labelCls = "block text-xs font-semibold text-gray-700 mb-1";
  const thCls = "px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500 bg-gray-50";
  const tdInputCls = "w-full border-0 bg-transparent px-2 py-1.5 text-sm focus:ring-0 focus:outline-none text-center";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#005f8c] text-white">
        <div className="mx-auto max-w-2xl px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/prl_logo.jpg" alt="PRL" className="h-12 w-12 rounded-full" />
            <div>
              <h1 className="text-lg font-bold">PRL Site Solutions</h1>
              <p className="text-xs text-blue-200">Recruitment Specialists</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Timesheet / Payment Query Form</h2>
        <p className="text-sm text-gray-500 mb-6">Use this form to raise a query about your timesheet or payment. We aim to respond within 48 hours.</p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Operative Details */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Operative Details</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Operative Name *</label>
                <input type="text" value={form.operativeName} onChange={(e) => set("operativeName", e.target.value)} required className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Role</label>
                <input type="text" value={form.role} onChange={(e) => set("role", e.target.value)} placeholder="e.g. Electrician" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Email *</label>
                <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Phone Number</label>
                <input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Week Ending *</label>
                <input type="date" value={form.weekEnding} onChange={(e) => set("weekEnding", e.target.value)} required className={inputCls} />
              </div>
            </div>
          </div>

          {/* Nature of Query */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Nature of Query</h3>
            <div className="flex flex-wrap gap-3">
              {["Incorrect Hours", "Overtime", "No Payment", "Bank Holiday", "Other"].map((type) => (
                <label key={type} className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm cursor-pointer transition-all ${
                  form.queryType.includes(type)
                    ? "border-blue-500 bg-blue-50 text-blue-700 font-medium"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}>
                  <input
                    type="checkbox"
                    checked={form.queryType.includes(type)}
                    onChange={() => toggleQueryType(type)}
                    className="sr-only"
                  />
                  <span className={`h-4 w-4 rounded border flex items-center justify-center text-[10px] ${
                    form.queryType.includes(type) ? "bg-blue-500 border-blue-500 text-white" : "border-gray-300"
                  }`}>
                    {form.queryType.includes(type) && "✓"}
                  </span>
                  {type}
                </label>
              ))}
            </div>
            {form.queryType.includes("Other") && (
              <div className="mt-3">
                <label className={labelCls}>Please specify:</label>
                <input type="text" value={form.queryOther} onChange={(e) => set("queryOther", e.target.value)} className={inputCls} />
              </div>
            )}
          </div>

          {/* Hours Summary */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Hours Summary</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className={labelCls}>Total Hours Claimed</label>
                <input type="text" value={form.totalHoursClaimed} onChange={(e) => set("totalHoursClaimed", e.target.value)} placeholder="e.g. 55.5" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Total Overtime Claimed</label>
                <input type="text" value={form.totalOvertimeClaimed} onChange={(e) => set("totalOvertimeClaimed", e.target.value)} placeholder="e.g. 6.5" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Total Hours Paid</label>
                <input type="text" value={form.totalHoursPaid} onChange={(e) => set("totalHoursPaid", e.target.value)} placeholder="e.g. 0" className={inputCls} />
              </div>
            </div>
          </div>

          {/* Hours In Question */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">Hours In Question</h3>
              <button type="button" onClick={addRow} className="text-xs text-blue-600 hover:text-blue-800 font-medium">+ Add Row</button>
            </div>
            <div className="overflow-x-auto -mx-2">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className={thCls} style={{width:"22%"}}>Date</th>
                    <th className={thCls} style={{width:"18%"}}>Start</th>
                    <th className={thCls} style={{width:"18%"}}>Finish</th>
                    <th className={thCls} style={{width:"21%"}}>Hours Claimed</th>
                    <th className={thCls} style={{width:"21%"}}>Hours Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {hours.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="p-0"><input type="date" value={row.date} onChange={(e) => updateHour(i, "date", e.target.value)} className={tdInputCls + " text-left px-3"} /></td>
                      <td className="p-0"><input type="time" value={row.start} onChange={(e) => updateHour(i, "start", e.target.value)} className={tdInputCls} /></td>
                      <td className="p-0"><input type="time" value={row.finish} onChange={(e) => updateHour(i, "finish", e.target.value)} className={tdInputCls} /></td>
                      <td className="p-0"><input type="text" value={row.hoursClaimed} onChange={(e) => updateHour(i, "hoursClaimed", e.target.value)} placeholder="0" className={tdInputCls} /></td>
                      <td className="p-0"><input type="text" value={row.hoursPaid} onChange={(e) => updateHour(i, "hoursPaid", e.target.value)} placeholder="0" className={tdInputCls} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Explanation */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Explanation of Issue *</h3>
            <textarea
              value={form.explanation}
              onChange={(e) => set("explanation", e.target.value)}
              required
              rows={4}
              placeholder="Please describe the payment issue in detail..."
              className={inputCls + " resize-none"}
            />
          </div>

          {/* Signature & Submit */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Declaration</h3>
            <p className="text-xs text-gray-500 mb-3">I confirm the information provided above is correct and accurate to the best of my knowledge.</p>
            <div>
              <label className={labelCls}>Operative Signature (type your full name) *</label>
              <input type="text" value={form.signature} onChange={(e) => set("signature", e.target.value)} required placeholder="Type your full name" className={inputCls + " font-medium"} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#005f8c] py-4 text-base font-bold text-white hover:bg-[#004d73] disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            {loading ? "Submitting..." : "Submit Payment Query"}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-400 pb-8">
          <p>PRL Site Solutions | 0800 772 3959 | info@prlsitesolutions.co.uk</p>
          <p className="mt-1">259 Wallasey Village, Wallasey, Wirral, Merseyside CH45 3LR</p>
        </div>
      </div>
    </div>
  );
}
