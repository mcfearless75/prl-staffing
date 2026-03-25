"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Auto-refreshes the current page data at a set interval.
 * Uses Next.js router.refresh() which re-fetches server components
 * without a full page reload — so the UI updates smoothly.
 *
 * @param intervalMs - refresh interval in milliseconds (default 30s)
 */
export function AutoRefresh({ intervalMs = 30000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => {
      router.refresh();
    }, intervalMs);

    // Also refresh when the tab becomes visible again (user switches back)
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [router, intervalMs]);

  return null;
}
