"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface QmsDocument {
  id: string;
  fileName: string;
  filePath: string;
  folder: string;
  subfolder: string | null;
  fileType: string;
  fileSize: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface SubfolderGroup {
  subfolder: string;
  documents: QmsDocument[];
}

interface FolderGroup {
  folder: string;
  documents: QmsDocument[];
  subfolders: SubfolderGroup[];
}

interface Stats {
  totalDocuments: number;
  totalFolders: number;
  lastUpdated: string | null;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getFileIcon(fileType: string): string {
  switch (fileType.toLowerCase()) {
    case "pdf":
      return "\u{1F4C4}";
    case "docx":
    case "doc":
      return "\u{1F4DD}";
    case "xlsx":
    case "xls":
      return "\u{1F4CA}";
    case "pptx":
    case "ppt":
      return "\u{1F4CA}";
    default:
      return "\u{1F4CE}";
  }
}

function FileTypeIcon({ fileType }: { fileType: string }) {
  const colors: Record<string, string> = {
    pdf: "#E53E3E",
    docx: "#2B6CB0",
    doc: "#2B6CB0",
    xlsx: "#38A169",
    xls: "#38A169",
    pptx: "#DD6B20",
    ppt: "#DD6B20",
  };

  const labels: Record<string, string> = {
    pdf: "PDF",
    docx: "DOCX",
    doc: "DOC",
    xlsx: "XLSX",
    xls: "XLS",
    pptx: "PPTX",
    ppt: "PPT",
  };

  const color = colors[fileType.toLowerCase()] || "#718096";
  const label = labels[fileType.toLowerCase()] || fileType.toUpperCase();

  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {label}
    </span>
  );
}

function DocumentRow({ doc }: { doc: QmsDocument }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white px-4 py-3 hover:bg-gray-50 transition-colors">
      <FileTypeIcon fileType={doc.fileType} />
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium truncate"
          style={{ color: "#424A54" }}
        >
          {doc.fileName}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {formatFileSize(doc.fileSize)} &middot; v{doc.version} &middot;{" "}
          {formatDate(doc.updatedAt)}
        </p>
      </div>
      <a
        href={`/api/auditor/download?id=${doc.id}`}
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium hover:bg-gray-100 transition-colors"
        style={{ color: "#8EA698" }}
        title="Download"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Download
      </a>
    </div>
  );
}

function SubfolderSection({
  subfolder,
  documents,
  searchTerm,
}: {
  subfolder: SubfolderGroup;
  documents: QmsDocument[];
  searchTerm: string;
}) {
  const [isOpen, setIsOpen] = useState(true);

  const filtered = searchTerm
    ? documents.filter((d) =>
        d.fileName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : documents;

  if (filtered.length === 0) return null;

  return (
    <div className="ml-4 mt-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 py-1.5 text-sm font-medium hover:opacity-80 transition-opacity"
        style={{ color: "#424A54" }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="#8EA698"
          stroke="#8EA698"
          strokeWidth="1"
          className={`transition-transform ${isOpen ? "" : "-rotate-90"}`}
        >
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        <span>{subfolder.subfolder}</span>
        <span className="text-xs text-gray-400">({filtered.length})</span>
      </button>
      {isOpen && (
        <div className="ml-6 mt-1 space-y-1.5">
          {filtered.map((doc) => (
            <DocumentRow key={doc.id} doc={doc} />
          ))}
        </div>
      )}
    </div>
  );
}

function FolderSection({
  folder,
  searchTerm,
}: {
  folder: FolderGroup;
  searchTerm: string;
}) {
  const [isOpen, setIsOpen] = useState(true);

  const filteredRootDocs = searchTerm
    ? folder.documents.filter((d) =>
        d.fileName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : folder.documents;

  const filteredSubfolders = folder.subfolders
    .map((sf) => ({
      ...sf,
      documents: searchTerm
        ? sf.documents.filter((d) =>
            d.fileName.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : sf.documents,
    }))
    .filter((sf) => sf.documents.length > 0);

  const totalVisible =
    filteredRootDocs.length +
    filteredSubfolders.reduce((sum, sf) => sum + sf.documents.length, 0);

  if (totalVisible === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="#8EA698"
          stroke="#8EA698"
          strokeWidth="1"
        >
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        <span
          className="flex-1 text-left text-sm font-semibold"
          style={{ color: "#424A54" }}
        >
          {folder.folder}
        </span>
        <span className="text-xs text-gray-400">
          {totalVisible} document{totalVisible !== 1 ? "s" : ""}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9ca3af"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-4 pb-4">
          {filteredRootDocs.length > 0 && (
            <div className="space-y-1.5">
              {filteredRootDocs.map((doc) => (
                <DocumentRow key={doc.id} doc={doc} />
              ))}
            </div>
          )}
          {filteredSubfolders.map((sf) => (
            <SubfolderSection
              key={sf.subfolder}
              subfolder={sf}
              documents={sf.documents}
              searchTerm=""
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface Policy {
  id: string;
  name: string;
  description: string | null;
  category: string;
  filename: string;
  fileType: string;
  fileSize: number | null;
  version: string | null;
  isPublic: boolean;
}

const CATEGORY_ORDER = [
  "Compliance & Ethics",
  "Data & Privacy",
  "Health & Safety",
  "Business Operations",
  "Accreditations",
  "Worker Documents",
];

function PolicyRow({ policy }: { policy: Policy }) {
  const colours: Record<string, string> = {
    pdf: "#E53E3E",
    docx: "#2B6CB0",
    xlsx: "#38A169",
  };
  const colour = colours[policy.fileType.toLowerCase()] || "#718096";

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white px-4 py-3 hover:bg-gray-50 transition-colors">
      <span
        className="inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
        style={{ backgroundColor: colour }}
      >
        {policy.fileType.toUpperCase()}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "#424A54" }}>
          {policy.name}
        </p>
        {(policy.description || policy.version) && (
          <p className="text-xs text-gray-400 mt-0.5">
            {[policy.description, policy.version ? `v${policy.version}` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </div>
      <a
        href={`/api/policies/${policy.id}/download`}
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium hover:bg-gray-100 transition-colors"
        style={{ color: "#8EA698" }}
        title="Download"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Download
      </a>
    </div>
  );
}

export default function AuditorDashboard() {
  const [folderTree, setFolderTree] = useState<FolderGroup[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalDocuments: 0,
    totalFolders: 0,
    lastUpdated: null,
  });
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [activeTab, setActiveTab] = useState<"qms" | "policies">("qms");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    async function fetchDocuments() {
      try {
        // Cookie is sent automatically — no Authorization header needed
        const res = await fetch("/api/auditor/documents");

        if (res.status === 401) {
          // Token expired or invalid — clear display info and redirect
          localStorage.removeItem("auditor_name");
          localStorage.removeItem("auditor_org");
          router.push("/auditor/login");
          return;
        }

        if (!res.ok) {
          throw new Error("Failed to fetch documents");
        }

        const data = await res.json();
        setFolderTree(data.folderTree);
        setStats(data.stats);
      } catch {
        setError("Failed to load documents. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchDocuments();

    fetch("/api/auditor/policies")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => Array.isArray(data) && setPolicies(data))
      .catch(() => {});
  }, [router]);

  async function handleLogout() {
    // httpOnly cookies cannot be cleared from client JS — call server endpoint
    await fetch("/api/auditor/logout", { method: "POST" });
    localStorage.removeItem("auditor_name");
    localStorage.removeItem("auditor_org");
    router.push("/auditor/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header
        className="border-b bg-white shadow-sm"
        style={{ borderBottomColor: "#8EA698" }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="hidden sm:block text-center">
            <h1
              className="text-sm sm:text-base font-semibold"
              style={{ color: "#424A54" }}
            >
              PRL Site Solutions &mdash; QMS Audit Portal
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </button>
        </div>
        {/* Mobile title */}
        <div className="sm:hidden border-t border-gray-100 px-4 py-2 text-center">
          <h1
            className="text-sm font-semibold"
            style={{ color: "#424A54" }}
          >
            PRL Site Solutions &mdash; QMS Audit Portal
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Stats */}
        <div className="mb-6 grid grid-cols-3 gap-3 sm:gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
            <p
              className="text-2xl sm:text-3xl font-bold"
              style={{ color: "#8EA698" }}
            >
              {stats.totalDocuments}
            </p>
            <p className="text-xs text-gray-500 mt-1">Total Documents</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
            <p
              className="text-2xl sm:text-3xl font-bold"
              style={{ color: "#8EA698" }}
            >
              {stats.totalFolders}
            </p>
            <p className="text-xs text-gray-500 mt-1">Folders</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
            <p
              className="text-sm sm:text-base font-bold"
              style={{ color: "#8EA698" }}
            >
              {stats.lastUpdated ? formatDate(stats.lastUpdated) : "—"}
            </p>
            <p className="text-xs text-gray-500 mt-1">Last Updated</p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="mb-6 flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("qms")}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === "qms"
                ? "border-[#8EA698] text-[#424A54]"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            QMS Documents
          </button>
          <button
            onClick={() => setActiveTab("policies")}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === "policies"
                ? "border-[#8EA698] text-[#424A54]"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            Policy Documents
            {policies.length > 0 && (
              <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                {policies.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === "qms" && (
          <>
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2"
                  style={{ "--tw-ring-color": "#8EA698" } as React.CSSProperties}
                />
              </div>
            </div>

            {/* QMS Content */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div
                    className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
                    style={{ borderColor: "#8EA698", borderTopColor: "transparent" }}
                  />
                  <p className="mt-3 text-sm text-gray-500">Loading documents...</p>
                </div>
              </div>
            ) : error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            ) : folderTree.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
                <svg
                  className="mx-auto text-gray-300"
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                <p className="mt-4 text-sm text-gray-500">No QMS documents found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {folderTree.map((folder) => (
                  <FolderSection
                    key={folder.folder}
                    folder={folder}
                    searchTerm={searchTerm}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "policies" && (
          <>
            {policies.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
                <svg
                  className="mx-auto text-gray-300"
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <p className="mt-4 text-sm text-gray-500">No policy documents found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {CATEGORY_ORDER.map((category) => {
                  const catPolicies = policies.filter((p) => p.category === category);
                  if (catPolicies.length === 0) return null;
                  return (
                    <div key={category} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                      <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="#8EA698"
                          stroke="#8EA698"
                          strokeWidth="1"
                        >
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                        <span className="text-sm font-semibold" style={{ color: "#424A54" }}>
                          {category}
                        </span>
                        <span className="text-xs text-gray-400">
                          ({catPolicies.length} document{catPolicies.length !== 1 ? "s" : ""})
                        </span>
                      </div>
                      <div className="p-3 space-y-1.5">
                        {catPolicies.map((policy) => (
                          <PolicyRow key={policy.id} policy={policy} />
                        ))}
                      </div>
                    </div>
                  );
                })}
                {/* Any categories not in CATEGORY_ORDER */}
                {policies
                  .filter((p) => !CATEGORY_ORDER.includes(p.category))
                  .reduce<string[]>((cats, p) => cats.includes(p.category) ? cats : [...cats, p.category], [])
                  .map((category) => {
                    const catPolicies = policies.filter((p) => p.category === category);
                    return (
                      <div key={category} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
                          <span className="text-sm font-semibold" style={{ color: "#424A54" }}>{category}</span>
                          <span className="text-xs text-gray-400">({catPolicies.length})</span>
                        </div>
                        <div className="p-3 space-y-1.5">
                          {catPolicies.map((policy) => (
                            <PolicyRow key={policy.id} policy={policy} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-gray-200 bg-white py-4 text-center">
        <p className="text-xs text-gray-400">
          Read-only audit access &middot; PRL Site Solutions QMS &middot; ISO
          9001:2015
        </p>
      </footer>
    </div>
  );
}
