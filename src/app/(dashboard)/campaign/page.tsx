"use client";
// Campaign page v3 — Profile Completion Campaign
import { useState, useEffect, useCallback } from "react";
import {
  Send, Users, Mail, MailOpen, CheckCircle, Clock,
  AlertTriangle, RefreshCw, UserCheck, FileCheck, XCircle, Archive, ShieldAlert,
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
  noComplianceCount: number;
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
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; alreadyExisted: number; noEmail: string[] } | null>(null);

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

  async function handleImport(batch: "april" | "may" = "april") {
    const label = batch === "may" ? "9 (May 2026)" : "91 (April 2026)";
    if (!confirm(`Import ${label} contractors?\n\nAlready-existing records are skipped automatically.\n\nProceed?`)) return;
    setImporting(true);
    setImportResult(null);
    try {
      const res = await fetch("/api/import-contractors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Import failed");
      else { setImportResult(data); await fetchStats(); }
    } catch (err) {
      setError(String(err));
    } finally {
      setImporting(false);
    }
  }

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
          mode === "noCompliance"      ? { mode: "noCompliance" }
          : mode === "incompleteOnly"  ? { mode: "incompleteOnly" }
          : mode === "profileCompletion" ? { mode: "profileCompletion" }
          : mode === "resendAll"       ? { mode: "resendAll" }
          : mode === "resend"          ? { resend: true }
          : mode === "newUsers"        ? { mode: "newUsers" }
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
            {sendResult.mode === "noCompliance" ? "No-compliance chase emails"
              : sendResult.mode === "incompleteOnly" ? "Incomplete contractor emails"
              : sendResult.mode === "profileCompletion" ? "Profile completion emails"
              : sendResult.mode === "newUsers" ? "New user welcome emails"
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

      {/* ── IMPORT NEW BATCH ── */}
      {importResult ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-800">Import complete — {importResult.created} new contractors added</p>
            <p className="text-xs text-green-700 mt-0.5">{importResult.alreadyExisted} already existed (skipped) · {importResult.noEmail.length} still need email addresses manually</p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-gray-700">Import contractor batch</p>
            <p className="text-xs text-gray-500 mt-0.5">Safe to run multiple times — duplicates are skipped automatically.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleImport("april")}
              disabled={importing}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors"
            >
              {importing ? <><RefreshCw className="h-4 w-4 animate-spin" />Importing...</> : <><Users className="h-4 w-4" />April (91)</>}
            </button>
            <button
              onClick={() => handleImport("may")}
              disabled={importing}
              className="flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition-colors"
            >
              {importing ? <><RefreshCw className="h-4 w-4 animate-spin" />Importing...</> : <><Users className="h-4 w-4" />May (9)</>}
            </button>
          </div>
        </div>
      )}

      {/* ── NEW USERS CAMPAIGN ── */}
      {(stats?.pending ?? 0) > 0 && (
        <div className="rounded-xl border-2 border-blue-400 bg-blue-50 p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                  <Mail className="h-3.5 w-3.5" /> New Batch
                </span>
                <span className="text-xs text-blue-600 font-medium">{stats?.pending} contractors waiting</span>
              </div>
              <h2 className="text-lg font-bold text-blue-900 mb-1">Send Welcome Email to New Users</h2>
              <p className="text-sm text-blue-700 leading-relaxed max-w-xl">
                There {stats?.pending === 1 ? "is" : "are"} <strong>{stats?.pending}</strong> contractor{stats?.pending === 1 ? "" : "s"} who have never been sent an invite. This sends them the PRISM welcome email with a link to set up their account.
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-4xl font-black text-blue-700 leading-none">{stats?.pending}</p>
              <p className="text-xs text-blue-500 mt-0.5">not yet invited</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
            <div className="rounded-lg bg-white border border-blue-200 py-2.5 px-3">
              <p className="font-bold text-blue-800">{stats?.pending}</p>
              <p className="text-blue-500 text-xs">Will receive</p>
            </div>
            <div className="rounded-lg bg-white border border-blue-200 py-2.5 px-3">
              <p className="font-bold text-gray-700">{stats?.sent}</p>
              <p className="text-gray-400 text-xs">Already sent</p>
            </div>
            <div className="rounded-lg bg-white border border-blue-200 py-2.5 px-3">
              <p className="font-bold text-gray-700">~{Math.ceil(((stats?.pending ?? 0) * 0.6) / 60)} min</p>
              <p className="text-gray-400 text-xs">Est. send time</p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <button
              onClick={() => handleSend("newUsers", `Send the PRISM welcome email to all ${stats?.pending} new contractors who haven't been invited yet?\n\nEach email includes a "Set Up My Account" link.\n\nAlready-invited contractors are automatically skipped.\n\nProceed?`)}
              disabled={sending}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {sending ? <><RefreshCw className="h-4 w-4 animate-spin" />Sending...</> : <><Send className="h-4 w-4" />Send Welcome to {stats?.pending} New Users</>}
            </button>
            <p className="text-xs text-blue-500">Sends: "Welcome to the PRL Site Solutions Contractor Portal"</p>
          </div>
        </div>
      )}

      {/* ── ACTIVE CAMPAIGN 1: No Compliance Records ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border-2 border-orange-300 bg-white p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="h-5 w-5 text-orange-500" />
              <h2 className="text-base font-semibold text-gray-900">No Compliance Records</h2>
              <span className="ml-auto inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-700">
                {stats?.noComplianceCount ?? "—"} contractors
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-4 leading-relaxed">
              Sends to every contractor who has <strong>zero compliance documents on file</strong>. Email explains exactly what they need to upload (CSCS, Right to Work, Insurance etc.) and why they cannot be placed on site.
            </p>
            <div className="rounded-lg bg-orange-50 border border-orange-200 p-4 mb-4 space-y-1 text-xs text-orange-800">
              <p><strong>Will receive:</strong> {stats?.noComplianceCount ?? "—"} contractors with no documents</p>
              <p><strong>Skipped:</strong> Anyone with at least one document on file</p>
              <p><strong>Est. send time:</strong> ~{Math.ceil(((stats?.noComplianceCount ?? 0) * 0.6) / 60)} mins</p>
            </div>
          </div>
          <button
            onClick={() => handleSend("noCompliance", `Send "no compliance records" email to ${stats?.noComplianceCount ?? 0} contractors?\n\nEach email explains what documents they need to upload and why.\n\nContractors who already have documents on file will be skipped.\n\nProceed?`)}
            disabled={sending || (stats?.noComplianceCount ?? 0) === 0}
            className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? <><RefreshCw className="h-4 w-4 animate-spin" />Sending...</> : <><Send className="h-4 w-4" />Chase {stats?.noComplianceCount ?? 0} Non-Compliant</>}
          </button>
        </div>

        {/* Email preview */}
        <div className="rounded-xl border-2 border-orange-300 bg-white p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-orange-500" />
            Email Preview — No Compliance
          </h2>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex gap-2"><span className="font-medium w-16 shrink-0">From:</span><span>PRL Site Solutions &lt;infotech@prlsitesolutions.co.uk&gt;</span></div>
            <div className="flex gap-2"><span className="font-medium w-16 shrink-0">Subject:</span><span className="font-semibold text-orange-700">Action Required: No compliance documents on file — PRISM</span></div>
            <hr />
            <div className="rounded-lg bg-[#1F4E79] p-3 text-center">
              <p className="text-white font-bold text-base tracking-widest">PRISM</p>
              <p className="text-blue-300 text-xs">PRL Site Solutions — Contractor Portal</p>
            </div>
            <div className="rounded-lg bg-gray-50 border p-3 space-y-2">
              <p className="font-medium text-gray-800 text-xs">Hi [First Name],</p>
              <p className="text-xs text-gray-600">We've checked your file and we currently have <strong>no compliance documents on record</strong> for you.</p>
              <div className="rounded bg-red-50 border border-red-300 p-2 text-center">
                <p className="text-xs font-bold text-red-800">⚠ No Compliance Documents on File</p>
              </div>
              <div className="rounded bg-amber-50 border border-amber-200 p-2">
                <p className="text-xs font-bold text-amber-800 mb-1">Required documents:</p>
                <ul className="text-xs text-gray-700 space-y-0.5 list-none">
                  <li>☐ CSCS Card</li>
                  <li>☐ Right to Work document</li>
                  <li>☐ Public Liability Insurance</li>
                  <li>☐ DBS certificate (if required)</li>
                  <li>☐ Trade qualifications / certificates</li>
                </ul>
              </div>
              <div className="text-center py-1">
                <span className="inline-block bg-red-600 text-white text-xs font-semibold px-4 py-1.5 rounded-lg">Upload My Documents Now</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── ACTIVE CAMPAIGN 2: Incomplete Profile ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border-2 border-red-200 bg-white p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <h2 className="text-base font-semibold text-gray-900">Incomplete Profile Reminder</h2>
              <span className="ml-auto inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                {incompleteCount} contractors
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-4 leading-relaxed">
              Sends to every activated contractor with a missing profile field or no documents. Each email is personalised with exactly what they still need to fill in.
            </p>
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 mb-4 space-y-1 text-xs text-red-800">
              <p><strong>Will receive:</strong> {incompleteCount} activated contractors with gaps</p>
              <p><strong>Skipped:</strong> {stats?.profileCompleteCount ?? "—"} already 100% complete</p>
              <p><strong>Est. send time:</strong> ~{Math.ceil((incompleteCount * 0.6) / 60)} mins</p>
            </div>
          </div>
          <button
            onClick={() => handleSend("incompleteOnly", `Send "incomplete profile" emails to all ${incompleteCount} contractors who haven't finished their profile?\n\nEach email is personalised with exactly what they still need to complete.\n\nContractors who are already 100% complete will be skipped.\n\nProceed?`)}
            disabled={sending || incompleteCount === 0}
            className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? <><RefreshCw className="h-4 w-4 animate-spin" />Sending...</> : <><Send className="h-4 w-4" />Send to All Incomplete ({incompleteCount})</>}
          </button>
        </div>

        <div className="rounded-xl border-2 border-red-200 bg-white p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            Email Preview — Incomplete Profile
          </h2>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex gap-2"><span className="font-medium w-16 shrink-0">Subject:</span><span className="font-semibold text-red-700">Action Required: Your PRISM profile is incomplete</span></div>
            <div className="rounded-lg bg-gray-50 border p-3 space-y-2">
              <p className="font-medium text-gray-800 text-xs">Hi [First Name],</p>
              <p className="text-xs text-gray-600">We can see your PRISM profile still has some outstanding items that need completing before you can be placed on site.</p>
              <div className="rounded bg-amber-50 border border-amber-200 p-2">
                <p className="text-xs font-bold text-amber-800 mb-1">Personalised list per contractor, e.g.:</p>
                <ul className="text-xs text-gray-700 space-y-0.5 list-none">
                  <li>☐ Phone number</li><li>☐ Home address &amp; postcode</li>
                  <li>☐ Date of birth</li><li>☐ Emergency contact details</li>
                  <li>☐ NI number</li><li>☐ Upload compliance documents</li>
                </ul>
              </div>
              <div className="text-center py-1">
                <span className="inline-block bg-blue-600 text-white text-xs font-semibold px-4 py-1.5 rounded-lg">Complete My Profile Now</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── ARCHIVED CAMPAIGNS ── */}
      <details className="rounded-xl border border-gray-200 bg-white">
        <summary className="px-6 py-4 cursor-pointer text-sm font-medium text-gray-500 hover:text-gray-700 list-none flex items-center gap-2">
          <Archive className="h-4 w-4" />
          Archived campaigns — April &amp; May 2026
          <span className="ml-auto text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">archived</span>
        </summary>
        <div className="px-6 pb-6 border-t border-gray-100 pt-4 space-y-6">
          <p className="text-xs text-gray-400">Historical campaigns for reference only. Use the active campaigns above for new sends.</p>

          {/* May 2026 */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">May 2026</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-gray-200 p-4">
                <p className="text-sm font-semibold text-gray-700 mb-1">Profile Completion — First Send</p>
                <p className="text-xs text-gray-500 mb-3">Activated contractors never previously chased ({notYetReminded} remaining).</p>
                <button
                  onClick={() => handleSend("profileCompletion", `Send profile completion emails to ${notYetReminded} contractors who haven't been chased yet?`)}
                  disabled={sending || notYetReminded === 0}
                  className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition-colors"
                >
                  <Send className="h-3 w-3" /> Send ({notYetReminded})
                </button>
              </div>
              <div className="rounded-lg border border-gray-200 p-4">
                <p className="text-sm font-semibold text-gray-700 mb-1">Resend to ALL Activated</p>
                <p className="text-xs text-gray-500 mb-3">All {stats?.activated ?? 0} activated contractors including those already chased. Deadline use only.</p>
                <button
                  onClick={() => handleSend("resendAll", `⚠️ RESEND to ALL ${stats?.activated ?? 0} activated contractors?\n\nIncludes people already sent a reminder.\n\nProceed?`)}
                  disabled={sending}
                  className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
                >
                  <Send className="h-3 w-3" /> Resend All ({stats?.activated ?? 0})
                </button>
              </div>
            </div>
          </div>

          {/* April 2026 */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">April 2026 — Launch</p>
            <p className="text-xs text-gray-400">Initial PRISM launch emails and corrective resend (wrong link fix). {stats?.sent ?? 0} contractors invited, {stats?.opened ?? 0} opened, {stats?.activated ?? 0} signed up.</p>
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
