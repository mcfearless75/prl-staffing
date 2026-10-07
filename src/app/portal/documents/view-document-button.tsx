"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

/**
 * Opens a document inside the app with a Close button, instead of a new tab.
 * On the installed Android app a new tab replaced the app, so after viewing a
 * passport there was no way back except closing it (Erica, 2026-10-07). The
 * phone's Back button also closes the viewer.
 */
export function ViewDocumentButton({
  documentId,
  fileName,
  mimeType,
}: {
  documentId: string;
  fileName: string;
  mimeType: string;
}) {
  const [open, setOpen] = useState(false);
  const src = `/api/documents/download?id=${documentId}&view=true`;
  const isImage = mimeType.startsWith("image/");

  function close() {
    // Undo our history entry; popstate then closes the viewer.
    if (history.state?.docViewer) history.back();
    else setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    // A history entry so the phone's Back button closes the viewer, not the app.
    history.pushState({ docViewer: true }, "");
    const onPop = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("popstate", onPop);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-blue-50 px-2.5 py-1 text-[10px] font-medium text-blue-700 hover:bg-blue-100 transition-colors"
      >
        View
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90 safe-area-top safe-area-bottom" role="dialog" aria-label={fileName}>
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <p className="truncate text-sm text-white/80">{fileName}</p>
            <button
              type="button"
              onClick={close}
              className="flex min-h-[44px] items-center gap-1 rounded-lg bg-white px-3 text-sm font-medium text-gray-900"
            >
              <X className="h-4 w-4" /> Close
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center overflow-auto p-2">
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt={fileName} className="max-h-full max-w-full object-contain" />
            ) : (
              <div className="flex h-full w-full flex-col gap-2">
                <iframe src={src} title={fileName} className="w-full flex-1 rounded bg-white" />
                {/* Android's browser can't show PDFs inside a page. */}
                <p className="text-center text-xs text-white/70">Can&apos;t see it? Close this and use Download.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
