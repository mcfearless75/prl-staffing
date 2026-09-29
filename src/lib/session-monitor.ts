/**
 * Session monitor — who logs in, who is on now, and for how long.
 *
 * Sessions are JWTs, so the server keeps no record of who is "logged in"; a
 * cookie can be valid for weeks after the tab was closed. What this tracks
 * instead is USE: an open PRISM tab sends a heartbeat every minute while it is
 * visible (SessionHeartbeat → /api/session/heartbeat), and each continuous run
 * of heartbeats is one UserSession row. Signing out closes the row.
 *
 * Pure — no Prisma — so the sidebar (a client component) can import
 * canViewSessions, and the rules are unit-testable.
 */

/** The only accounts that can see /sessions. Not role-based on purpose. */
export const SESSION_MONITOR_EMAILS = ["infotech@prlsitesolutions.co.uk"];

export function canViewSessions(email: string | null | undefined): boolean {
  if (!email) return false;
  return SESSION_MONITOR_EMAILS.includes(email.trim().toLowerCase());
}

/** How often an open, visible tab reports in. */
export const HEARTBEAT_INTERVAL_MS = 60_000;

/** No heartbeat for this long → no longer "online" (allows one missed beat). */
export const ONLINE_WINDOW_MS = 150_000;

/** No heartbeat for this long → the next one starts a new session row. */
export const IDLE_GAP_MS = 30 * 60_000;

export type SessionStatus = "online" | "away" | "ended";

export interface SessionTimes {
  startedAt: Date;
  lastSeenAt: Date;
  endedAt: Date | null;
}

/**
 * online — heartbeat within the last 2½ minutes
 * away   — tab hidden or closed recently, but not signed out or idle-expired
 * ended  — signed out, or silent for longer than the idle gap
 */
export function sessionStatus(s: SessionTimes, now: Date): SessionStatus {
  if (s.endedAt) return "ended";
  const silentFor = now.getTime() - s.lastSeenAt.getTime();
  if (silentFor <= ONLINE_WINDOW_MS) return "online";
  if (silentFor <= IDLE_GAP_MS) return "away";
  return "ended";
}

/** Time in use: start to sign-out, or start to last heartbeat. Never negative. */
export function sessionDurationMs(s: SessionTimes): number {
  const end = s.endedAt ?? s.lastSeenAt;
  return Math.max(0, end.getTime() - s.startedAt.getTime());
}

/** 45s → "<1m", 5m, 1h 05m, 26h 00m */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000);
  if (totalMinutes < 1) return "<1m";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

/** "Chrome on Windows", "Safari on iPhone". Order matters: Edge and Opera also say Chrome. */
export function describeDevice(userAgent: string | null | undefined): string {
  if (!userAgent) return "Unknown device";
  const ua = userAgent;

  let browser = "Browser";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/.test(ua)) browser = "Opera";
  else if (/SamsungBrowser/.test(ua)) browser = "Samsung Internet";
  else if (/Firefox\/|FxiOS/.test(ua)) browser = "Firefox";
  else if (/Chrome\/|CriOS/.test(ua)) browser = "Chrome";
  else if (/Safari\//.test(ua)) browser = "Safari";

  let os = "";
  if (/iPhone/.test(ua)) os = "iPhone";
  else if (/iPad/.test(ua)) os = "iPad";
  else if (/Android/.test(ua)) os = "Android";
  else if (/Windows/.test(ua)) os = "Windows";
  else if (/Mac OS X|Macintosh/.test(ua)) os = "Mac";
  else if (/Linux/.test(ua)) os = "Linux";

  return os ? `${browser} on ${os}` : browser;
}

/** Midnight UK time on the day `now` falls in (a DST changeover day is off by up to an hour). */
export function startOfUkDay(now: Date): Date {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const msIntoDay = ((get("hour") * 60 + get("minute")) * 60 + get("second")) * 1000 + now.getUTCMilliseconds();
  return new Date(now.getTime() - msIntoDay);
}

/** When the heartbeat went live. Before this, sessions are rebuilt from the Activity Log. */
export const TRACKING_STARTED_AT = new Date("2026-09-29T17:47:00Z");

export interface ActivityEvent {
  email: string;
  name: string | null;
  action: string;
  at: Date;
  ipAddress: string | null;
}

export interface EstimatedSession {
  email: string;
  name: string | null;
  startedAt: Date;
  lastSeenAt: Date;
  actions: number;
  signedIn: boolean; // the run began with (or contains) a successful login
  ipAddress: string | null;
}

/**
 * Approximate sessions from Activity Log rows: each person's actions, split
 * wherever they went quiet for longer than the idle gap. A lower bound — it
 * only sees moments that wrote a log row, so time spent just reading pages
 * between actions is counted, but reading after the last action is not.
 * Failed and blocked logins are not use, so they are dropped.
 */
export function reconstructSessions(events: ActivityEvent[], gapMs = IDLE_GAP_MS): EstimatedSession[] {
  const real = events
    .filter((e) => e.email && !/Failed|Blocked/.test(e.action))
    .map((e) => ({ ...e, email: e.email.trim().toLowerCase() }))
    .sort((a, b) => (a.email === b.email ? a.at.getTime() - b.at.getTime() : a.email < b.email ? -1 : 1));

  const out: EstimatedSession[] = [];
  let cur: EstimatedSession | null = null;
  for (const e of real) {
    const isLogin = /Login/.test(e.action);
    if (cur && cur.email === e.email && e.at.getTime() - cur.lastSeenAt.getTime() <= gapMs) {
      cur.lastSeenAt = e.at;
      cur.actions += 1;
      cur.signedIn ||= isLogin;
      cur.name ||= e.name;
      cur.ipAddress ||= e.ipAddress;
    } else {
      cur = { email: e.email, name: e.name, startedAt: e.at, lastSeenAt: e.at, actions: 1, signedIn: isLogin, ipAddress: e.ipAddress };
      out.push(cur);
    }
  }
  return out;
}
