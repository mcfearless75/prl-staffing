"use client";

import { useState, useRef } from "react";
import { Camera, Upload, FileText, Check, AlertCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

const DOC_TYPES = [
  "CV",
  "CSCS",
  "CCNSG",
  "NPORS",
  "Passport",
  "Share Code",
  "DBS",
  "P45",
  "P60",
  "Insurance",
  "Qualification",
  "Right to Work",
  "IR35 Assessment",
  "Other",
];

export function DocumentUploader({ contractorId }: { contractorId: string }) {
  const [selectedType, setSelectedType] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setMessage(null);

    // Preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedType) {
      setMessage({ type: "error", text: "Please select a document type and file." });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("type", selectedType);
      formData.append("contractorId", contractorId);

      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setMessage({ type: "success", text: `${data.document.type} uploaded successfully (v${data.document.version})` });
      setSelectedFile(null);
      setPreview(null);
      setSelectedType("");
      // Reset file inputs
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
      // Refresh page data
      router.refresh();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Upload failed. Please try again." });
    } finally {
      setUploading(false);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreview(null);
    setMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-4">
      <h2 className="text-sm font-semibold text-blue-900">Upload Document</h2>

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
          {DOC_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      {/* File Preview */}
      {selectedFile && (
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="flex items-center gap-3">
            {preview ? (
              <img
                src={preview}
                alt="Preview"
                className="h-16 w-16 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-gray-500">
                {(selectedFile.size / 1024).toFixed(0)} KB — {selectedFile.type || "unknown"}
              </p>
            </div>
            <button
              onClick={clearSelection}
              className="text-xs text-red-600 hover:text-red-800"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {/* Camera + File Upload Buttons */}
      {!selectedFile && (
        <div className="grid grid-cols-2 gap-3">
          {/* Camera button */}
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-blue-300 bg-white p-4 text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-colors active:scale-95"
          >
            <Camera className="h-8 w-8" />
            <span className="text-xs font-medium">Take Photo</span>
          </button>

          {/* File upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-white p-4 text-gray-600 hover:border-gray-400 hover:bg-gray-50 transition-colors active:scale-95"
          >
            <Upload className="h-8 w-8" />
            <span className="text-xs font-medium">Choose File</span>
          </button>
        </div>
      )}

      {/* Hidden file inputs */}
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
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Upload button */}
      {selectedFile && (
        <button
          onClick={handleUpload}
          disabled={uploading || !selectedType}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Upload {selectedType || "Document"}
            </>
          )}
        </button>
      )}

      {/* Status message */}
      {message && (
        <div
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.type === "success" ? (
            <Check className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {message.text}
        </div>
      )}
    </div>
  );
}
