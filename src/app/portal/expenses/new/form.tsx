"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, Check, X, Loader2 } from "lucide-react";

type Assignment = {
  id: string;
  role: string;
  company: { name: string };
};

const CATEGORIES = ["Travel", "Accommodation", "Materials", "Other"];

export function ExpenseForm({
  contractorId,
  assignments,
}: {
  contractorId: string;
  assignments: Assignment[];
}) {
  const router = useRouter();
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState("Travel");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [assignmentId, setAssignmentId] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptDocumentId, setReceiptDocumentId] = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError("");
    setReceiptFile(file);
    setReceiptDocumentId(null);
    setUploadingReceipt(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "Receipt");
      formData.append("contractorId", contractorId);
      formData.append("notes", `Expense receipt — ${category} ${date}`);

      const res = await fetch("/api/documents", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Receipt upload failed");
      setReceiptDocumentId(data.document.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Receipt upload failed");
      setReceiptFile(null);
    } finally {
      setUploadingReceipt(false);
    }
  }

  function removeReceipt() {
    setReceiptFile(null);
    setReceiptDocumentId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!description.trim()) {
      setError("Description is required.");
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (uploadingReceipt) {
      setError("Receipt is still uploading — please wait.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/portal/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractorId,
          date,
          category,
          description: description.trim(),
          amount: parsedAmount,
          assignmentId: assignmentId || null,
          receiptDocumentId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to submit expense");
        setSubmitting(false);
        return;
      }

      router.push("/portal/expenses");
      router.refresh();
    } catch {
      setError("Network error — please try again");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {assignments.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Assignment (optional)</label>
            <select
              value={assignmentId}
              onChange={(e) => setAssignmentId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">No assignment</option>
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.role} - {a.company.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Fuel to site, parking, PPE..."
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Amount (£)</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Receipt upload */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <label className="block text-xs font-medium text-gray-500">Receipt (optional)</label>

        {receiptFile ? (
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="h-5 w-5 text-gray-400 shrink-0" />
              <span className="text-sm text-gray-700 truncate">{receiptFile.name}</span>
              {uploadingReceipt ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-500" />
              ) : receiptDocumentId ? (
                <Check className="h-4 w-4 shrink-0 text-emerald-500" />
              ) : null}
            </div>
            <button
              type="button"
              onClick={removeReceipt}
              className="rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-white p-4 text-gray-600 hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <Upload className="h-6 w-6" />
            <span className="text-xs font-medium">Attach receipt</span>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.heic,.heif,.webp"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      <button
        type="submit"
        disabled={submitting || uploadingReceipt}
        className="w-full rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 active:bg-blue-800 transition-colors"
      >
        {submitting ? "Submitting..." : "Submit Expense"}
      </button>
    </form>
  );
}
