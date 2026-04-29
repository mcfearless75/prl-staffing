"use client";

import { useState, useRef } from "react";
import { Upload, Check, AlertCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function StaffDocUploader({
  contractorId,
  docType,
  successMessage,
}: {
  contractorId: string;
  docType: string;
  successMessage?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

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
      setMessage({
        type: "success",
        text: successMessage
          ? `${data.document.fileName} uploaded (v${data.document.version}). ${successMessage}`
          : `${data.document.fileName} uploaded successfully (v${data.document.version}).`,
      });
      setSelectedFile(null);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Upload failed" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.heic,.heif,.webp,.doc,.docx"
          onChange={(e) => {
            setSelectedFile(e.target.files?.[0] || null);
            setMessage(null);
          }}
          className="flex-1 text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700 file:cursor-pointer"
        />
        {selectedFile && (
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {uploading ? "Uploading..." : "Upload"}
          </button>
        )}
      </div>

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
