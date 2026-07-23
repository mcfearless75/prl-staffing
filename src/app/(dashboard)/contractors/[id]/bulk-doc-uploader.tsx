"use client";

import { useState, useRef } from "react";
import { Upload, X, Check, AlertCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { COMPLIANCE_TYPE_GROUPS, categoryForType } from "@/lib/compliance-types";

function guessType(fileName: string): string {
  const name = fileName.toLowerCase();
  if (name.includes("passport")) return "Passport";
  if (name.includes("cscs")) return "CSCS";
  if (name.includes("ccnsg")) return "CCNSG";
  if (name.includes("npors")) return "NPORS";
  if (name.includes("sharecode") || name.includes("share code") || name.includes("share_code")) return "Share Code";
  if (name.includes("dbs")) return "DBS";
  if (/\bp45\b/.test(name)) return "P45";
  if (/\bp60\b/.test(name)) return "P60";
  if (name.includes("insurance")) return "Insurance";
  if (name.includes("qualification") || name.includes("nvq") || name.includes("cert")) return "Qualification";
  if (name.includes("rtw") || name.includes("right to work") || name.includes("visa")) return "Right to Work";
  if (name.includes("ir35")) return "IR35 Assessment";
  if (/\bcv\b/.test(name) || name.includes("resume")) return "CV";
  return "Other";
}

type RowStatus = "pending" | "uploading" | "done" | "error";

interface Row {
  file: File;
  type: string;
  status: RowStatus;
  error?: string;
}

export function BulkDocUploader({ contractorId }: { contractorId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [uploading, setUploading] = useState(false);
  const [attested, setAttested] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const hasRightToWork = rows.some((r) => categoryForType(r.type) === "Right to Work");
  const attestationRequired = hasRightToWork && !attested;

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const newRows: Row[] = files.map((file) => ({
      file,
      type: guessType(file.name),
      status: "pending",
    }));
    setRows((prev) => [...prev, ...newRows]);
    e.target.value = "";
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function updateType(index: number, type: string) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, type } : r)));
  }

  async function uploadAll() {
    setUploading(true);
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].status === "done") continue;
      setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: "uploading" } : r)));
      try {
        const formData = new FormData();
        formData.append("file", rows[i].file);
        formData.append("type", rows[i].type);
        formData.append("contractorId", contractorId);
        const res = await fetch("/api/documents", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: "done" } : r)));
      } catch (error) {
        setRows((prev) =>
          prev.map((r, idx) =>
            idx === i ? { ...r, status: "error", error: error instanceof Error ? error.message : "Upload failed" } : r
          )
        );
      }
    }
    setUploading(false);
    router.refresh();
  }

  const doneCount = rows.filter((r) => r.status === "done").length;
  const allDone = rows.length > 0 && doneCount === rows.length;

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-blue-900">📥 Bulk Upload Documents</h2>
        <p className="text-xs text-blue-600 mt-1">
          Select several files at once (e.g. everything WhatsApp&apos;d from a contractor) — each gets its own
          document type, auto-guessed from the filename. Check them before uploading.
        </p>
      </div>

      <input
        ref={fileRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.heic,.heif,.webp,.doc,.docx"
        onChange={handleFileSelect}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="flex items-center gap-2 rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
      >
        <Upload className="h-4 w-4" />
        Choose files
      </button>

      {rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2"
            >
              <span className="min-w-0 flex-1 truncate text-sm text-gray-900">{row.file.name}</span>
              <select
                value={row.type}
                onChange={(e) => updateType(i, e.target.value)}
                disabled={row.status === "uploading" || row.status === "done"}
                className="shrink-0 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
              >
                {COMPLIANCE_TYPE_GROUPS.map((group) => (
                  <optgroup key={group.category} label={group.category}>
                    {group.types.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <span className="shrink-0 w-5">
                {row.status === "uploading" && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
                {row.status === "done" && <Check className="h-4 w-4 text-emerald-600" />}
                {row.status === "error" && <AlertCircle className="h-4 w-4 text-red-600" />}
              </span>
              {row.status !== "uploading" && row.status !== "done" && (
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  className="shrink-0 text-gray-400 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          {rows.some((r) => r.status === "error") && (
            <p className="text-xs text-red-600">
              Some files failed — check the type selected is correct and try again.
            </p>
          )}
          {hasRightToWork && (
            <label className="flex items-start gap-2 text-xs text-gray-700">
              <input
                type="checkbox"
                checked={attested}
                onChange={(e) => setAttested(e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              I confirm I have verified this worker&apos;s Right to Work documentation
            </label>
          )}
          <button
            type="button"
            onClick={uploadAll}
            disabled={uploading || allDone || attestationRequired}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading {doneCount}/{rows.length}...
              </>
            ) : allDone ? (
              "All uploaded"
            ) : (
              `Upload ${rows.length} file${rows.length > 1 ? "s" : ""}`
            )}
          </button>
        </div>
      )}
    </div>
  );
}
