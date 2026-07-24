import type { ContractorNote } from "@prisma/client";
import { NotesThread } from "../notes-thread";

export function NotesTab({
  contractorId,
  notes,
}: {
  contractorId: string;
  notes: ContractorNote[];
}) {
  return (
    <div className="rounded-xl border bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Notes</h2>
      <NotesThread contractorId={contractorId} notes={notes} />
    </div>
  );
}
