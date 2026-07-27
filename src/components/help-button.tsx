"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { HelpCircle, X, BookOpen, Lightbulb } from "lucide-react";
import { findHelpTopic } from "@/lib/help-content";

export function HelpButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Portal needs document.body, unavailable during SSR — flips true post-hydration only.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  // Close automatically on navigation so stale help content isn't left open.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOpen(false), [pathname]);

  const topic = findHelpTopic(pathname);

  const panel = open && mounted ? createPortal(
    <>
      <div
        className="fixed inset-0 z-50 bg-black/30"
        onClick={() => setOpen(false)}
      />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-blue-600" />
            <h2 className="text-sm font-semibold text-gray-900">Help</h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {topic ? (
            <>
              <h3 className="text-lg font-bold text-gray-900">{topic.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{topic.summary}</p>
              {topic.tips && topic.tips.length > 0 && (
                <div className="mt-5 space-y-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-600">
                    <Lightbulb className="h-3.5 w-3.5" />
                    Worth knowing
                  </p>
                  {topic.tips.map((tip, i) => (
                    <div key={i} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
                      {tip}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">
              No specific help written for this page yet — try the full guide below.
            </p>
          )}
        </div>

        <div className="border-t border-gray-200 px-5 py-4">
          <Link
            href="/help"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-2 rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <BookOpen className="h-4 w-4" />
            Browse the Full Help Guide
          </Link>
        </div>
      </div>
    </>,
    document.body
  ) : null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Help"
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 hover:scale-105 transition-all"
      >
        <HelpCircle className="h-6 w-6" />
      </button>
      {panel}
    </>
  );
}
