"use client";

import { useState, useEffect, useCallback } from "react";
import { UserCheck, LogIn, RefreshCw, KeyRound } from "lucide-react";
import Link from "next/link";

type FeedItem = {
  id: string;
  action: string;
  name: string | null;
  details: string | null;
  createdAt: string;
};

type Stats = {
  activations24h: number;
  logins24h: number;
  activations1h: number;
  logins1h: number;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function ActionIcon({ action }: { action: string }) {
  if (action === "Contractor Account Activated") {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100">
        <UserCheck className="h-4 w-4 text-green-600" />
      </div>
    );
  }
  if (action === "Contractor Password Reset") {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
        <KeyRound className="h-4 w-4 text-amber-600" />
      </div>
    );
  }
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
      <LogIn className="h-4 w-4 text-blue-600" />
    </div>
  );
}

function ActionBadge({ action }: { action: string }) {
  if (action === "Contractor Account Activated") {
    return (
      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
        Signed up
      </span>
    );
  }
  if (action === "Contractor Password Reset") {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
        Password reset
      </span>
    );
  }
  return (
    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
      Logged in
    </span>
  );
}

export function CampaignActivityFeed() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch("/api/campaign/activity");
      if (!res.ok) return;
      const data = await res.json();
      setFeed(data.feed ?? []);
      setStats(data.stats ?? null);
      setLastRefresh(new Date());
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivity();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchActivity, 30_000);
    return () => clearInterval(interval);
  }, [fetchActivity]);

  return (
    <div className="rounded-xl border-2 border-blue-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-blue-100 px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500"></span>
          </span>
          <h2 className="text-base font-semibold text-gray-900">Campaign Activity — Live</h2>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs text-gray-400">
              Updated {timeAgo(lastRefresh.toISOString())}
            </span>
          )}
          <button
            onClick={fetchActivity}
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href="/campaign"
            className="text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            Full campaign →
          </Link>
        </div>
      </div>

      {/* Mini stats */}
      {stats && (
        <div className="grid grid-cols-4 divide-x divide-gray-100 border-b border-gray-100">
          <div className="px-4 py-3 text-center">
            <p className="text-xl font-bold text-green-600">{stats.activations1h}</p>
            <p className="text-xs text-gray-500">Sign-ups (1h)</p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="text-xl font-bold text-blue-600">{stats.logins1h}</p>
            <p className="text-xs text-gray-500">Logins (1h)</p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="text-xl font-bold text-green-700">{stats.activations24h}</p>
            <p className="text-xs text-gray-500">Sign-ups (24h)</p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="text-xl font-bold text-blue-700">{stats.logins24h}</p>
            <p className="text-xs text-gray-500">Logins (24h)</p>
          </div>
        </div>
      )}

      {/* Feed */}
      <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
        {loading ? (
          <div className="px-6 py-8 text-center text-sm text-gray-400">Loading activity...</div>
        ) : feed.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-400">
            No activity yet — emails will appear here as contractors sign up and log in.
          </div>
        ) : (
          feed.map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-6 py-3">
              <ActionIcon action={item.action} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {item.name ?? "Unknown"}
                </p>
                <p className="text-xs text-gray-500 truncate">{item.details}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <ActionBadge action={item.action} />
                <span className="text-[10px] text-gray-400">{timeAgo(item.createdAt)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
