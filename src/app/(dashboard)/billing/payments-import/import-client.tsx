"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  previewPaymentsImport,
  confirmPaymentsImport,
  type PaymentsImportPreview,
  type PaymentsImportResult,
} from "../actions";

function statusLabel(status: "matched" | "already-paid" | "unmatched"): string {
  if (status === "matched") return "Matched";
  if (status === "already-paid") return "Already paid";
  return "Unmatched";
}

function statusClasses(status: "matched" | "already-paid" | "unmatched"): string {
  if (status === "matched") return "bg-emerald-100 text-emerald-700";
  if (status === "already-paid") return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

export function PaymentsImportClient() {
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<PaymentsImportPreview | null>(null);
  const [result, setResult] = useState<PaymentsImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result || ""));
    reader.readAsText(file);
  }

  function handlePreview() {
    setError(null);
    setResult(null);
    if (!csvText.trim()) {
      setError("Paste or upload CSV data first.");
      return;
    }
    startTransition(async () => {
      try {
        const p = await previewPaymentsImport(csvText);
        setPreview(p);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to preview CSV.");
      }
    });
  }

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        const r = await confirmPaymentsImport(csvText);
        setResult(r);
        setPreview(null);
        setCsvText("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to import payments.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Upload CSV file</label>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            className="mt-1 block w-full text-sm text-gray-700"
          />
        </div>
        <div className="text-center text-xs text-gray-400">or paste CSV below</div>
        <div>
          <label htmlFor="csvText" className="block text-sm font-medium text-gray-700">
            CSV data (Reference, Amount, Date)
          </label>
          <textarea
            id="csvText"
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            rows={8}
            placeholder={"Reference,Amount,Date\nINV-0001,1200.00,2026-07-01"}
            className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-mono text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePreview}
            disabled={isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isPending ? "Working…" : "Preview"}
          </button>
          <Link
            href="/billing"
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Back to Billing
          </Link>
        </div>
      </div>

      {result && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
          <p className="font-semibold">Import complete (batch {result.importBatch})</p>
          <p className="mt-1">
            {result.imported} payment(s) recorded · {result.skippedUnmatched} unmatched skipped ·{" "}
            {result.skippedMalformed} malformed row(s) skipped · {result.skippedAlreadyPaid} already-paid skipped ·{" "}
            {result.skippedDuplicate} duplicate(s) skipped
          </p>
        </div>
      )}

      {preview && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Preview</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {preview.matchedCount} matched · {preview.alreadyPaidCount} already paid ·{" "}
                {preview.unmatchedCount} unmatched
                {preview.malformed.length > 0 && ` · ${preview.malformed.length} malformed row(s) ignored`}
              </p>
            </div>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isPending || preview.rows.length === 0}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {isPending ? "Importing…" : "Confirm Import"}
            </button>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Reference</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {preview.rows.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">{row.reference}</td>
                  <td className="px-6 py-3 text-sm text-gray-700 text-right">{formatCurrency(row.amount)}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{formatDate(row.date)}</td>
                  <td className="px-6 py-3 text-sm">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClasses(row.status)}`}>
                      {statusLabel(row.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
