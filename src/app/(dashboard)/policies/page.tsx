"use client";

import { useState, useEffect, useRef } from "react";

const CATEGORIES = [
  "Compliance & Ethics",
  "Data & Privacy",
  "Health & Safety",
  "Business Operations",
  "Accreditations",
  "Worker Documents",
];

type Policy = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  filename: string;
  fileType: string;
  fileSize: number | null;
  version: string | null;
  isPublic: boolean;
  createdAt: string;
};

function fileSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const FILE_BADGE: Record<string, string> = {
  pdf:  "bg-red-100 text-red-700",
  docx: "bg-blue-100 text-blue-700",
  xlsx: "bg-green-100 text-green-700",
};

export default function PoliciesAdminPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filterCategory, setFilterCategory] = useState("All");
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    category: CATEGORIES[0],
    version: "",
    isPublic: false,
  });

  async function load() {
    setLoading(true);
    const res = await fetch("/api/policies");
    if (res.ok) setPolicies(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function togglePublic(policy: Policy) {
    await fetch(`/api/policies/${policy.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublic: !policy.isPublic }),
    });
    await load();
  }

  async function deletePolicy(policy: Policy) {
    if (!confirm(`Delete "${policy.name}"? This cannot be undone.`)) return;
    await fetch(`/api/policies/${policy.id}`, { method: "DELETE" });
    await load();
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file || !form.name || !form.category) return;

    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("name", form.name);
    fd.append("description", form.description);
    fd.append("category", form.category);
    fd.append("version", form.version);
    fd.append("isPublic", String(form.isPublic));

    const res = await fetch("/api/policies", { method: "POST", body: fd });
    setUploading(false);
    if (res.ok) {
      setUploadOpen(false);
      setForm({ name: "", description: "", category: CATEGORIES[0], version: "", isPublic: false });
      if (fileRef.current) fileRef.current.value = "";
      await load();
    }
  }

  const displayed = filterCategory === "All"
    ? policies
    : policies.filter((p) => p.category === filterCategory);

  const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
  const labelCls = "block text-xs font-semibold text-gray-700 mb-1";

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Policy Documents</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage company policies. Toggle <strong>Public</strong> to make a document visible at{" "}
            <a href="/policy-documents" target="_blank" className="text-blue-600 hover:underline">
              /policy-documents
            </a>
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/policy-documents"
            target="_blank"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            View Public Page ↗
          </a>
          <button
            onClick={() => setUploadOpen(true)}
            className="rounded-lg bg-[#005f8c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#004d73] transition-colors"
          >
            + Upload Document
          </button>
        </div>
      </div>

      {/* Category filter */}
      <div className="mb-4 flex gap-1.5 flex-wrap">
        {["All", ...CATEGORIES].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filterCategory === cat
                ? "bg-[#005f8c] text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Upload modal */}
      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-gray-900">Upload Policy Document</h2>
              <button onClick={() => setUploadOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className={labelCls}>File *</label>
                <input ref={fileRef} type="file" accept=".pdf,.docx,.xlsx" required className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Document Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Category *</label>
                <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} className={inputCls}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Version</label>
                  <input type="text" value={form.version} onChange={(e) => setForm((p) => ({ ...p, version: e.target.value }))} placeholder="e.g. 1.1" className={inputCls} />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer pb-2.5">
                    <input
                      type="checkbox"
                      checked={form.isPublic}
                      onChange={(e) => setForm((p) => ({ ...p, isPublic: e.target.checked }))}
                      className="accent-blue-600"
                    />
                    <span className="text-sm text-gray-700">Make public</span>
                  </label>
                </div>
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} className={inputCls + " resize-none"} />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setUploadOpen(false)} className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={uploading} className="flex-1 rounded-lg bg-[#005f8c] py-2.5 text-sm font-semibold text-white hover:bg-[#004d73] disabled:opacity-50">
                  {uploading ? "Uploading..." : "Upload"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Policy list */}
      {loading ? (
        <div className="text-center py-12 text-sm text-gray-400">Loading...</div>
      ) : displayed.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-12 text-center">
          <p className="text-sm text-gray-500">No documents yet. Upload your first policy.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map((policy) => {
            const badge = FILE_BADGE[policy.fileType] || "bg-gray-100 text-gray-600";
            return (
              <div key={policy.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${badge}`}>
                    {policy.fileType.toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{policy.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {policy.category}
                      {policy.version ? ` · v${policy.version}` : ""}
                      {policy.fileSize ? ` · ${fileSize(policy.fileSize)}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* Public toggle */}
                  <button
                    onClick={() => togglePublic(policy)}
                    title={policy.isPublic ? "Click to make internal" : "Click to make public"}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                      policy.isPublic
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {policy.isPublic ? "Public" : "Internal"}
                  </button>
                  <a
                    href={`/api/policies/${policy.id}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    View
                  </a>
                  <button
                    onClick={() => deletePolicy(policy)}
                    className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
