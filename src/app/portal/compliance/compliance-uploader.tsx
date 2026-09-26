"use client";

import { useState, useRef } from "react";
import { Camera, Upload, Loader2, Check, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { EMPTY_EXPIRY, ExpiryFields, appendExpiry, expiryReady, type ExpiryValue } from "../documents/expiry-fields";

export function ComplianceUploader({
  contractorId,
  docType,
  label,
  isResubmit,
}: {
  contractorId: string;
  docType: string;
  label: string;
  isResubmit: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [reference, setReference] = useState("");
  const [expiry, setExpiry] = useState<ExpiryValue>(EMPTY_EXPIRY);
  const ready = expiryReady(docType, expiry);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFile(file: File) {
    if (!file) return;
    if (!ready) {
      setMessage({ type: "error", text: "Enter the expiry date first, or tick 'This document has no expiry date'." });
      return;
    }
    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", docType);
      formData.append("contractorId", contractorId);
      appendExpiry(formData, expiry);

      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      // The expiry travels with the upload itself; only the optional
      // reference still needs this second call.
      if (reference) {
        const detailsRes = await fetch("/api/portal/compliance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contractorId,
            type: docType,
            reference,
          }),
        });

        if (!detailsRes.ok) {
          const data = await detailsRes.json().catch(() => ({}));
          throw new Error(
            data.error || "File uploaded, but the reference could not be saved."
          );
        }
      }

      setMessage({ type: "success", text: `${label} uploaded! Awaiting verification.` });
      setReference("");
      setExpiry(EMPTY_EXPIRY);
      router.refresh();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Upload failed" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
      if (cameraRef.current) cameraRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2.5">
      <p className="text-[10px] font-medium text-gray-600">
        {isResubmit ? "Upload updated document:" : "Upload to complete this requirement:"}
      </p>

      <ExpiryFields type={docType} value={expiry} onChange={setExpiry} compact />
      <input
        type="text"
        placeholder="Reference / card number (optional)"
        value={reference}
        onChange={(e) => setReference(e.target.value)}
        className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />

      {/* Upload buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => cameraRef.current?.click()}
          disabled={uploading || !ready}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50 active:scale-95 transition-all"
        >
          <Camera className="h-3.5 w-3.5" />
          Photo
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading || !ready}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 active:scale-95 transition-all"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? "Uploading..." : "File"}
        </button>
      </div>

      {/* Hidden inputs */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} className="hidden" />
      <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.heic,.heif,.webp,.doc,.docx" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} className="hidden" />

      {/* Status */}
      {message && (
        <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] ${
          message.type === "success" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
        }`}>
          {message.type === "success" ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
          {message.text}
        </div>
      )}
    </div>
  );
}
