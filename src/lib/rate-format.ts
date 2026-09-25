/**
 * Charge rates on the subcontractor agreement are free-text inputs, so staff
 * typed "29.9", "£29.90", "29.90 ph". PRL asked for every rate to read as
 * pounds to two decimal places. Returns "" for blank or non-numeric input so
 * an empty row stays empty rather than becoming "£0.00".
 */
export function formatGbpRate(input: string | null | undefined): string {
  if (input == null) return "";
  const cleaned = String(input).replace(/[£,\s]/g, "");
  if (!cleaned) return "";
  if (!/^\d*\.?\d+$|^\d+\.$/.test(cleaned)) return "";
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return "";
  return `£${n.toFixed(2)}`;
}
