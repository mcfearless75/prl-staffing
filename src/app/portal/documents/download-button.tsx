"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

export function DownloadButton({
  documentId,
  fileName,
  size = "normal",
}: {
  documentId: string;
  fileName: string;
  size?: "normal" | "small";
}) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/documents/download?id=${documentId}`);
      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert("Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  if (size === "small") {
    return (
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="text-[10px] text-blue-600 hover:text-blue-800 disabled:text-gray-400"
      >
        {downloading ? "..." : "Download"}
      </button>
    );
  }

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className="flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 disabled:opacity-50 active:scale-95 transition-all"
    >
      {downloading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
      {downloading ? "..." : "Download"}
    </button>
  );
}
