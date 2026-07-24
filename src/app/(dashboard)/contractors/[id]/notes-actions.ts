"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/require-staff";

export type NoteActionResult = { type: "ok" | "error"; message: string } | null;

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

    revalidatePath(`/contractors/${contractorId}`);
    return { type: "ok", message: "Note added." };
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
