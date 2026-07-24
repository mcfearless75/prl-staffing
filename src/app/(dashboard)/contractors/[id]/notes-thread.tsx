"use client";

import { useActionState, useMemo } from "react";
import type { ContractorNote } from "@prisma/client";
import { addContractorNote, deleteContractorNote, toggleNotePin } from "./notes-actions";

interface NotesThreadProps {
  contractorId: string;
  notes: ContractorNote[];
}

function formatNoteTimestamp(date: Date | string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export function NotesThread({ contractorId, notes }: NotesThreadProps) {
  const sortedNotes = useMemo(() => {
    const pinned = notes
      .filter((n) => n.isPinned)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const unpinned = notes
      .filter((n) => !n.isPinned)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return [...pinned, ...unpinned];
  }, [notes]);

  const addAction = addContractorNote.bind(null, contractorId);
  const [addState, addFormAction, addPending] = useActionState(addAction, null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          Notes {notes.length > 0 && <span className="text-gray-400">({notes.length})</span>}
        </h3>
      </div>

      <form action={addFormAction} className="space-y-2">
        <textarea
          name="body"
          rows={3}
          required
          placeholder="Add a note for this contractor..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <div className="flex items-center justify-between gap-2">
          {addState?.type === "error" ? (
            <span className="text-xs text-red-600">{addState.message}</span>
          ) : (
            <span />
          )}
          <button
            type="submit"
            disabled={addPending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {addPending ? "Adding..." : "Add note"}
          </button>
        </div>
      </form>

      {sortedNotes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
          No notes yet. Add one above to start the thread.
        </p>
      ) : (
        <ul className="space-y-3">
          {sortedNotes.map((note) => (
            <NoteRow key={note.id} note={note} />
          ))}
        </ul>
      )}
    </div>
  );
}

function NoteRow({ note }: { note: ContractorNote }) {
  const deleteAction = deleteContractorNote.bind(null, note.id);
  const pinAction = toggleNotePin.bind(null, note.id);
  const [, deleteFormAction, deletePending] = useActionState(
    async (_prevState: Awaited<ReturnType<typeof deleteContractorNote>>) => deleteAction(),
    null
  );
  const [, pinFormAction, pinPending] = useActionState(
    async (_prevState: Awaited<ReturnType<typeof toggleNotePin>>) => pinAction(),
    null
  );

  return (
    <li
      className={`rounded-lg border px-4 py-3 ${
        note.isPinned ? "border-amber-300 bg-amber-50" : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">{note.authorName}</span>
            {note.isPinned && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase text-amber-700">
                Pinned
              </span>
            )}
          </div>
          <span className="text-xs text-gray-400">{formatNoteTimestamp(note.createdAt)}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <form action={pinFormAction}>
            <button
              type="submit"
              disabled={pinPending}
              className="rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {pinPending ? "..." : note.isPinned ? "Unpin" : "Pin"}
            </button>
          </form>
          <form action={deleteFormAction}>
            <button
              type="submit"
              disabled={deletePending}
              onClick={(e) => {
                if (!confirm("Delete this note? This cannot be undone.")) e.preventDefault();
              }}
              className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              {deletePending ? "..." : "Delete"}
            </button>
          </form>
        </div>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{note.body}</p>
    </li>
  );
}
