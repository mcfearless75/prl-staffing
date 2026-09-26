"use client";

import { useState, useRef } from "react";
import { Camera, Upload, FileText, Check, AlertCircle, Loader2, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { COMPLIANCE_TYPE_GROUPS } from "@/lib/compliance-types";
import { EMPTY_EXPIRY, ExpiryFields, appendExpiry, expiryReady, type ExpiryValue } from "./expiry-fields";

const REQUIRES_DESCRIPTION = ["Qualification", "Other"];

export function DocumentUploader({ contractorId }: { contractorId: string }) {
  const [selectedType, setSelectedType] = useState("");
  const [expiry, setExpiry] = useState<ExpiryValue>(EMPTY_EXPIRY);
  const [customDescription, setCustomDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [files, setFiles] = useState<{ file: File; preview: string | null }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const needsDescription = REQUIRES_DESCRIPTION.includes(selectedType);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    if (newFiles.length === 0) return;
    setMessage(null);

    const additions = newFiles.map((file) => {
      return new Promise<{ file: File; preview: string | null }>((resolve) => {
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = (ev) => resolve({ file, preview: ev.target?.result as string });
          reader.readAsDataURL(file);
        } else {
          resolve({ file, preview: null });
        }
      });
    });

    Promise.all(additions).then((items) => {
      setFiles((prev) => [...prev, ...items]);
    });

    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0 || !selectedType) {
      setMessage({ type: "error", text: "Please select a document type and at least one file." });
      return;
    }
    if (!expiryReady(selectedType, expiry)) {
      setMessage({ type: "error", text: "Enter the expiry date, or tick 'This document has no expiry date'." });
      return;
    }
    if (needsDescription && !customDescription.trim()) {
      setMessage({ type: "error", text: "Please enter a description for this document." });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      let lastVersion = 0;
      // Upload each file with the same type (front, back, extra pages)
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        const label = files.length > 1 ? `${selectedType} (${i === 0 ? "Front" : i === 1 ? "Back" : `Page ${i + 1}`})` : selectedType;
        formData.append("file", files[i].file);
        formData.append("type", selectedType);
        formData.append("contractorId", contractorId);
        appendExpiry(formData, expiry);
        const pageNote = files.length > 1 ? (i === 0 ? "Front" : i === 1 ? "Back" : `Page ${i + 1}`) : "";
        const descNote = customDescription.trim() ? customDescription.trim() : "";
        const combinedNotes = [descNote, pageNote].filter(Boolean).join(" — ");
        if (combinedNotes) {
          formData.append("notes", combinedNotes);
        }

        const res = await fetch("/api/documents", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        lastVersion = data.document.version;
      }

      const fileCount = files.length;
      setMessage({
        type: "success",
        text: fileCount > 1
          ? `${selectedType} uploaded (${fileCount} files — front & back)`
          : `${selectedType} uploaded successfully`,
      });
      setFiles([]);
      setSelectedType("");
      setExpiry(EMPTY_EXPIRY);
      setCustomDescription("");
      router.refresh();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Upload failed. Please try again." });
    } finally {
      setUploading(false);
    }
  };

  const clearAll = () => {
    setFiles([]);
    setMessage(null);
  };

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-4">
      <h2 className="text-sm font-semibold text-blue-900">Upload another card or certificate</h2>
      <p className="text-xs text-blue-700">
        Please upload all valid and in-date cards and certificates. Make sure the expiry date is clear.
        Need front and back? Add both images before uploading.
      </p>

      {/* Document Type Selector */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          Document Type
        </label>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Select type...</option>
          {COMPLIANCE_TYPE_GROUPS.map((group) => (
            <optgroup key={group.category} label={group.category}>
              {group.types.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <ExpiryFields type={selectedType} value={expiry} onChange={setExpiry} />

      {/* Description field for bespoke certs */}
      {needsDescription && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            {selectedType === "Other" ? "Document Description *" : "Certificate / Qualification Name *"}
          </label>
          <input
            type="text"
            value={customDescription}
            onChange={(e) => setCustomDescription(e.target.value)}
            placeholder={
              selectedType === "Other"
                ? "e.g. Site Induction Certificate, Lifting Operations..."
                : "e.g. NVQ Level 3 Electrical Installation"
            }
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-[10px] text-gray-400">
            Describe the certification so PRL staff can identify it
          </p>
        </div>
      )}

      {/* File Previews */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-700">{files.length} file{files.length > 1 ? "s" : ""} selected</span>
            <button onClick={clearAll} className="text-xs text-red-600 hover:text-red-800">Clear all</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {files.map((f, i) => (
              <div key={i} className="relative rounded-lg border border-gray-200 bg-white p-2">
                {f.preview ? (
                  <img src={f.preview} alt={`File ${i + 1}`} className="h-20 w-full rounded object-cover" />
                ) : (
                  <div className="flex h-20 w-full items-center justify-center rounded bg-gray-100">
                    <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                <p className="mt-1 text-[10px] text-gray-500 truncate">{files.length > 1 ? (i === 0 ? "Front" : i === 1 ? "Back" : `Page ${i+1}`) : f.file.name}</p>
                <button
                  onClick={() => removeFile(i)}
                  className="absolute -top-1 -right-1 rounded-full bg-red-500 p-0.5 text-white hover:bg-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Camera + File + Add More Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => cameraInputRef.current?.click()}
          className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-blue-300 bg-white p-4 text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-colors active:scale-95"
        >
          <Camera className="h-8 w-8" />
          <span className="text-xs font-medium">{files.length > 0 ? "Add Photo" : "Take Photo"}</span>
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-white p-4 text-gray-600 hover:border-gray-400 hover:bg-gray-50 transition-colors active:scale-95"
        >
          {files.length > 0 ? <Plus className="h-8 w-8" /> : <Upload className="h-8 w-8" />}
          <span className="text-xs font-medium">{files.length > 0 ? "Add File" : "Choose File"}</span>
        </button>
      </div>

      {/* Hidden inputs — allow multiple */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.heic,.heif,.webp,.doc,.docx"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Upload button */}
      {files.length > 0 && (
        <button
          onClick={handleUpload}
          disabled={uploading || !selectedType}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading {files.length} file{files.length > 1 ? "s" : ""}...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Upload {selectedType || "Document"} ({files.length} file{files.length > 1 ? "s" : ""})
            </>
          )}
        </button>
      )}

      {/* Status message */}
      {message && (
        <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
          message.type === "success"
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
            : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {message.type === "success" ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          {message.text}
        </div>
      )}
    </div>
  );
}
