"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/require-staff";
import { logActivity } from "@/lib/activity-log";
import { sendEmail } from "@/lib/email";
import { escapeHtml } from "@/lib/utils";
import {
  describeUnresolved,
  extractMentionTokens,
  resolveMentions,
  type MentionableUser,
} from "@/lib/note-mentions";

export type NoteActionResult =
  | {
      type: "ok" | "error";
      message: string;
      /** Shown to the author when an @mention notified nobody (ambiguous/unknown). */
      notice?: string | null;
    }
  | null;

const APP_URL = process.env.NEXTAUTH_URL || "https://www.prismworkforce.online";

/**
 * The staff list that @mentions resolve against — every User is staff.
 * Deliberately NOT exported: an exported function in a "use server" file is a
 * public endpoint, and this returns every staff email address.
 */
async function getMentionableStaff(): Promise<MentionableUser[]> {
  return prisma.user.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}

/**
 * Emails, and drops an in-app notification for, every colleague @mentioned in
 * a note. The author is never notified about their own mention. Each recipient
 * is independent: one failed email or notification doesn't stop the others.
 */
async function notifyMentionedStaff(opts: {
  body: string;
  contractorId: string;
  contractorName: string;
  authorName: string;
  authorId: string | null;
  authorEmail: string | null;
}): Promise<{ summary: string; notice: string | null }> {
  const tokens = extractMentionTokens(opts.body);
  if (tokens.length === 0) return { summary: "", notice: null };

  const resolution = resolveMentions(opts.body, await getMentionableStaff());
  const authorEmail = opts.authorEmail?.toLowerCase() ?? null;
  const recipients = resolution.matched.filter(
    (u) => u.id !== opts.authorId && u.email.toLowerCase() !== authorEmail
  );

  const path = `/contractors/${opts.contractorId}?tab=Notes`;
  const title = `${opts.authorName} mentioned you on ${opts.contractorName}`;
  const plain = opts.body.replace(/\s+/g, " ").trim();
  const preview = plain.length > 140 ? plain.slice(0, 140) + "…" : plain;
  const html = `
    <p>${escapeHtml(opts.authorName)} mentioned you in a note on <strong>${escapeHtml(opts.contractorName)}</strong>:</p>
    <blockquote style="margin:12px 0;padding:8px 12px;border-left:3px solid #4f46e5;background:#f9fafb;color:#374151">
      ${escapeHtml(opts.body).replace(/\r?\n/g, "<br>")}
    </blockquote>
    <p><a href="${escapeHtml(APP_URL + path)}">Open ${escapeHtml(opts.contractorName)}'s notes in PRISM</a></p>
  `;

  const notified: string[] = [];
  await Promise.all(
    recipients.map(async (u) => {
      try {
        const res = await sendEmail({ to: u.email, subject: title, html, template: "note-mention" });
        if (res.success) notified.push(u.name);
      } catch (error) {
        console.error("Mention email failed:", error instanceof Error ? error.message : error);
      }
      try {
        await prisma.notification.create({
          data: { recipientType: "user", recipientId: u.id, title, body: preview, url: path },
        });
      } catch (error) {
        console.error("Mention notification failed:", error instanceof Error ? error.message : error);
      }
    })
  );

  const failed = recipients.length - notified.length;
  const notes = [describeUnresolved(resolution)];
  if (failed > 0) notes.push(`${failed} email${failed === 1 ? "" : "s"} could not be sent.`);
  return {
    summary: notified.length ? ` Emailed ${notified.join(", ")}.` : "",
    notice: notes.filter(Boolean).join(" ") || null,
  };
}

/**
 * Adds a staff note to a contractor's notes thread (ContractorNote —
 * distinct from the legacy Contractor.notes onboarding JSON blob).
 * authorId/authorName are always derived from the session, never from
 * client input, so a caller cannot forge authorship.
 */
export async function addContractorNote(
  contractorId: string,
  _prevState: NoteActionResult,
  formData: FormData
): Promise<NoteActionResult> {
  const guard = await requireStaff();
  if (!guard.ok) redirect(guard.reason === "forbidden" ? "/" : "/login");

  try {
    const body = ((formData.get("body") as string) || "").trim();
    if (!body) {
      return { type: "error", message: "Note cannot be empty." };
    }

    const contractor = await prisma.contractor.findUnique({ where: { id: contractorId } });
    if (!contractor) {
      return { type: "error", message: "Contractor not found." };
    }

    const authorName = guard.session.user.name || guard.session.user.email || "Staff";
    const authorId = guard.session.user.id || null;

    await prisma.contractorNote.create({
      data: {
        contractorId,
        body,
        authorId,
        authorName,
      },
    });

    await logActivity("Note added", "Contractor", contractorId, `${body.length > 140 ? body.slice(0, 140) + "…" : body}`);

    // @mentions never fail the note: it is already saved above.
    let mentionSummary = "";
    let notice: string | null = null;
    try {
      const outcome = await notifyMentionedStaff({
        body,
        contractorId,
        contractorName: `${contractor.firstName} ${contractor.lastName}`.trim(),
        authorName,
        authorId,
        authorEmail: guard.session.user.email ?? null,
      });
      mentionSummary = outcome.summary;
      notice = outcome.notice;
    } catch (error) {
      console.error("Note mention notifications failed:", error instanceof Error ? error.message : error);
      notice = "The note was saved, but the people you mentioned could not be emailed.";
    }

    revalidatePath(`/contractors/${contractorId}`);
    return { type: "ok", message: `Note added.${mentionSummary}`, notice };
  } catch (error) {
    console.error("Failed to add contractor note:", error);
    return { type: "error", message: "Failed to add note. Please try again." };
  }
}

export async function deleteContractorNote(noteId: string): Promise<NoteActionResult> {
  const guard = await requireStaff();
  if (!guard.ok) redirect(guard.reason === "forbidden" ? "/" : "/login");

  try {
    const note = await prisma.contractorNote.findUnique({ where: { id: noteId } });
    if (!note) {
      return { type: "error", message: "Note not found." };
    }

    await prisma.contractorNote.delete({ where: { id: noteId } });
    // The deleted text goes in the log, so removing a note doesn't erase the history.
    await logActivity("Note deleted", "Contractor", note.contractorId, `${note.body.length > 140 ? note.body.slice(0, 140) + "…" : note.body}`);

    revalidatePath(`/contractors/${note.contractorId}`);
    return { type: "ok", message: "Note deleted." };
  } catch (error) {
    console.error("Failed to delete contractor note:", error);
    return { type: "error", message: "Failed to delete note. Please try again." };
  }
}

export async function toggleNotePin(noteId: string): Promise<NoteActionResult> {
  const guard = await requireStaff();
  if (!guard.ok) redirect(guard.reason === "forbidden" ? "/" : "/login");

  try {
    const note = await prisma.contractorNote.findUnique({ where: { id: noteId } });
    if (!note) {
      return { type: "error", message: "Note not found." };
    }

    await prisma.contractorNote.update({
      where: { id: noteId },
      data: { isPinned: !note.isPinned },
    });

    revalidatePath(`/contractors/${note.contractorId}`);
    return { type: "ok", message: note.isPinned ? "Note unpinned." : "Note pinned." };
  } catch (error) {
    console.error("Failed to toggle note pin:", error);
    return { type: "error", message: "Failed to update note. Please try again." };
  }
}
