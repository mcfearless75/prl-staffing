/**
 * Next sequential ticket number for a prefix, e.g. "PQ" -> "PQ-004".
 *
 * Derived from the highest existing numeric suffix, NOT count()+1: ticketNumber
 * is @unique, so with count()+1 a single deleted record makes every subsequent
 * create collide with a surviving row and 500 the public form forever.
 */
export function nextTicketNumber(
  prefix: string,
  existing: { ticketNumber: string }[]
): string {
  const max = existing.reduce((m, r) => {
    const n = parseInt(r.ticketNumber.split("-").pop() ?? "", 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}
