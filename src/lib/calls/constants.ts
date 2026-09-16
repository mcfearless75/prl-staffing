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
