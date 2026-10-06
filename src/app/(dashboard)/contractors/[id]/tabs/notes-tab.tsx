import type { ContractorNote } from "@prisma/client";
import { prisma } from "@/lib/db";
import { NotesThread } from "../notes-thread";

export async function NotesTab({
  contractorId,
  notes,
}: {
  contractorId: string;
  notes: ContractorNote[];
}) {
  // For @mention autocomplete and highlighting. Every User is staff, and this
  // page is staff-only (middleware + the dashboard layout).
  const staff = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="rounded-xl border bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Notes</h2>
      <NotesThread contractorId={contractorId} notes={notes} staff={staff} />
    </div>
  );
}
