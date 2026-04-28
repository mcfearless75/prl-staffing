"use client";
// Campaign page v3 — Profile Completion Campaign
import { useState, useEffect, useCallback } from "react";
import {
  Send, Users, Mail, MailOpen, CheckCircle, Clock,
  AlertTriangle, RefreshCw, UserCheck, FileCheck, XCircle,
} from "lucide-react";

type ContractorRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  inviteSentAt: string | null;
  inviteOpenedAt: string | null;
  profileCompletionSentAt: string | null;
  isActivated: boolean;
  lastLoginAt: string | null;
  profileComplete: boolean;
  missingFields: string[];
  docsUploaded: boolean;
};

type CampaignStats = {
  total: number;
  sent: number;
  opened: number;
  activated: number;
  pending: number;
  profileCompleteCount: number;
  hasDocuments: number;
  contractors: ContractorRow[];
};

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: React.ElementType; color: string;
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

function ProfileBadge({ c }: { c: ContractorRow }) {
  if (!c.isActivated) {
    return <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500"><Clock className="h-3 w-3" />Not signed up</span>;
  }
  if (c.profileComplete && c.docsUploaded) {
    return <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800"><CheckCircle className="h-3 w-3" />Complete</span>;
  }
  if (c.profileComplete && !c.docsUploaded) {
    return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800"><FileCheck className="h-3 w-3" />Docs missing</span>;
  }
  return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700"><XCircle className="h-3 w-3" />Incomplete</span>;
}

function maskEmail(email: string | null): string {
  if (!email) return "—";
  const [local, domain] = email.split("@");
  if (!domain) return "—";
  return `${local.slice(0, 2)}***@${domain}`;
}

function fmt(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function CampaignPage() {
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number; errors: string[]; mode?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "opened" | "incomplete" | "complete" | "notSignedUp">("all");

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/campaign/status");
      if (!res.ok) throw new Error("Failed to load campaign data");
      setStats(await res.json());
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  async function handleSend(mode: string, confirmMsg: string) {
    if (!confirm(confirmMsg)) return;
    setSending(true);
    setSendResult(null);
    setError(null);
    try {
      const res = await fetch("/api/campaign/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "incompleteOnly"    ? { mode: "incompleteOnly" }
          : mode === "profileCompletion" ? { mode: "profileCompletion" }
          : mode === "resendAll"       ? { mode: "resendAll" }
          : mode === "resend"          ? { resend: true }
          : {}
        ),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Send failed");
      else { setSendResult({ ...data, mode }); await fetchStats(); }
    } catch (err) {
      setError(String(err));
    } finally {
      setSending(false);
    }
  }

  const activatedContractors = stats?.contractors.filter((c) => c.isActivated) ?? [];
  const incompleteCount = activatedContractors.filter((c) => !c.profileComplete || !c.docsUploaded).length;
  const notYetReminded = activatedContractors.filter((c) => !c.profileCompletionSentAt).length;

  const openedCount = (stats?.contractors ?? []).filter((c) => c.inviteOpenedAt).length;

  const filteredContractors = (stats?.contractors ?? []).filter((c) => {
    if (filter === "opened") return !!c.inviteOpenedAt;
    if (filter === "incomplete") return c.isActivated && (!c.profileComplete || !c.docsUploaded);
    if (filter === "complete") return c.isActivated && c.profileComplete && c.docsUploaded;
    if (filter === "notSignedUp") return !c.isActivated;
    return true;
  }).sort((a, b) => {
    // When viewing opened: sort by open date descending
    if (filter === "opened") return new Date(b.inviteOpenedAt!).getTime() - new Date(a.inviteOpenedAt!).getTime();
    return 0;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaign — Incomplete Contractors</h1>
          <p className="mt-1 text-sm text-gray-500">Chase all contractors who still have incomplete profiles or missing documents</p>
        </div>
        <button onClick={fetchStats} disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Total" value={stats.total} icon={Users} color="bg-gray-500" />
          <StatCard label="Signed Up" value={stats.activated} icon={UserCheck} color="bg-blue-500" />
          <StatCard label="Emails Opened" value={stats.opened} icon={MailOpen} color="bg-amber-500" />
          <StatCard label="Profile Complete" value={stats.profileCompleteCount} icon={CheckCircle} color="bg-green-500" />
          <StatCard label="Docs Uploaded" value={stats.hasDocuments} icon={FileCheck} color="bg-emerald-500" />
          <StatCard label="Incomplete" value={incompleteCount} icon={XCircle} color="bg-red-500" />
        </div>
      )}

      {/* Result / Error banners */}
      {sendResult && (
        <div className={`rounded-xl border p-4 ${sendResult.failed > 0 ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"}`}>
          <p className={`font-medium ${sendResult.failed > 0 ? "text-amber-800" : "text-green-800"}`}>
            {sendResult.mode === "incompleteOnly" ? "Incomplete contractor emails"
              : sendResult.mode === "profileCompletion" ? "Profile completion emails"
              : "Campaign emails"} sent: {sendResult.sent} sent, {sendResult.failed} failed
          </p>
          {sendResult.errors.length > 0 && (
            <ul className="mt-2 space-y-1">
              {sendResult.errors.map((e, i) => <li key={i} className="text-sm text-amber-700">{e}</li>)}
            </ul>
          )}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* ── NEW CAMPAIGN: Incomplete Contractors ── */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Send panel — FIRST so it's always visible */}
        <div className="rounded-xl border-2 border-red-200 bg-white p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-2">Send to All Incomplete Contractors</h2>
            <p className="text-sm text-gray-500 mb-4 leading-relaxed">
              Sends a personalised reminder to every activated contractor who still has an incomplete profile or missing documents — <strong>{incompleteCount} people</strong>. Anyone already 100% complete is automatically skipped.
            </p>

            <div className="rounded-lg bg-red-50 border border-red-200 p-4 mb-4">
              <div className="flex gap-2">
                <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Targeting incomplete contractors only</p>
                  <p className="text-xs text-red-700 mt-1">
                    <strong>{incompleteCount}</strong> incomplete · <strong>{stats?.profileCompleteCount ?? "—"}</strong> fully complete (skipped) · <strong>{stats ? stats.total - stats.activated : "—"}</strong> not yet signed up
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600"><span>Will receive this email:</span><span className="font-semibold text-red-700">{incompleteCount}</span></div>
              <div className="flex justify-between text-gray-600"><span>Skipped (already complete):</span><span className="font-semibold text-green-700">{stats?.profileCompleteCount ?? "—"}</span></div>
              <div className="flex justify-between text-gray-600"><span>Est. send time:</span><span className="font-semibold text-gray-900">~{Math.ceil((incompleteCount * 0.6) / 60)} mins</span></div>
            </div>
          </div>

          <button
            onClick={() => handleSend("incompleteOnly", `Send "incomplete profile" emails to all ${incompleteCount} contractors who haven't finished their profile?\n\nEach email is personalised with exactly what they still need to complete.\n\nContractors who are already 100% complete will be skipped.\n\nProceed?`)}
            disabled={sending || incompleteCount === 0}
            className="mt-6 flex items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? <><RefreshCw className="h-4 w-4 animate-spin" />Sending...</> : <><Send className="h-4 w-4" />Send to All Incomplete ({incompleteCount})</>}
          </button>
          {incompleteCount === 0 && !sending && (
            <p className="text-center text-xs text-gray-400 mt-2">All activated contractors have complete profiles.</p>
          )}
        </div>

        {/* Email preview — second column */}
        <div className="rounded-xl border-2 border-red-200 bg-white p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            Email Preview
          </h2>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex gap-2"><span className="font-medium w-16 shrink-0">From:</span><span>PRL Site Solutions &lt;infotech@prlsitesolutions.co.uk&gt;</span></div>
            <div className="flex gap-2"><span className="font-medium w-16 shrink-0">Subject:</span><span className="font-semibold text-red-700">Action Required: Your PRISM profile is incomplete</span></div>
            <hr />
            <div className="rounded-lg bg-[#1F4E79] p-4 text-center">
              <p className="text-white font-bold text-lg tracking-widest">PRISM</p>
              <p className="text-blue-300 text-xs mt-1">PRL Site Solutions — Contractor Portal</p>
            </div>
            <div className="rounded-lg bg-gray-50 border p-4 space-y-2">
              <p className="font-medium text-gray-800">Hi [First Name],</p>
              <p className="text-xs text-gray-600 leading-relaxed">We can see your PRISM profile still has some outstanding items that need completing before you can be placed on site.</p>
              <div className="rounded bg-red-50 border border-red-300 p-2 text-center">
                <p className="text-xs font-bold text-red-800">⚠ Action Required — Please complete as soon as possible</p>
              </div>
              <div className="rounded bg-amber-50 border border-amber-200 p-3">
                <p className="text-xs font-bold text-amber-800 mb-1">Each person receives their own personalised list, e.g.:</p>
                <ul className="text-xs text-gray-700 space-y-0.5 list-none">
                  <li>☐ Phone number</li>
                  <li>☐ Home address &amp; postcode</li>
                  <li>☐ Date of birth</li>
                  <li>☐ Emergency contact details</li>
                  <li>☐ NI number</li>
                  <li>☐ Upload compliance documents (CSCS, Right to Work, DBS etc.)</li>
                </ul>
              </div>
              <div className="text-center py-2">
                <span className="inline-block bg-blue-600 text-white text-xs font-semibold px-6 py-2 rounded-lg">Complete My Profile Now</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── ARCHIVED CAMPAIGNS ── */}
      <details className="rounded-xl border border-gray-200 bg-white">
        <summary className="px-6 py-4 cursor-pointer text-sm font-medium text-gray-500 hover:text-gray-700 list-none flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Archived campaigns (April 2026 launch)
          <span className="ml-auto text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">archived</span>
        </summary>
        <div className="px-6 pb-6 border-t border-gray-100 pt-4 space-y-4">
          <p className="text-xs text-gray-400">These campaigns targeted all contractors during the April 2026 launch period. They are archived here for reference — use the new campaign above going forward.</p>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Profile completion (first-time sends) */}
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-sm font-semibold text-gray-700 mb-1">Profile Completion (first send only)</p>
              <p className="text-xs text-gray-500 mb-3">Sends to activated contractors who have never been chased ({notYetReminded} remaining).</p>
              <button
                onClick={() => handleSend("profileCompletion", `Send profile completion emails to ${notYetReminded} contractors who haven't been chased yet?`)}
                disabled={sending || notYetReminded === 0}
                className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition-colors"
              >
                <Send className="h-3 w-3" /> Send ({notYetReminded})
              </button>
            </div>

            {/* Resend to ALL activated */}
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-sm font-semibold text-gray-700 mb-1">Resend to ALL Activated</p>
              <p className="text-xs text-gray-500 mb-3">Sends to all {stats?.activated ?? 0} activated contractors, including those already chased. Deadline reminder use only.</p>
              <button
                onClick={() => handleSend("resendAll", `⚠️ RESEND to ALL ${stats?.activated ?? 0} activated contractors?\n\nThis includes people already sent a reminder. Use only for deadline chasing.\n\nProceed?`)}
                disabled={sending}
                className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
              >
                <Send className="h-3 w-3" /> Resend All ({stats?.activated ?? 0})
              </button>
            </div>
          </div>
        </div>
      </details>

      {/* Contractor table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Contractor Profile Status</h2>
            <p className="text-xs text-gray-500 mt-0.5">{stats?.total ?? 0} contractors total</p>
          </div>
          {/* Filter tabs */}
          <div className="flex flex-wrap gap-1">
            {(["all", "opened", "incomplete", "complete", "notSignedUp"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filter === f ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {f === "all" ? `All (${stats?.total ?? 0})`
                  : f === "opened" ? `Opened email (${openedCount})`
                  : f === "incomplete" ? "Incomplete"
                  : f === "complete" ? "Complete"
                  : "Not signed up"}
              </button>
            ))}
          </div>
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email Opened</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Missing Fields</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Docs</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredContractors.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.firstName} {c.lastName}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate">{maskEmail(c.email)}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {c.inviteOpenedAt
                        ? <span className="inline-flex items-center gap-1 text-amber-700 font-medium"><MailOpen className="h-3 w-3" />{fmt(c.inviteOpenedAt)}</span>
                        : <span className="text-gray-400">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px]">
                      {!c.isActivated ? <span className="text-gray-400">—</span> : c.missingFields.length === 0
                        ? <span className="text-green-600 font-medium">All filled in ✓</span>
                        : <span className="text-red-600">{c.missingFields.slice(0, 2).join(", ")}{c.missingFields.length > 2 ? ` +${c.missingFields.length - 2} more` : ""}</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {!c.isActivated ? <span className="text-gray-400">—</span>
                        : c.docsUploaded
                          ? <span className="text-green-600 font-medium">Uploaded ✓</span>
                          : <span className="text-red-500">None uploaded</span>
                      }
                    </td>
                    <td className="px-4 py-3"><ProfileBadge c={c} /></td>
                  </tr>
                ))}
                {filteredContractors.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">No contractors match this filter.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Launch stats summary */}
      <details className="rounded-xl border border-gray-200 bg-white">
        <summary className="px-6 py-4 cursor-pointer text-sm font-medium text-gray-500 hover:text-gray-700 list-none flex items-center gap-2">
          <Mail className="h-4 w-4" />
          April 2026 launch stats
          <span className="ml-auto text-xs text-gray-400">click to expand</span>
        </summary>
        <div className="px-6 pb-5 border-t border-gray-100 pt-4">
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div className="text-center"><p className="text-xl font-bold text-gray-700">{stats.sent}</p><p className="text-gray-500">Invited</p></div>
              <div className="text-center"><p className="text-xl font-bold text-amber-600">{stats.opened}</p><p className="text-gray-500">Opened email</p></div>
              <div className="text-center"><p className="text-xl font-bold text-green-600">{stats.activated}</p><p className="text-gray-500">Signed up</p></div>
              <div className="text-center"><p className="text-xl font-bold text-gray-400">{stats.pending}</p><p className="text-gray-500">Never opened</p></div>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-4">Launch emails sent April 2026. Corrective email (correct www link) sent to all 288 recipients.</p>
        </div>
      </details>

    </div>
  );
}
