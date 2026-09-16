export const CALL_ENQUIRY_CATEGORIES = [
  "APPLICANT",
  "CONTRACTOR_QUERY",
  "CLIENT_ENQUIRY",
  "URGENT",
  "OTHER",
] as const;

export type CallEnquiryCategory = (typeof CALL_ENQUIRY_CATEGORIES)[number];

export function isCallEnquiryCategory(value: unknown): value is CallEnquiryCategory {
  return (
    typeof value === "string" &&
    (CALL_ENQUIRY_CATEGORIES as readonly string[]).includes(value)
  );
}

export const CALL_ENQUIRY_STATUSES = ["New", "Actioned"] as const;

export type CallEnquiryStatus = (typeof CALL_ENQUIRY_STATUSES)[number];

/**
 * Single source of truth for how a call category is displayed to staff.
 * Used by the Retell webhook's notification email and by the /calls
 * dashboard pages, so they never drift from each other again.
 */
export function categoryLabel(category: CallEnquiryCategory): string {
  switch (category) {
    case "APPLICANT":
      return "New Applicant";
    case "CONTRACTOR_QUERY":
      return "Contractor Query";
    case "CLIENT_ENQUIRY":
      return "Client Enquiry";
    case "URGENT":
      return "Urgent";
    default:
      return "Other";
  }
}
