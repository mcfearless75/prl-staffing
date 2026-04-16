"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Send,
  Users,
  Mail,
  MailOpen,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

type ContractorRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  inviteSentAt: string | null;
  inviteOpenedAt: string | null;
  isActivated: boolean;
  lastLoginAt: string | null;
};

type CampaignStats = {
  total: number;
  sent: number;
  opened: number;
  activated: number;
  pending: number;
  contractors: ContractorRow[];
};

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
      <div className={`rounded-lg p-3 ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function StatusBadge({ contractor }: { contractor: ContractorRow }) {
  if (contractor.isActivated) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
        <CheckCircle className="h-3 w-3" />
        Active
      </span>
    );
  }
  if (contractor.inviteOpenedAt) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
        <MailOpen className="h-3 w-3" />
        Opened
      </span>
    );
  }
  if (contractor.inviteSentAt) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
        <Mail className="h-3 w-3" />
        Sent
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
      <Clock className="h-3 w-3" />
      Pending
    </span>
  );
}

function maskEmail(email: string | null): string {
  if (!email) return "—";
  const [local, domain] = email.split("@");
  if (!domain) return "—";
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}

function fmt(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CampaignPage() {
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{
    sent: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/campaign/status");
      if (!res.ok) throw new Error("Failed to load campaign data");
      const data = await res.json();
      setStats(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  async function handleSend() {
    if (!confirm(`This will send the launch email to all ${stats?.pending ?? 0} contractors who haven't been invited yet. Continue?`)) {
      return;
    }
    setSending(true);
    setSendResult(null);
    setError(null);
    try {
      const res = await fetch("/api/campaign/send", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Send failed");
      } else {
        setSendResult(data);
        await fetchStats();
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Campaign</h1>
          <p className="mt-1 text-sm text-gray-500">
            Send the PRISM launch email to contractors and track engagement
          </p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Total Contractors" value={stats.total} icon={Users} color="bg-gray-500" />
          <StatCard label="Emails Sent" value={stats.sent} icon={Mail} color="bg-blue-500" />
          <StatCard label="Emails Opened" value={stats.opened} icon={MailOpen} color="bg-amber-500" />
          <StatCard label="Portal Activated" value={stats.activated} icon={CheckCircle} color="bg-green-500" />
          <StatCard label="Pending" value={stats.pending} icon={Clock} color="bg-slate-400" />
        </div>
      )}

      {/* Send result banner */}
      {sendResult && (
        <div className={`rounded-xl border p-4 ${sendResult.failed > 0 ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"}`}>
          <p className={`font-medium ${sendResult.failed > 0 ? "text-amber-800" : "text-green-800"}`}>
            Campaign complete: {sendResult.sent} sent, {sendResult.failed} failed
          </p>
          {sendResult.errors.length > 0 && (
            <ul className="mt-2 space-y-1">
              {sendResult.errors.map((e, i) => (
                <li key={i} className="text-sm text-amber-700">{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* Email preview + send button */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Email preview */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Email Preview</h2>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex gap-2">
              <span className="font-medium text-gray-700 w-16 shrink-0">From:</span>
              <span>PRL Site Solutions &lt;infotech@prlsitesolutions.co.uk&gt;</span>
            </div>
            <div className="flex gap-2">
              <span className="font-medium text-gray-700 w-16 shrink-0">Subject:</span>
              <span>Welcome to the PRL Site Solutions Contractor Portal</span>
            </div>
            <hr className="my-3" />
            <div className="rounded-lg bg-[#1F4E79] p-4 text-center">
              <p className="text-white font-bold text-lg tracking-widest">PRISM</p>
              <p className="text-blue-300 text-xs mt-1">PRL Site Solutions — Contractor Portal</p>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-100 p-4 space-y-2">
              <p className="text-gray-800 font-medium">Hi [First Name],</p>
              <p className="text-gray-600 text-xs leading-relaxed">
                We're excited to let you know that PRL Site Solutions has launched PRISM — our new contractor management portal designed to make your working life easier.
              </p>
              <div className="rounded bg-blue-50 border border-blue-100 p-3">
                <p className="text-xs font-semibold text-blue-800 mb-1">Through PRISM you can:</p>
                <ul className="text-xs text-gray-700 space-y-0.5 list-none">
                  <li>&#10003; View and submit your timesheets online</li>
                  <li>&#10003; Access your payslips and compliance documents</li>
                  <li>&#10003; Track your assignment details</li>
                  <li>&#10003; Raise pay queries instantly</li>
                  <li>&#10003; Keep your profile and emergency contacts up to date</li>
                </ul>
              </div>
              <div className="text-center py-2">
                <span className="inline-block bg-blue-600 text-white text-xs font-semibold px-6 py-2 rounded-lg">
                  Set Up My Account
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Need help? Email us at info@prlsitesolutions.co.uk
              </p>
            </div>
            <p className="text-center text-xs text-gray-400">
              PRL Site Solutions | Recruitment Specialists | prismworkforce.online
            </p>
          </div>
        </div>

        {/* Send action */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-2">Send Launch Emails</h2>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              Send the portal launch email to all contractors who haven't received an invite yet. Each email includes a personalised password setup link and an open-tracking pixel.
            </p>

            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 mb-6">
              <div className="flex gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Before you send</p>
                  <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                    This will send to all <strong>{stats?.pending ?? "—"}</strong> contractors who haven't been invited yet. This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Ready to send:</span>
                <span className="font-semibold text-gray-900">{stats?.pending ?? "—"}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Already sent:</span>
                <span className="font-semibold text-gray-900">{stats?.sent ?? "—"}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Opened:</span>
                <span className="font-semibold text-gray-900">{stats?.opened ?? "—"}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Activated:</span>
                <span className="font-semibold text-gray-900">{stats?.activated ?? "—"}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleSend}
            disabled={sending || !stats || stats.pending === 0}
            className="mt-6 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Launch Emails ({stats?.pending ?? 0})
              </>
            )}
          </button>
          {stats?.pending === 0 && !sending && (
            <p className="text-center text-xs text-gray-400 mt-2">All contractors have already been invited.</p>
          )}
        </div>
      </div>

      {/* Contractor table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">
            Contractor Invite Status
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {stats?.total ?? 0} contractors total
          </p>
        </div>

        {loading && !stats ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Invite Sent</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Opened</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Portal Active</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats?.contractors.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {c.firstName} {c.lastName}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">
                      {maskEmail(c.email)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {fmt(c.inviteSentAt)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {fmt(c.inviteOpenedAt)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {c.isActivated ? (
                        <span className="text-green-700 font-medium">
                          {c.lastLoginAt ? `Last login ${fmt(c.lastLoginAt)}` : "Activated"}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge contractor={c} />
                    </td>
                  </tr>
                ))}
                {!stats?.contractors.length && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">
                      No contractors found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
