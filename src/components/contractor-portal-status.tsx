"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Unlock, Key, CheckCircle, AlertTriangle } from "lucide-react";

type LoginInfo = {
  id: string;
  email: string;
  failedAttempts: number;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  tokenVersion: number;
};

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function ContractorPortalStatus({ contractorId }: { contractorId: string }) {
  const [info, setInfo] = useState<LoginInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [result, setResult] = useState<{ message?: string; tempPassword?: string; email?: string; error?: string } | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/contractors/${contractorId}/unlock`);
    const data = await res.json();
    setInfo(data.contractorLogin || null);
    setLoading(false);
  }

  useEffect(() => { load(); }, [contractorId]);

  async function doAction(action: string) {
    if (!confirm(action === "resetPassword"
      ? "Reset this contractor's portal password? A temporary password will be generated — give it to them directly."
      : "Unlock this account and clear failed login attempts?"
    )) return;
    setActing(true);
    setResult(null);
    const res = await fetch(`/api/contractors/${contractorId}/unlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setResult(data);
    setActing(false);
    if (data.success) load();
  }

  if (loading) return <p className="text-sm text-gray-400 animate-pulse">Loading portal account...</p>;

  if (!info) return (
    <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-sm text-gray-500">
      No portal account set up yet — contractor has not completed account setup.
    </div>
  );

  const isLocked = info.lockedUntil && new Date(info.lockedUntil) > new Date();
  const hasFailures = info.failedAttempts > 0;

  return (
    <div className="space-y-4">
      {/* Status grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Portal Email</p>
          <p className="mt-1 text-sm font-medium text-gray-800 break-all">{info.email}</p>
        </div>
        <div className={`rounded-lg border p-3 ${isLocked ? "bg-red-50 border-red-200" : hasFailures ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-100"}`}>
          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Account Status</p>
          <p className={`mt-1 text-sm font-bold ${isLocked ? "text-red-700" : hasFailures ? "text-amber-700" : "text-emerald-700"}`}>
            {isLocked ? "🔒 LOCKED" : hasFailures ? `⚠ ${info.failedAttempts} failed attempts` : "✓ OK"}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Last Login</p>
          <p className="mt-1 text-sm text-gray-800">{fmt(info.lastLoginAt)}</p>
        </div>
        <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Account Created</p>
          <p className="mt-1 text-sm text-gray-800">{fmt(info.createdAt)}</p>
        </div>
        {isLocked && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">Locked Until</p>
            <p className="mt-1 text-sm text-red-700 font-medium">{fmt(info.lockedUntil)}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => doAction("unlock")}
          disabled={acting || (!isLocked && !hasFailures)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-40 transition-colors"
        >
          <Unlock className="h-3.5 w-3.5" />
          {acting ? "Working..." : "Unlock Account"}
        </button>
        <button
          onClick={() => doAction("resetPassword")}
          disabled={acting}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          <Key className="h-3.5 w-3.5" />
          {acting ? "Working..." : "Reset Password"}
        </button>
        <button onClick={load} disabled={loading} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className={`rounded-lg border p-4 ${result.error ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"}`}>
          {result.error ? (
            <p className="text-sm text-red-700 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{result.error}</p>
          ) : result.tempPassword ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-emerald-800 flex items-center gap-2"><CheckCircle className="h-4 w-4" />Password reset successfully</p>
              <div className="rounded-md bg-white border border-emerald-200 p-3">
                <p className="text-xs text-gray-500 mb-1">Give these credentials to the contractor:</p>
                <p className="text-sm text-gray-700"><span className="font-medium">Email:</span> {result.email}</p>
                <p className="text-sm text-gray-700"><span className="font-medium">Temp password:</span> <span className="font-mono font-bold text-blue-700">{result.tempPassword}</span></p>
                <p className="text-xs text-gray-400 mt-2">Tell them to log in and change their password immediately.</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-emerald-800 flex items-center gap-2"><CheckCircle className="h-4 w-4" />{result.message}</p>
          )}
        </div>
      )}
    </div>
  );
}
