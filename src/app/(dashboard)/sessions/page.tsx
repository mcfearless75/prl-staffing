export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import {
  canViewSessions,
  describeDevice,
  formatDuration,
  sessionDurationMs,
  sessionStatus,
  startOfUkDay,
  reconstructSessions,
  collapseDuplicateSessions,
  TRACKING_STARTED_AT,
  type SessionStatus,
} from "@/lib/session-monitor";

// Session monitor — infotech@ only. Anyone else gets a 404, so the page's
// existence isn't advertised. How the data is collected: src/lib/session-monitor.ts

const PERIODS = [
  { value: "1", label: "Today" },
  { value: "y", label: "Yesterday" },
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
];
const TYPES = [
  { value: "", label: "Everyone" },
  { value: "staff", label: "Staff" },
  { value: "contractor", label: "Contractors" },
];

function fmt(date: Date, withDate = true) {
  return new Intl.DateTimeFormat("en-GB", {
    ...(withDate ? { day: "numeric", month: "short" } : {}),
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  }).format(date);
}

function ago(date: Date, now: Date) {
  const mins = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${formatDuration(now.getTime() - date.getTime())} ago`;
}

const STATUS_STYLE: Record<SessionStatus, string> = {
  online: "bg-emerald-50 text-emerald-700 border-emerald-200",
  away: "bg-amber-50 text-amber-700 border-amber-200",
  ended: "bg-gray-50 text-gray-500 border-gray-200",
};

const METHOD_LABEL: Record<string, string> = {
  password: "Password",
  microsoft: "Microsoft",
  resumed: "Came back",
  existing: "Already signed in",
  estimated: "From Activity Log",
};

const PERIOD_PHRASE: Record<string, string> = {
  "1": "today",
  y: "yesterday",
  "7": "in the last 7 days",
  "30": "in the last 30 days",
};

function StatusPill({ status }: { status: SessionStatus }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[status]}`}>
      {status === "online" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
      {status === "online" ? "Online" : status === "away" ? "Away" : "Ended"}
    </span>
  );
}

function TypePill({ type }: { type: string }) {
  return (
    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
      {type === "contractor" ? "Contractor" : "Staff"}
    </span>
  );
}

export default async function SessionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ days?: string; type?: string }>;
}) {
  const session = await auth();
  if (!canViewSessions(session?.user?.email)) notFound();

  const params = searchParams ? await searchParams : {};
  const days = PERIODS.some((p) => p.value === params.days) ? params.days! : "1";
  const type = params.type === "staff" || params.type === "contractor" ? params.type : "";

  const now = new Date();
  // "Today" and "Yesterday" are UK calendar days, not rolling 24 hours
  const todayStart = startOfUkDay(now);
  const since =
    days === "1" ? todayStart
    : days === "y" ? startOfUkDay(new Date(todayStart.getTime() - 1))
    : new Date(now.getTime() - Number(days) * 86_400_000);
  const until = days === "y" ? todayStart : now;

  const rows = await prisma.userSession.findMany({
    where: { lastSeenAt: { gte: since }, startedAt: { lt: until }, ...(type ? { userType: type } : {}) },
    orderBy: { startedAt: "desc" },
    take: 1000,
  });

  // Before the heartbeat went live there is no session data, so rebuild
  // approximate sessions from the Activity Log for that part of the period.
  const logUntil = until < TRACKING_STARTED_AT ? until : TRACKING_STARTED_AT;
  const logEvents = since < logUntil
    ? await prisma.activityLog.findMany({
        where: { createdAt: { gte: since, lt: logUntil }, userEmail: { not: null } },
        select: { userEmail: true, userName: true, action: true, createdAt: true, ipAddress: true },
        take: 20000,
      })
    : [];
  const estimated = reconstructSessions(
    logEvents.map((e) => ({ email: e.userEmail!, name: e.userName, action: e.action, at: e.createdAt, ipAddress: e.ipAddress })),
  );
  const contractorEmails = new Set(
    estimated.length
      ? (await prisma.contractorLogin.findMany({
          where: { email: { in: [...new Set(estimated.map((e) => e.email))] } },
          select: { email: true },
        })).map((c) => c.email.toLowerCase())
      : [],
  );
  const estimatedRows = estimated
    .map((e, i) => ({
      id: `est-${i}`,
      email: e.email,
      name: e.name,
      userType: contractorEmails.has(e.email) ? "contractor" : "staff",
      method: "estimated",
      ipAddress: e.ipAddress,
      userAgent: null as string | null,
      startedAt: e.startedAt,
      lastSeenAt: e.lastSeenAt,
      endedAt: null as Date | null,
      actions: e.actions,
    }))
    .filter((e) => !type || e.userType === type);

  const sessions = [...collapseDuplicateSessions(rows).map((r) => ({ ...r, actions: 0 })), ...estimatedRows]
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
    .map((r) => ({
      ...r,
      status: r.method === "estimated" ? ("ended" as SessionStatus) : sessionStatus(r, now),
      durationMs: sessionDurationMs(r),
    }));

  const onlineNow = sessions.filter((s) => s.status !== "ended");

  const people = new Map<
    string,
    { email: string; name: string | null; userType: string; count: number; totalMs: number; lastSeen: Date; status: SessionStatus }
  >();
  for (const s of sessions) {
    const p = people.get(s.email);
    if (!p) {
      people.set(s.email, {
        email: s.email, name: s.name, userType: s.userType, count: 1,
        totalMs: s.durationMs, lastSeen: s.lastSeenAt, status: s.status,
      });
    } else {
      p.count += 1;
      p.totalMs += s.durationMs;
      if (s.lastSeenAt > p.lastSeen) p.lastSeen = s.lastSeenAt;
      if (s.status === "online" || (s.status === "away" && p.status === "ended")) p.status = s.status;
    }
  }
  const peopleList = [...people.values()].sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());
  const totalMs = sessions.reduce((sum, s) => sum + s.durationMs, 0);
  const periodLabel = PERIODS.find((p) => p.value === days)!.label.toLowerCase();
  const periodPhrase = PERIOD_PHRASE[days];

  const href = (d: string, t: string) => {
    const sp = new URLSearchParams();
    if (d !== "1") sp.set("days", d);
    if (t) sp.set("type", t);
    const q = sp.toString();
    return q ? `/sessions?${q}` : "/sessions";
  };

  const tiles = [
    { label: "Online now", value: String(onlineNow.filter((s) => s.status === "online").length) },
    { label: `People ${periodPhrase}`, value: String(peopleList.length) },
    { label: "Sessions", value: String(sessions.length) },
    { label: "Total time in PRISM", value: formatDuration(totalMs) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sessions"
        description="Who is using PRISM, when, and for how long. Only visible to infotech@."
      />

      <div className="flex flex-wrap items-center gap-2">
        {PERIODS.map((p) => (
          <a key={p.value} href={href(p.value, type)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${days === p.value ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {p.label}
          </a>
        ))}
        <span className="mx-1 h-4 w-px bg-gray-300" />
        {TYPES.map((t) => (
          <a key={t.value} href={href(days, t.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${type === t.value ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {t.label}
          </a>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
            <p className="text-xs text-gray-500">{t.label}</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900 tabular-nums">{t.value}</p>
          </div>
        ))}
      </div>

      {/* Online now */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-900">On PRISM now</h2>
        {onlineNow.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-6 py-8 text-center text-sm text-gray-500">
            Nobody has PRISM open right now.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Person</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Since</th>
                  <th className="px-4 py-2 font-medium">Duration</th>
                  <th className="px-4 py-2 font-medium">Last active</th>
                  <th className="px-4 py-2 font-medium">Device</th>
                  <th className="px-4 py-2 font-medium">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {onlineNow.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2">
                      <div className="font-medium text-gray-900">{s.name || s.email}</div>
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400"><TypePill type={s.userType} />{s.email}</div>
                    </td>
                    <td className="px-4 py-2"><StatusPill status={s.status} /></td>
                    <td className="px-4 py-2 whitespace-nowrap text-gray-700">{fmt(s.startedAt, false)}</td>
                    <td className="px-4 py-2 whitespace-nowrap font-medium text-gray-900 tabular-nums">{formatDuration(s.durationMs)}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-gray-500">{ago(s.lastSeenAt, now)}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-gray-500">{describeDevice(s.userAgent)}</td>
                    <td className="px-4 py-2 font-mono text-[11px] text-gray-500">{s.ipAddress || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Per person */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-900">By person — {periodLabel}</h2>
        {peopleList.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-6 py-8 text-center text-sm text-gray-500">
            No sessions recorded {periodPhrase}.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Person</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Sessions</th>
                  <th className="px-4 py-2 font-medium">Total time</th>
                  <th className="px-4 py-2 font-medium">Last seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {peopleList.map((p) => (
                  <tr key={p.email}>
                    <td className="px-4 py-2">
                      <div className="font-medium text-gray-900">{p.name || p.email}</div>
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400"><TypePill type={p.userType} />{p.email}</div>
                    </td>
                    <td className="px-4 py-2"><StatusPill status={p.status} /></td>
                    <td className="px-4 py-2 tabular-nums text-gray-700">{p.count}</td>
                    <td className="px-4 py-2 whitespace-nowrap font-medium text-gray-900 tabular-nums">{formatDuration(p.totalMs)}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-gray-500">{fmt(p.lastSeen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Full log */}
      {sessions.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-900">Every session — {periodLabel}</h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Person</th>
                  <th className="px-4 py-2 font-medium">Started</th>
                  <th className="px-4 py-2 font-medium">Ended</th>
                  <th className="px-4 py-2 font-medium">Duration</th>
                  <th className="px-4 py-2 font-medium">How</th>
                  <th className="px-4 py-2 font-medium">Device</th>
                  <th className="px-4 py-2 font-medium">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2">
                      <div className="font-medium text-gray-900">{s.name || s.email}</div>
                      <div className="text-[11px] text-gray-400">{s.email}</div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-gray-700">{fmt(s.startedAt)}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-gray-700">
                      {s.status === "ended"
                        ? <>{fmt(s.endedAt ?? s.lastSeenAt, false)}<span className="ml-1 text-[11px] text-gray-400">{s.method === "estimated" ? "last action" : s.endedAt ? "signed out" : "closed"}</span></>
                        : <StatusPill status={s.status} />}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap font-medium text-gray-900 tabular-nums">{formatDuration(s.durationMs)}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-gray-500">{METHOD_LABEL[s.method] ?? s.method}
                      {s.method === "estimated" && <span className="block text-[11px] text-gray-400">approx. · {s.actions} action{s.actions === 1 ? "" : "s"}</span>}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-gray-500">{describeDevice(s.userAgent)}</td>
                    <td className="px-4 py-2 font-mono text-[11px] text-gray-500">{s.ipAddress || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length === 1000 && (
            <p className="text-xs text-gray-400">Showing the latest 1,000 sessions — narrow the period or filter to see the rest.</p>
          )}
        </section>
      )}

      <p className="text-xs text-gray-400">
        A session is a continuous stretch with PRISM open. &ldquo;Online&rdquo; means active in the last 2½ minutes;
        &ldquo;Away&rdquo; means the tab was hidden or closed less than 30 minutes ago. Live tracking started 29 Sep 2026 at 18:47. Before that, sessions marked &ldquo;From Activity Log&rdquo;
        are rebuilt from logged actions (a gap over 30 minutes starts a new one), so they are approximate and
        tend to undercount, because time spent reading after someone&rsquo;s last action isn&rsquo;t logged.
      </p>
    </div>
  );
}
