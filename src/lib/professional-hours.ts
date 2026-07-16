/**
 * Professional hours worked between a start and finish clock time.
 *
 * Raw duration (finish minus start), no break deduction — matches the number
 * staff would enter by hand today. Overnight shifts (finish earlier than start,
 * e.g. 22:00 → 06:00) roll over to the next day.
 *
 * @param start  "HH:MM" (24h)
 * @param finish "HH:MM" (24h)
 * @returns hours to 2dp, or null if either value is missing/invalid
 */
export function calculateProfessionalHours(
  start?: string | null,
  finish?: string | null
): number | null {
  if (!start || !finish) return null;
  const s = parseHHMM(start);
  const f = parseHHMM(finish);
  if (s === null || f === null) return null;
  let minutes = f - s;
  if (minutes < 0) minutes += 24 * 60; // overnight shift
  return Math.round((minutes / 60) * 100) / 100;
}

function parseHHMM(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const mins = Number(match[2]);
  if (hours < 0 || hours > 23 || mins < 0 || mins > 59) return null;
  return hours * 60 + mins;
}
