"use client";

import { useState, useTransition } from "react";
import { formatDate } from "@/lib/utils";
import { sendTimesheetChase } from "./actions";
import { Mail, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";

type OverdueContractorRow = {
  contractorId: string;
  contractorName: string;
  email: string | null;
  missingWeeks: string[];
  lastChased: string | null;
};

export function ChaseTable({ contractors }: { contractors: OverdueContractorRow[] }) {
  const chaseable = contractors.filter((c) => c.email);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    sent: number;
    failed: number;
    skippedNoEmail: number;
    errors: string[];
  } | null>(null);

  const allSelected = chaseable.length > 0 && chaseable.every((c) => selected.has(c.contractorId));

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(chaseable.map((c) => c.contractorId)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleSend() {
    const ids = [...selected];
    setResult(null);
    startTransition(async () => {
      const res = await sendTimesheetChase(ids);
      setResult(res);
      setSelected(new Set());
    });
  }

  if (contractors.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
        <p className="text-sm text-gray-500">
          Everyone is up to date — no missing timesheets in the last 4 complete weeks.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Select all ({chaseable.length} chaseable{contractors.length !== chaseable.length ? `, ${contractors.length - chaseable.length} without an email` : ""})
        </label>
        <button
          onClick={handleSend}
          disabled={isPending || selected.size === 0}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          {isPending ? "Sending..." : `Send chase emails (${selected.size})`}
        </button>
      </div>

      {result && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            result.failed > 0
              ? "border-amber-300 bg-amber-50 text-amber-800"
              : "border-emerald-300 bg-emerald-50 text-emerald-800"
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            {result.failed > 0 ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {result.sent} sent, {result.failed} failed, {result.skippedNoEmail} skipped (no email)
          </div>
          {result.errors.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs">
              {result.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3"></th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Contractor
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Missing weeks
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Last chased
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {contractors.map((c) => (
              <tr key={c.contractorId} className={!c.email ? "bg-gray-50/50" : "hover:bg-gray-50"}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    disabled={!c.email}
                    checked={selected.has(c.contractorId)}
                    onChange={() => toggleOne(c.contractorId)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-30"
                  />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                  {c.contractorName}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  <div className="flex flex-wrap gap-1">
                    {c.missingWeeks.map((w) => (
                      <span
                        key={w}
                        className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700"
                      >
                        {formatDate(w)}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  {c.email ? (
                    <span className="text-gray-700">{c.email}</span>
                  ) : (
                    <span className="text-xs font-medium text-red-600">No email on file</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                  {c.lastChased ? formatDate(c.lastChased) : "Never"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
