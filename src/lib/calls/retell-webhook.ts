import { Retell } from "retell-sdk";
import { isCallEnquiryCategory, type CallEnquiryCategory } from "@/lib/calls/constants";

export interface ParsedCallEnquiry {
  retellCallId: string;
  category: CallEnquiryCategory;
  callerName: string | null;
  callerPhone: string | null;
  contractorIdHint: string | null;
  reason: string;
  summary: string;
  transcript: string;
  urgent: boolean;
}

export type ParseResult =
  | { ok: true; skip: true; event: string | null; callId: string | null }
  | { ok: true; skip: false; data: ParsedCallEnquiry }
  | { ok: false; error: string };

function getRetellApiKey(): string {
  const key = process.env.RETELL_API_KEY;
  if (!key) throw new Error("RETELL_API_KEY is not configured");
  return key;
}

/**
 * Verifies the raw request body against Retell's X-Retell-Signature header.
 * Must be called with the RAW body string — never a re-serialized JSON.stringify
 * of the parsed body, or verification will fail.
 */
export async function verifyRetellWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): Promise<boolean> {
  if (!signatureHeader) return false;
  return Retell.verify(rawBody, getRetellApiKey(), signatureHeader);
}

export function parseRetellWebhookPayload(rawBody: string): ParseResult {
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return { ok: false, error: "Invalid JSON body" };
  }

  if (typeof payload !== "object" || payload === null) {
    return { ok: false, error: "Payload is not an object" };
  }
  const root = payload as Record<string, unknown>;

  if (root.event !== "call_analyzed") {
    const event = typeof root.event === "string" ? root.event : null;
    const call =
      typeof root.call === "object" && root.call !== null
        ? (root.call as Record<string, unknown>)
        : null;
    const callId = call && typeof call.call_id === "string" ? call.call_id : null;
    return { ok: true, skip: true, event, callId };
  }

  if (typeof root.call !== "object" || root.call === null) {
    return { ok: false, error: "Missing call object" };
  }
  const call = root.call as Record<string, unknown>;

  const callId = call.call_id;
  if (typeof callId !== "string" || callId.length === 0) {
    return { ok: false, error: "Missing call.call_id" };
  }

  const analysis =
    typeof call.call_analysis === "object" && call.call_analysis !== null
      ? (call.call_analysis as Record<string, unknown>)
      : {};
  const custom =
    typeof analysis.custom_analysis_data === "object" && analysis.custom_analysis_data !== null
      ? (analysis.custom_analysis_data as Record<string, unknown>)
      : {};

  const category = isCallEnquiryCategory(custom.category) ? custom.category : "OTHER";
  const transcript = typeof call.transcript === "string" ? call.transcript : "";
  const summary = typeof analysis.call_summary === "string" ? analysis.call_summary : "";
  const reason =
    typeof custom.reason === "string" && custom.reason.length > 0 ? custom.reason : summary;
  const callerPhone =
    (typeof custom.caller_phone === "string" && custom.caller_phone) ||
    (typeof call.from_number === "string" ? call.from_number : null) ||
    null;

  return {
    ok: true,
    skip: false,
    data: {
      retellCallId: callId,
      category,
      callerName: typeof custom.caller_name === "string" ? custom.caller_name : null,
      callerPhone,
      contractorIdHint:
        typeof custom.contractor_id_hint === "string" ? custom.contractor_id_hint : null,
      reason,
      summary,
      transcript,
      urgent: custom.urgent === true || category === "URGENT",
    },
  };
}
