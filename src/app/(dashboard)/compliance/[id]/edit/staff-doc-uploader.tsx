"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, Check, AlertCircle, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";

const ACCEPTED = ".pdf,.jpg,.jpeg,.png,.heic,.heif,.webp,.doc,.docx";

function extensionFor(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  if (mime === "application/pdf") return "pdf";
  return "png";
}

export function StaffDocUploader({
  contractorId,
  docType,
  successMessage,
  recordId,
  defaultReference,
  defaultExpiry,
}: {
  contractorId: string;
  docType: string;
  successMessage?: string;
  /** When set, the document number / expiry are captured alongside the upload. */
  recordId?: string;
  defaultReference?: string | null;
  defaultExpiry?: string | null;
}) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reference, setReference] = useState(defaultReference ?? "");
  const [expiry, setExpiry] = useState(defaultExpiry ?? "");
  const [indefinite, setIndefinite] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!selectedFile || !selectedFile.type.startsWith("image/")) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  function acceptFile(file: File) {
    setSelectedFile(file);
    setMessage(null);
  }

  // Pasted images arrive with a generic name — label them by document type.
  function acceptPastedFile(file: File) {
    const isGeneric = !file.name || file.name === "image.png";
    const named = isGeneric
      ? new File(
          [file],
          `${docType.replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.${extensionFor(file.type)}`,
          { type: file.type }
        )
      : file;
    acceptFile(named);
  }

  // Paste is scoped to this dropzone (it fires only while focused) — pages like
  // the contractor edit screen render one uploader per document type, so a
  // page-wide listener would drop the same image into every one of them.
  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          acceptPastedFile(file);
          return;
        }
      }
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      acceptFile(file);
      return;
    }

    // Some sources (notably WhatsApp Web in a browser tab) hand over only a
    // cross-origin blob URL, which we aren't permitted to read.
    setMessage({
      type: "error",
      text: "Couldn't read that file from the drag. Copy the image instead (right-click → Copy), click this box, then press Ctrl+V.",
    });
  }

  function clearSelection() {
    setSelectedFile(null);
    setMessage(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleUpload() {
    if (!selectedFile) return;
    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("type", docType);
      formData.append("contractorId", contractorId);

      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await res.json();

      // Record the document number / expiry against the compliance record in the
      // same action, so the card is fully captured from one drag.
      if (recordId && (reference.trim() || expiry || indefinite)) {
        const detailRes = await fetch(`/api/compliance/${recordId}/details`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reference: reference.trim(),
            expiryDate: expiry,
            indefiniteExpiry: indefinite,
          }),
        });
        if (!detailRes.ok) {
          setMessage({
            type: "error",
            text: "File uploaded, but the document number / expiry could not be saved. Please set them via Edit.",
          });
          clearSelection();
          router.refresh();
          return;
        }
      }

      setMessage({
        type: "success",
        text: successMessage
          ? `${data.document.fileName} uploaded (v${data.document.version}). ${successMessage}`
          : `${data.document.fileName} uploaded successfully (v${data.document.version}).`,
      });
      clearSelection();
      router.refresh();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Upload failed" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div
        tabIndex={0}
        onPaste={handlePaste}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragActive(false);
        }}
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed px-4 py-6 text-center outline-none transition-colors ${
          dragActive
            ? "border-blue-500 bg-blue-50"
            : focused
              ? "border-blue-400 bg-blue-50/60 ring-2 ring-blue-200"
              : "border-blue-200 bg-white/60 hover:border-blue-300"
        }`}
      >
        {selectedFile ? (
          <div className="flex items-center justify-center gap-3">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Preview"
                className="h-16 w-16 rounded-lg border border-gray-200 object-cover"
              />
            )}
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">
                {selectedFile.size > 1048576
                  ? `${(selectedFile.size / 1048576).toFixed(1)}MB`
                  : `${(selectedFile.size / 1024).toFixed(0)}KB`}
              </p>
            </div>
            <button
              type="button"
              onClick={clearSelection}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              title="Remove"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="mx-auto h-6 w-6 text-blue-400" />
            <p className="mt-2 text-sm font-medium text-blue-900">
              Drag a file here, or{" "}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="underline underline-offset-2 hover:text-blue-700"
              >
                browse
              </button>
            </p>
            <p className="mt-0.5 text-xs text-blue-500">
              {focused
                ? "Ready — press Ctrl+V to paste a copied image"
                : "Drag from WhatsApp Desktop, Teams or Outlook — or click this box and press Ctrl+V"}
            </p>
          </>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) acceptFile(file);
        }}
        className="hidden"
      />

      {recordId && selectedFile && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-600">Document number</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Card / cert number"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600">Expiry</label>
            <input
              type="date"
              value={expiry}
              disabled={indefinite}
              onChange={(e) => setExpiry(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
            />
            <label className="mt-1.5 flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={indefinite}
                onChange={(e) => {
                  setIndefinite(e.target.checked);
                  if (e.target.checked) setExpiry("");
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              No expiry
            </label>
          </div>
        </div>
      )}

      {selectedFile && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? "Uploading..." : `Upload as ${docType}`}
        </button>
      )}

      {message && (
        <div
          className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm ${
            message.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {message.type === "success" ? (
            <Check className="h-4 w-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          )}
          {message.text}
        </div>
      )}
    </div>
  );
}
