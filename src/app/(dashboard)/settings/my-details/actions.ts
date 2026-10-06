"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";
import { logActivity } from "@/lib/activity-log";
import { JOB_TITLE_MAX, normaliseUkPhone, resolveOwnUserId } from "@/lib/staff-contact";

export type MyDetailsResult = { type: "ok" | "error"; message: string } | null;

/** Updates ONLY phone and jobTitle on the caller's own row — never email or role. */
export async function updateMyDetails(_prev: MyDetailsResult, formData: FormData): Promise<MyDetailsResult> {
  const guard = await requireStaff();
  if (!guard.ok) redirect(guard.reason === "forbidden" ? "/" : "/login");

  const userId = await resolveOwnUserId(guard.session.user);
  if (!userId) return { type: "error", message: "We couldn't find your PRISM account. Please contact IT." };

  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const jobTitle = String(formData.get("jobTitle") ?? "").replace(/\s+/g, " ").trim();

  let phone: string | null = null;
  if (phoneRaw) {
    phone = normaliseUkPhone(phoneRaw);
    if (!phone) return { type: "error", message: "Please enter a valid UK phone number, e.g. 07700 900123." };
  }
  if (jobTitle.length > JOB_TITLE_MAX) {
    return { type: "error", message: `Job title must be ${JOB_TITLE_MAX} characters or fewer.` };
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { phone, jobTitle: jobTitle || null },
    });
    await logActivity("Updated own contact details", "User", userId);
    revalidatePath("/settings/my-details");
    return { type: "ok", message: "Your details have been saved." };
  } catch (error) {
    console.error("My details save failed:", error instanceof Error ? error.message : error);
    return { type: "error", message: "Could not save. Please try again." };
  }
}
