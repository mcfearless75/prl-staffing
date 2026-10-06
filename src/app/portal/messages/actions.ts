"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireContractor } from "@/lib/require-staff";
import { validateMessageBody } from "@/lib/contractor-messages";
import { recordWorkerReply } from "@/lib/contractor-messages-server";

export type ReplyResult = { type: "ok" | "error"; message: string } | null;

/**
 * Worker → PRL reply. The contractor is ALWAYS the session's own — nothing in
 * the form says whose thread this is, so a worker cannot post into another's.
 */
export async function sendWorkerReply(_prev: ReplyResult, formData: FormData): Promise<ReplyResult> {
  const guard = await requireContractor();
  if (!guard.ok) redirect("/login");

  const valid = validateMessageBody(formData.get("body"));
  if (!valid.ok) return { type: "error", message: valid.error };

  try {
    const result = await recordWorkerReply(guard.contractorId, valid.body);
    if (!result.ok) return { type: "error", message: result.error };
    revalidatePath("/portal/messages");
    revalidatePath("/portal");
    return { type: "ok", message: "Sent to PRL." };
  } catch (err) {
    console.error("Failed to save worker reply:", err);
    return { type: "error", message: "Couldn't send — please try again, or call PRL on 0800 772 3959." };
  }
}
