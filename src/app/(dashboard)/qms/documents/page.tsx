"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useTransition, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search,
  FolderOpen,
  FolderClosed,
  FileText,
  FileSpreadsheet,
  Presentation,
  File,
  Download,
  Upload,
  X,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { uploadQmsDocument } from "./actions";

// ─── Folder structure definition ───
interface FolderNode {
  name: string;
  key: string;
  children?: FolderNode[];
}

const FOLDER_STRUCTURE: FolderNode[] = [
  {
    name: "1. Context of Organisation",
    key: "Context of Organisation",
    children: [
      { name: "Interested Parties", key: "Interested Parties" },
      { name: "Job Description Templates", key: "Job Description Templates" },
      { name: "Structure Chart", key: "Structure Chart" },
      {
        name: "SWOT & PESTLE",
        key: "SWOT & PESTLE",
        children: [{ name: "Archive", key: "Archive" }],
      },
    ],
  },
  { name: "2. Quality Manual & Policy", key: "Quality Manual & Policy" },
  { name: "3. Operational Processes", key: "Operational Processes" },
  {
    name: "4. Core Procedures",
    key: "Core Procedures",
    children: [
      { name: "Calibrated Equipment (excluded)", key: "Calibrated Equipment" },
      { name: "Competence & Awareness", key: "Competence & Awareness" },
      { name: "Customer Satisfaction", key: "Customer Satisfaction" },
      { name: "Design & Development (Excluded)", key: "Design & Development" },
      { name: "Documented Information", key: "Documented Information" },
      { name: "Internal Audits", key: "Internal Audits" },
      { name: "Management Reviews", key: "Management Reviews" },
      { name: "Non C & Corrective Actions", key: "Non C & Corrective Actions" },
      { name: "Purchasing & Procurement", key: "Purchasing & Procurement" },
      { name: "Quality Objectives & Targets", key: "Quality Objectives & Targets" },
      { name: "Risks & Opportunities", key: "Risks & Opportunities" },
    ],
  },
  { name: "5. Master Document", key: "Master Document" },
  { name: "6. Documents supplied", key: "Documents supplied" },
];

// ─── Types ───
interface QmsDoc {
  id: string;
  fileName: string;
  filePath: string;
  folder: string;
  subfolder: string | null;
  fileType: string;
  fileSize: number;
  r2Key: string | null;
  uploadedBy: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Helpers ───
function getFileIcon(type: string) {
  switch (type.toLowerCase()) {
    case "pdf":
      return <FileText className="h-4 w-4 text-red-500" />;
    case "docx":
    case "doc":
      return <FileText className="h-4 w-4 text-blue-500" />;
    case "xlsx":
    case "xls":
      return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
    case "pptx":
    case "ppt":
      return <Presentation className="h-4 w-4 text-orange-500" />;
    default:
      return <File className="h-4 w-4 text-gray-400" />;
  }
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

// ─── Build flat folder options for the upload dropdown ───
function buildFolderOptions(): { folder: string; subfolder: string | null; label: string }[] {
  const options: { folder: string; subfolder: string | null; label: string }[] = [];
  function walk(nodes: FolderNode[], parentFolder?: string) {
    for (const node of nodes) {
      if (parentFolder) {
        options.push({
          folder: parentFolder,
          subfolder: node.key,
          label: `${parentFolder} / ${node.name}`,
        });
        if (node.children) {
          // Third level (e.g., Archive under SWOT & PESTLE)
          for (const child of node.children) {
            options.push({
              folder: parentFolder,
              subfolder: `${node.key}/${child.key}`,
              label: `${parentFolder} / ${node.name} / ${child.name}`,
            });
          }
        }
      } else {
        options.push({
          folder: node.key,
          subfolder: null,
          label: node.name,
        });
        if (node.children) {
          walk(node.children, node.key);
        }
      }
    }
  }
  walk(FOLDER_STRUCTURE);
  return options;
}

// ─── Count documents in a folder/subfolder ───
function countDocs(
  docs: QmsDoc[],
  folderKey: string,
  subfolderKey?: string
): number {
  return docs.filter((d) => {
    if (subfolderKey !== undefined) {
      return d.folder === folderKey && d.subfolder === subfolderKey;
    }
    return d.folder === folderKey;
  }).length;
}

// ─── Folder Tree Component ───
function FolderTreeNode({
  node,
  docs,
  searchQuery,
  expanded,
  toggleExpand,
  parentFolder,
  depth,
}: {
  node: FolderNode;
  docs: QmsDoc[];
  searchQuery: string;
  expanded: Set<string>;
  toggleExpand: (key: string) => void;
  parentFolder?: string;
  depth: number;
}) {
  const folderKey = parentFolder || node.key;
  const subfolderKey = parentFolder ? node.key : undefined;
  const expandKey = parentFolder ? `${parentFolder}/${node.key}` : node.key;
  const isExpanded = expanded.has(expandKey);
  const hasChildren = node.children && node.children.length > 0;

  // Get files that belong to this specific folder
  const folderDocs = docs.filter((d) => {
    if (parentFolder) {
      return d.folder === parentFolder && d.subfolder === node.key;
    }
    // For top-level folders, show files directly in the folder (no subfolder)
    return d.folder === node.key && !d.subfolder;
  });

  // Filter by search
  const filteredDocs = searchQuery
    ? folderDocs.filter((d) =>
        d.fileName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : folderDocs;

  const docCount = countDocs(docs, folderKey, subfolderKey);

  return (
    <div>
      <button
        onClick={() => toggleExpand(expandKey)}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors"
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
      >
        {hasChildren || folderDocs.length > 0 ? (
          isExpanded ? (
            <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
          )
        ) : (
          <span className="w-4 shrink-0" />
        )}
        {isExpanded ? (
          <FolderOpen className="h-5 w-5 text-blue-500 shrink-0" />
        ) : (
          <FolderClosed className="h-5 w-5 text-yellow-500 shrink-0" />
        )}
        <span className="font-medium text-gray-900 truncate">{node.name}</span>
        <span className="ml-auto shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
          {docCount}
        </span>
      </button>

      {isExpanded && (
        <div>
          {/* Child folders */}
          {hasChildren &&
            node.children!.map((child) => (
              <FolderTreeNode
                key={child.key}
                node={child}
                docs={docs}
                searchQuery={searchQuery}
                expanded={expanded}
                toggleExpand={toggleExpand}
                parentFolder={node.key}
                depth={depth + 1}
              />
            ))}

          {/* Files in this folder */}
          {filteredDocs.length > 0 && (
            <div className="ml-4" style={{ paddingLeft: `${depth * 20 + 12}px` }}>
              {filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                >
                  {getFileIcon(doc.fileType)}
                  <span className="truncate text-gray-700 flex-1 min-w-0">
                    {doc.fileName}
                  </span>
                  <span className="shrink-0 text-xs text-gray-400">
                    {formatFileSize(doc.fileSize)}
                  </span>
                  <span className="shrink-0 text-xs text-gray-400">
                    {formatDate(doc.createdAt)}
                  </span>
                  <a
                    href={`/api/qms-documents/download?id=${doc.id}`}
                    className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* Empty state for expanded folder with no files */}
          {filteredDocs.length === 0 && !hasChildren && (
            <p
              className="px-3 py-2 text-xs text-gray-400 italic"
              style={{ paddingLeft: `${(depth + 1) * 20 + 28}px` }}
            >
              No documents
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Upload Modal with Multi-File + Drag & Drop ───
function UploadModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [selectedFolder, setSelectedFolder] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const folderOptions = buildFolderOptions();

  if (!open) return null;

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter((f) =>
      /\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i.test(f.name)
    );
    setFiles((prev) => [...prev, ...droppedFiles]);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selected]);
    }
    e.target.value = ""; // Reset so same file can be selected again
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleUpload() {
    if (!selectedFolder || files.length === 0) return;

    const selected = folderOptions.find(
      (o) => `${o.folder}||${o.subfolder || ""}` === selectedFolder
    );
    if (!selected) return;

    setUploadProgress({ done: 0, total: files.length });

    startTransition(async () => {
      try {
        for (let i = 0; i < files.length; i++) {
          const formData = new FormData();
          formData.set("file", files[i]);
          formData.set("folder", selected.folder);
          formData.set("subfolder", selected.subfolder || "");
          await uploadQmsDocument(formData);
          setUploadProgress({ done: i + 1, total: files.length });
        }
        setFiles([]);
        setUploadProgress(null);
        onClose();
      } catch {
        alert("Upload failed. Please try again.");
        setUploadProgress(null);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Upload Documents</h2>
          <button
            onClick={() => { setFiles([]); setUploadProgress(null); onClose(); }}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Folder selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Upload to folder
            </label>
            <select
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select a folder...</option>
              {folderOptions.map((opt) => (
                <option
                  key={`${opt.folder}||${opt.subfolder || ""}`}
                  value={`${opt.folder}||${opt.subfolder || ""}`}
                >
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`relative rounded-xl border-2 border-dashed p-8 text-center transition-all ${
              dragOver
                ? "border-blue-400 bg-blue-50 scale-[1.01]"
                : "border-gray-300 bg-gray-50 hover:border-gray-400"
            }`}
          >
            <Upload className={`mx-auto h-10 w-10 ${dragOver ? "text-blue-500" : "text-gray-400"}`} />
            <p className="mt-2 text-sm font-medium text-gray-700">
              {dragOver ? "Drop files here!" : "Drag & drop files here"}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              PDF, Word, Excel, PowerPoint — multiple files supported
            </p>
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <FileText className="h-4 w-4" />
              Browse files
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </div>

          {/* Selected files list */}
          {files.length > 0 && (
            <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
              {files.map((file, i) => (
                <div key={`${file.name}-${i}`} className="flex items-center gap-3 px-3 py-2">
                  {getFileIcon(file.name.split(".").pop() || "")}
                  <span className="truncate text-sm text-gray-700 flex-1">{file.name}</span>
                  <span className="shrink-0 text-xs text-gray-400">{formatFileSize(file.size)}</span>
                  {!uploadProgress && (
                    <button
                      onClick={() => removeFile(i)}
                      className="shrink-0 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {uploadProgress && i < uploadProgress.done && (
                    <span className="shrink-0 text-xs text-emerald-600 font-medium">✓</span>
                  )}
                  {uploadProgress && i === uploadProgress.done && (
                    <span className="shrink-0 h-3 w-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Progress bar */}
          {uploadProgress && (
            <div>
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Uploading {uploadProgress.done} of {uploadProgress.total} files...</span>
                <span>{Math.round((uploadProgress.done / uploadProgress.total) * 100)}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${(uploadProgress.done / uploadProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-gray-500">
              {files.length} file{files.length !== 1 ? "s" : ""} selected
              {files.length > 0 && ` · ${formatFileSize(files.reduce((s, f) => s + f.size, 0))}`}
            </span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setFiles([]); setUploadProgress(null); onClose(); }}
                disabled={!!uploadProgress}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={isPending || !selectedFolder || files.length === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Upload className="h-4 w-4" />
                {isPending
                  ? `Uploading (${uploadProgress?.done || 0}/${uploadProgress?.total || 0})...`
                  : `Upload ${files.length} file${files.length !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───
function QmsDocumentsInner() {
  const searchParams = useSearchParams();
  const subfolderParam = searchParams.get("subfolder"); // e.g. "Core Procedures/Internal Audits"

  const [documents, setDocuments] = useState<QmsDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    if (!subfolderParam) return new Set<string>();
    // Expand every ancestor level: "Core Procedures" AND "Core Procedures/Internal Audits"
    const keys = new Set<string>();
    const parts = subfolderParam.split("/");
    let cumulative = "";
    for (const part of parts) {
      cumulative = cumulative ? `${cumulative}/${part}` : part;
      keys.add(cumulative);
    }
    return keys;
  });
  const [showUpload, setShowUpload] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/qms-documents/list");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFetchError(data.error || `Server error ${res.status}`);
        return;
      }
      const data = await res.json();
      setDocuments(data);
      setFetchError(null);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  function toggleExpand(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  // Filter documents by search
  const filteredDocs = searchQuery
    ? documents.filter((d) =>
        d.fileName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : documents;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900 truncate">
            QMS Document Repository
          </h1>
          <p className="mt-1 text-xs lg:text-sm text-gray-500">
            ISO 9001 document management system
          </p>
        </div>
        <div className="shrink-0">
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Upload className="h-4 w-4" />
            Upload Document
          </button>
        </div>
      </div>

      {/* Error banner */}
      {fetchError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          ⚠️ Could not load documents: {fetchError}
        </div>
      )}

      {/* Filtered docs panel — shown when arriving from a dashboard card */}
      {subfolderParam && !loading && !fetchError && (() => {
        const slashIdx = subfolderParam.indexOf("/");
        const filterFolder = slashIdx > -1 ? subfolderParam.slice(0, slashIdx) : subfolderParam;
        const filterSubfolder = slashIdx > -1 ? subfolderParam.slice(slashIdx + 1) : null;
        const matchingDocs = documents.filter((d) =>
          d.folder === filterFolder &&
          (filterSubfolder ? d.subfolder === filterSubfolder : !d.subfolder)
        );
        const label = filterSubfolder ? `${filterFolder} / ${filterSubfolder}` : filterFolder;
        return (
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
            <p className="text-xs font-semibold text-blue-800 mb-3">
              📁 {label} — {matchingDocs.length} document{matchingDocs.length !== 1 ? "s" : ""}
            </p>
            {matchingDocs.length === 0 ? (
              <p className="text-xs text-blue-600 italic">No documents uploaded to this folder yet.</p>
            ) : (
              <div className="space-y-1.5">
                {matchingDocs.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 rounded-lg border border-blue-100 bg-white px-3 py-2">
                    {getFileIcon(doc.fileType)}
                    <span className="flex-1 min-w-0 text-xs font-medium text-gray-800 truncate">{doc.fileName}</span>
                    <span className="shrink-0 text-[10px] text-gray-400">{formatFileSize(doc.fileSize)}</span>
                    <span className="shrink-0 text-[10px] text-gray-400">{formatDate(doc.createdAt)}</span>
                    <a
                      href={`/api/qms-documents/download?id=${doc.id}`}
                      className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-blue-100 hover:text-blue-600 transition-colors"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search documents by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Folder Tree */}
      <div className="rounded-xl border border-gray-200 bg-white">
        {loading ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-gray-500">Loading documents...</p>
          </div>
        ) : fetchError ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-gray-400">Document tree unavailable — see error above.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {FOLDER_STRUCTURE.map((folder) => (
              <FolderTreeNode
                key={folder.key}
                node={folder}
                docs={filteredDocs}
                searchQuery={searchQuery}
                expanded={expanded}
                toggleExpand={toggleExpand}
                depth={0}
              />
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="text-xs text-gray-400">
        {documents.length} document{documents.length !== 1 ? "s" : ""} total
        {searchQuery && filteredDocs.length !== documents.length && (
          <> &middot; {filteredDocs.length} matching search</>
        )}
      </div>

      {/* Upload Modal */}
      <UploadModal
        open={showUpload}
        onClose={() => {
          setShowUpload(false);
          fetchDocuments();
        }}
      />
    </div>
  );
}

export default function QmsDocumentsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-gray-400">Loading documents...</div>}>
      <QmsDocumentsInner />
    </Suspense>
  );
}
