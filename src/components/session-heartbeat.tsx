"use client";

import { useEffect } from "react";
import { HEARTBEAT_INTERVAL_MS } from "@/lib/session-monitor";

/**
 * Reports "this person has PRISM open" once a minute while the tab is
 * visible. Feeds the infotech@-only session monitor at /sessions.
 */
export function SessionHeartbeat() {
  useEffect(() => {
    function beat() {
      if (document.visibilityState !== "visible") return;
      fetch("/api/session/heartbeat", { method: "POST", keepalive: true }).catch(() => {});
    }
    beat();
    const timer = setInterval(beat, HEARTBEAT_INTERVAL_MS);
    document.addEventListener("visibilitychange", beat);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", beat);
    };
  }, []);
  return null;
}
