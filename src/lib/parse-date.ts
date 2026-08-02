/**
 * Parses a date submitted by a public form into a Date, or null.
 *
 * Handles ISO (from <input type="date">) and UK DD/MM/YYYY, which must be done
 * explicitly: `new Date("31/12/2026")` is Invalid Date, and worse,
 * `new Date("03/04/2026")` silently parses as 4 March under US convention when
 * the applicant meant 3 April.
 *
 * Returns null rather than throwing — a bad date must never lose an entire
 * application, and the raw value is preserved in the notes blob regardless.
 *
 * Lives here rather than beside its caller because an App Router route file may
 * only export HTTP handlers, which left this untestable where it was.
 */
export function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const raw = value.trim();

  const uk = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (uk) {
    const [, d, m, y] = uk;
    const dt = new Date(Date.UTC(+y, +m - 1, +d));
    // Rejects impossible dates that would otherwise roll over (e.g. 31/02).
    if (dt.getUTCDate() !== +d || dt.getUTCMonth() !== +m - 1) return null;
    return dt;
  }

  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const [, y, m, d] = iso;
    const dt = new Date(Date.UTC(+y, +m - 1, +d));
    if (dt.getUTCDate() !== +d || dt.getUTCMonth() !== +m - 1) return null;
    return dt;
  }

  // An incomplete numeric date — "03/04" with no year, or a bare "2026". Left to
  // the fallback below, `new Date("03/04")` yields 4 March 2001: the US reading,
  // with a century invented, and no error. A half-typed date must be rejected,
  // not guessed at, because the result is stored as a DOB or a passport expiry.
  if (/^\d{1,4}([/\-.]\d{1,4})?$/.test(raw)) return null;

  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}
