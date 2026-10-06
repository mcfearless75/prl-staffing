/**
 * Calendar days in UK time (Europe/London), as exact UTC instants.
 *
 * The server runs in UTC, so "today" by server-local midnight is wrong for an
 * hour every night through British Summer Time. These helpers work in
 * `YYYY-MM-DD` day keys and convert a key to the precise UTC instants at which
 * that day starts and ends in London — BST-aware, including the 23- and
 * 25-hour changeover days.
 *
 * Pure: no imports, so it is testable without a database.
 */

const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Minutes London is ahead of UTC at `instant` (0 in GMT, 60 in BST). */
function londonOffsetMinutes(instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const wallAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  const instantToMinute = Math.floor(instant.getTime() / 60_000) * 60_000;
  return Math.round((wallAsUtc - instantToMinute) / 60_000);
}

/** The London calendar date `now` falls on, as `YYYY-MM-DD`. */
export function londonDayKey(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Returns the key if `value` is a real `YYYY-MM-DD` date, otherwise null. */
export function parseDayKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const m = DAY_KEY.exec(value.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const probe = new Date(Date.UTC(y, mo - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== mo - 1 || probe.getUTCDate() !== d) {
    return null; // e.g. 2026-02-30
  }
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/** Shift a day key by whole calendar days. */
export function addDaysToKey(key: string, days: number): string {
  const m = DAY_KEY.exec(key);
  if (!m) throw new Error(`Invalid day key: ${key}`);
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + days));
  return d.toISOString().slice(0, 10);
}

/** The UTC instant of London midnight at the start of `key`. */
function londonMidnight(key: string): Date {
  const m = DAY_KEY.exec(key);
  if (!m) throw new Error(`Invalid day key: ${key}`);
  const utcMidnight = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  // UK clocks change at 01:00 UTC, never at midnight, so the offset at the
  // candidate instant is the offset in force at London midnight.
  let candidate = utcMidnight - londonOffsetMinutes(new Date(utcMidnight)) * 60_000;
  candidate = utcMidnight - londonOffsetMinutes(new Date(candidate)) * 60_000;
  return new Date(candidate);
}

/**
 * The London calendar day `key` as a half-open UTC range: `start <= t < end`.
 * Query with `{ gte: start, lt: end }`.
 */
export function londonDayBounds(key: string): { start: Date; end: Date } {
  return { start: londonMidnight(key), end: londonMidnight(addDaysToKey(key, 1)) };
}
