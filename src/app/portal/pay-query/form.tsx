"use client";

import { useState, useTransition } from "react";
import { createPortalPayQuery } from "./actions";
import type { CreatePayQueryInput, PayQueryHourRow, TimesheetOption } from "./types";

// Mirrors the staff-side query types in src/app/payment-query/page.tsx and
// the (dashboard)/payment-queries list/detail views, so the value stored
// here reads consistently across both submission channels.
const QUERY_TYPES = ["Incorrect Hours", "Overtime", "No Payment", "Bank Holiday", "Other"];

function emptyHourRow(): PayQueryHourRow {
  return { date: "", start: "", finish: "", hoursClaimed: "", hoursPaid: "" };
}

function toDateInputValue(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatWeekLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

export function PayQueryForm({ timesheets }: { timesheets: TimesheetOption[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [selectedTimesheetId, setSelectedTimesheetId] = useState("");
  const [queryType, setQueryType] = useState(QUERY_TYPES[0]);
  const [queryOther, setQueryOther] = useState("");
  const [weekEnding, setWeekEnding] = useState("");
  const [totalHoursClaimed, setTotalHoursClaimed] = useState("");
  const [totalOvertimeClaimed, setTotalOvertimeClaimed] = useState("");
  const [totalHoursPaid, setTotalHoursPaid] = useState("");
  const [hours, setHours] = useState<PayQueryHourRow[]>(() => Array.from({ length: 7 }, emptyHourRow));
  const [explanation, setExplanation] = useState("");
  const [signature, setSignature] = useState("");

  // Prefills weekEnding + per-day hour rows from one of the contractor's own
  // timesheets — the common case is disputing hours already submitted.
  function applyTimesheet(timesheetId: string) {
    setSelectedTimesheetId(timesheetId);
    if (!timesheetId) return;
    const ts = timesheets.find((t) => t.id === timesheetId);
    if (!ts) return;

    const weekStart = new Date(ts.weekStarting);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    setWeekEnding(toDateInputValue(weekEnd));
    setTotalHoursClaimed(String(ts.totalHours));
    setTotalOvertimeClaimed(String(ts.overtimeHours));

    const newRows = Array.from({ length: 7 }, emptyHourRow);
    for (const entry of ts.entries) {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + entry.dayOfWeek);
      newRows[entry.dayOfWeek] = {
        date: toDateInputValue(day),
        start: entry.startTime || "",
        finish: entry.finishTime || "",
        hoursClaimed: entry.status === "Absent" ? "0" : String(entry.hours),
        hoursPaid: "",
      };
    }
    setHours(newRows);
  }

  function updateHour(index: number, field: keyof PayQueryHourRow, value: string) {
    setHours((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  function addRow() {
    setHours((prev) => [...prev, emptyHourRow()]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!weekEnding || !explanation.trim() || !signature.trim()) {
      setError("Week ending, explanation and signature are required.");
      return;
    }

    const finalQueryType =
      queryType === "Other" && queryOther.trim() ? `Other (${queryOther.trim()})` : queryType;

    const input: CreatePayQueryInput = {
      queryType: finalQueryType,
      weekEnding,
      totalHoursClaimed,
      totalOvertimeClaimed,
      totalHoursPaid,
      hours: hours.filter((h) => h.date),
      explanation,
      signature,
    };

    startTransition(async () => {
      try {
        await createPortalPayQuery(input);
      } catch (err) {
        if ((err as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw err;
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    });
  }

  const inputCls =
    "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
  const labelCls = "block text-xs font-medium text-gray-600 mb-1";
  const cellInputCls =
    "w-full rounded border-0 bg-gray-50 px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {timesheets.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <label className={labelCls}>Prefill from a timesheet (optional)</label>
          <select value={selectedTimesheetId} onChange={(e) => applyTimesheet(e.target.value)} className={inputCls}>
            <option value="">-- Manual entry --</option>
            {timesheets.map((ts) => (
              <option key={ts.id} value={ts.id}>
                w/c {formatWeekLabel(ts.weekStarting)} — {ts.totalHours}h
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
        <div>
          <label className={labelCls}>Query Type *</label>
          <select value={queryType} onChange={(e) => setQueryType(e.target.value)} className={inputCls}>
            {QUERY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        {queryType === "Other" && (
          <div>
            <label className={labelCls}>Please specify</label>
            <input type="text" value={queryOther} onChange={(e) => setQueryOther(e.target.value)} className={inputCls} />
          </div>
        )}
        <div>
          <label className={labelCls}>Week Ending *</label>
          <input
            type="date"
            value={weekEnding}
            onChange={(e) => setWeekEnding(e.target.value)}
            required
            className={inputCls}
          />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-xs font-semibold text-gray-900">Hours Summary</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className={labelCls}>Hours Claimed</label>
            <input
              type="text"
              value={totalHoursClaimed}
              onChange={(e) => setTotalHoursClaimed(e.target.value)}
              placeholder="e.g. 40"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Overtime Claimed</label>
            <input
              type="text"
              value={totalOvertimeClaimed}
              onChange={(e) => setTotalOvertimeClaimed(e.target.value)}
              placeholder="e.g. 5"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Hours Paid</label>
            <input
              type="text"
              value={totalHoursPaid}
              onChange={(e) => setTotalHoursPaid(e.target.value)}
              placeholder="e.g. 0"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-900">Hours In Question</h3>
          <button type="button" onClick={addRow} className="text-xs font-medium text-blue-600 hover:text-blue-800">
            + Add Row
          </button>
        </div>
        <div className="-mx-2 overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase text-gray-500">Date</th>
                <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase text-gray-500">Start</th>
                <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase text-gray-500">Finish</th>
                <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase text-gray-500">Claimed</th>
                <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase text-gray-500">Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {hours.map((row, i) => (
                <tr key={i}>
                  <td className="p-0.5">
                    <input
                      type="date"
                      value={row.date}
                      onChange={(e) => updateHour(i, "date", e.target.value)}
                      className={cellInputCls + " text-left"}
                    />
                  </td>
                  <td className="p-0.5">
                    <input
                      type="time"
                      value={row.start}
                      onChange={(e) => updateHour(i, "start", e.target.value)}
                      className={cellInputCls}
                    />
                  </td>
                  <td className="p-0.5">
                    <input
                      type="time"
                      value={row.finish}
                      onChange={(e) => updateHour(i, "finish", e.target.value)}
                      className={cellInputCls}
                    />
                  </td>
                  <td className="p-0.5">
                    <input
                      type="text"
                      value={row.hoursClaimed}
                      onChange={(e) => updateHour(i, "hoursClaimed", e.target.value)}
                      placeholder="0"
                      className={cellInputCls}
                    />
                  </td>
                  <td className="p-0.5">
                    <input
                      type="text"
                      value={row.hoursPaid}
                      onChange={(e) => updateHour(i, "hoursPaid", e.target.value)}
                      placeholder="0"
                      className={cellInputCls}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <label className={labelCls}>Explanation of Issue *</label>
        <textarea
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          required
          rows={4}
          placeholder="Please describe the payment issue in detail..."
          className={inputCls + " resize-none"}
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="mb-2 text-xs text-gray-500">
          I confirm the information provided above is correct and accurate to the best of my knowledge.
        </p>
        <label className={labelCls}>Signature (type your full name) *</label>
        <input
          type="text"
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          required
          placeholder="Type your full name"
          className={inputCls + " font-medium"}
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50"
      >
        {isPending ? "Submitting..." : "Submit Pay Query"}
      </button>
    </form>
  );
}
