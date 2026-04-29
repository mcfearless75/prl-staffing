"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PreviewRow {
  firstName: string;
  lastName: string;
  email: string;
  rawName: string;
}

interface ImportResult {
  created: number;
  skipped: number;
  errors: number;
  skippedList: string[];
  errorList: string[];
}

export default function ImportContractorsPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(chosen: File) {
    setFile(chosen);
    setPreview(null);
    setResult(null);
    setError(null);
    setPreviewLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", chosen);
      fd.append("preview", "true");
      const res = await fetch("/api/contractors/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setPreview(data.rows);
    } catch (e) {
      setError(String(e));
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleImport() {
    if (!file || !preview) return;
    if (!confirm(`Import ${preview.length} contractors? Duplicates will be skipped automatically.`)) return;
    setImporting(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/contractors/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setResult(data);
      setPreview(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setImporting(false);
    }
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import Contractors"
        action={
          <Link href="/contractors" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Contractors
          </Link>
        }
      />

      {/* Instructions */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-blue-900">Bulk import from Excel or CSV</p>
            <p className="text-xs text-blue-700 leading-relaxed">
              Upload a <strong>.xlsx</strong> or <strong>.csv</strong> file with two columns: <code className="bg-white border border-blue-200 rounded px-1">Name</code> and <code className="bg-white border border-blue-200 rounded px-1">Email</code>. Each name is automatically split into first &amp; last name. Existing contractors (matched by email) are skipped.
            </p>
            <p className="text-xs text-blue-600 mt-1">
              New contractors are created with status <strong>New</strong> — you can then send them an invite from the Contractors page.
            </p>
          </div>
        </div>
      </div>

      {/* Upload zone */}
      {!result && (
        <div
          className="relative rounded-xl border-2 border-dashed border-gray-300 bg-white p-10 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-colors cursor-pointer"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const dropped = e.dataTransfer.files[0];
            if (dropped) handleFile(dropped);
          }}
        >
          <Upload className="mx-auto h-10 w-10 text-gray-400 mb-3" />
          <p className="text-sm font-medium text-gray-700">
            {file ? file.name : "Drop your file here or click to browse"}
          </p>
          <p className="text-xs text-gray-400 mt-1">.xlsx or .csv — max 10 MB</p>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Preview loading */}
      {previewLoading && (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
          Parsing file...
        </div>
      )}

      {/* Preview table */}
      {preview && preview.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">
              Preview — <span className="text-blue-600">{preview.length} rows ready to import</span>
            </p>
            <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600">Change file</button>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">First Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Last Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{row.firstName}</td>
                    <td className="px-4 py-2.5 text-gray-700">{row.lastName || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-2.5 text-gray-500">{row.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleImport}
              disabled={importing}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Upload className="h-4 w-4" />
              {importing ? "Importing..." : `Import ${preview.length} Contractors`}
            </button>
            <button onClick={reset} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-center">
              <CheckCircle className="mx-auto h-6 w-6 text-green-600 mb-2" />
              <p className="text-2xl font-bold text-green-700">{result.created}</p>
              <p className="text-xs text-green-600 mt-1">Created</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-center">
              <AlertTriangle className="mx-auto h-6 w-6 text-amber-500 mb-2" />
              <p className="text-2xl font-bold text-amber-600">{result.skipped}</p>
              <p className="text-xs text-amber-600 mt-1">Skipped (duplicates)</p>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center">
              <XCircle className="mx-auto h-6 w-6 text-red-500 mb-2" />
              <p className="text-2xl font-bold text-red-600">{result.errors}</p>
              <p className="text-xs text-red-600 mt-1">Errors</p>
            </div>
          </div>

          {result.skippedList.length > 0 && (
            <details className="rounded-xl border border-amber-200 bg-amber-50">
              <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-amber-800 list-none">
                {result.skippedList.length} skipped (already exist) — click to see
              </summary>
              <ul className="px-4 pb-4 space-y-1">
                {result.skippedList.map((s, i) => <li key={i} className="text-xs text-amber-700">{s}</li>)}
              </ul>
            </details>
          )}

          {result.errorList.length > 0 && (
            <details className="rounded-xl border border-red-200 bg-red-50">
              <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-red-800 list-none">
                {result.errorList.length} errors — click to see
              </summary>
              <ul className="px-4 pb-4 space-y-1">
                {result.errorList.map((e, i) => <li key={i} className="text-xs text-red-700">{e}</li>)}
              </ul>
            </details>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => router.push("/contractors")}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              View Contractors →
            </button>
            <button onClick={reset} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              Import another file
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
