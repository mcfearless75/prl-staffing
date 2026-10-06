"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import type { ContractorNote } from "@prisma/client";
import { addContractorNote, deleteContractorNote, toggleNotePin, type NoteActionResult } from "./notes-actions";
import {
  activeMentionQuery,
  mentionHandle,
  segmentMentions,
  suggestMentions,
  type MentionableUser,
} from "@/lib/note-mentions";

interface NotesThreadProps {
  contractorId: string;
  notes: ContractorNote[];
  /** Staff users, for @mention autocomplete and highlighting. */
  staff?: MentionableUser[];
}

function formatNoteTimestamp(date: Date | string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export function NotesThread({ contractorId, notes, staff = [] }: NotesThreadProps) {
  const sortedNotes = useMemo(() => {
    const pinned = notes
      .filter((n) => n.isPinned)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const unpinned = notes
      .filter((n) => !n.isPinned)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return [...pinned, ...unpinned];
  }, [notes]);

  const [body, setBody] = useState("");
  const [query, setQuery] = useState<string | null>(null);
  const [highlight, setHighlight] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [addState, addFormAction, addPending] = useActionState(
    async (prev: NoteActionResult, formData: FormData) => {
      const result = await addContractorNote(contractorId, prev, formData);
      if (result?.type === "ok") {
        setBody("");
        setQuery(null);
      }
      return result;
    },
    null
  );

  const suggestions = query === null ? [] : suggestMentions(query, staff);

  function updateQuery(value: string, caret: number) {
    setQuery(activeMentionQuery(value.slice(0, caret)));
    setHighlight(0);
  }

  function pick(user: MentionableUser) {
    const el = textareaRef.current;
    const caret = el?.selectionStart ?? body.length;
    const before = body.slice(0, caret).replace(/@[A-Za-z0-9._'-]*$/, "");
    const inserted = `@${mentionHandle(user, staff)} `;
    const next = before + inserted + body.slice(caret);
    setBody(next);
    setQuery(null);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const pos = before.length + inserted.length;
      el.setSelectionRange(pos, pos);
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      pick(suggestions[Math.min(highlight, suggestions.length - 1)]);
    } else if (e.key === "Escape") {
      setQuery(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          Notes {notes.length > 0 && <span className="text-gray-400">({notes.length})</span>}
        </h3>
      </div>

      <form action={addFormAction} className="space-y-2">
        <div className="relative">
          <textarea
            ref={textareaRef}
            name="body"
            rows={3}
            required
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              updateQuery(e.target.value, e.target.selectionStart ?? e.target.value.length);
            }}
            onKeyDown={onKeyDown}
            onClick={(e) => updateQuery(e.currentTarget.value, e.currentTarget.selectionStart ?? 0)}
            onBlur={() => setQuery(null)}
            placeholder="Add a note for this contractor..."
            aria-autocomplete="list"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {suggestions.length > 0 && (
            <ul
              role="listbox"
              className="absolute left-0 z-20 mt-1 max-h-56 w-72 overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
            >
              {suggestions.map((u, i) => (
                <li
                  key={u.id}
                  role="option"
                  aria-selected={i === highlight}
                  // mousedown, not click: click fires after the textarea's blur closes the list
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(u);
                  }}
                  className={`cursor-pointer px-3 py-1.5 text-sm ${
                    i === highlight ? "bg-indigo-50 text-indigo-700" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span className="font-medium">{u.name}</span>{" "}
                  <span className="text-xs text-gray-400">@{mentionHandle(u, staff)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="text-xs text-gray-400">Type @name to notify a colleague by email.</p>
        <div className="flex items-center justify-between gap-2">
          {addState?.type === "error" ? (
            <span className="text-xs text-red-600">{addState.message}</span>
          ) : addState?.type === "ok" ? (
            <span className="text-xs">
              <span className="text-emerald-700">{addState.message}</span>
              {addState.notice && <span className="ml-1 text-amber-700">{addState.notice}</span>}
            </span>
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
            <NoteRow key={note.id} note={note} staff={staff} />
          ))}
        </ul>
      )}
    </div>
  );
}

function NoteRow({ note, staff }: { note: ContractorNote; staff: MentionableUser[] }) {
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
      <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
        {segmentMentions(note.body, staff).map((seg, i) =>
          seg.kind === "mention" ? (
            <span
              key={i}
              title={seg.user.name}
              className="rounded bg-indigo-50 px-0.5 font-medium text-indigo-700"
            >
              {seg.text}
            </span>
          ) : (
            <span key={i}>{seg.text}</span>
          )
        )}
      </p>
    </li>
  );
}
