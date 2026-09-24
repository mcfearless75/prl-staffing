"use client";

import { useState, useCallback } from "react";
import { LIVE_ASSIGNMENT_STATUSES, isEndingSoon } from "@/lib/assignment-statuses";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  MouseSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import Link from "next/link";
import { formatDate, getInitials } from "@/lib/utils";
import { updateAssignmentStatus } from "../assignments/actions";

/**
 * Work board: everyone on live work, one card per assignment, grouped by
 * status. Lives under Subcontractors (moved from /assignments 2026-09-24) —
 * cards open the person, and dragging a card still changes the assignment's
 * status through the same compliance-gated action.
 */
type Assignment = {
  id: string;
  contractorId: string;
  role: string;
  location: string | null;
  startDate: Date | string;
  endDate: Date | string | null;
  status: string;
  contractor: { firstName: string; lastName: string } | null;
  company: { name: string } | null;
};

// Live work only. Ending a job is done on the assignment itself (Edit
// assignment), not by dragging it off the board.
const STATUSES = LIVE_ASSIGNMENT_STATUSES;

const statusColors: Record<string, { border: string; header: string; dropBorder: string; dropBg: string; dot: string }> = {
  Placed: { border: "border-l-blue-500", header: "bg-blue-50 text-blue-700", dropBorder: "border-blue-400", dropBg: "bg-blue-50/50", dot: "bg-blue-500" },
  Active: { border: "border-l-emerald-500", header: "bg-emerald-50 text-emerald-700", dropBorder: "border-emerald-400", dropBg: "bg-emerald-50/50", dot: "bg-emerald-500" },
  Ending: { border: "border-l-orange-500", header: "bg-orange-50 text-orange-700", dropBorder: "border-orange-400", dropBg: "bg-orange-50/50", dot: "bg-orange-500" },
  Holiday: { border: "border-l-violet-500", header: "bg-violet-50 text-violet-700", dropBorder: "border-violet-400", dropBg: "bg-violet-50/50", dot: "bg-violet-500" },
  Completed: { border: "border-l-gray-400", header: "bg-gray-50 text-gray-600", dropBorder: "border-gray-400", dropBg: "bg-gray-50/50", dot: "bg-gray-400" },
};

// ─── Draggable Card ────────────────────────────────────────────────
function DraggableCard({ assignment }: { assignment: Assignment }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: assignment.id,
    data: { assignment },
  });

  const initials = assignment.contractor
    ? getInitials(assignment.contractor.firstName, assignment.contractor.lastName)
    : "??";
  const colors = statusColors[assignment.status] || statusColors.Placed;

  return (
    <div
      ref={setNodeRef}
      className={`group relative rounded-xl border border-gray-200 border-l-4 bg-white p-4 shadow-sm transition-all ${colors.border} ${
        isDragging ? "opacity-20 scale-95" : "hover:shadow-md"
      }`}
    >
      {/* Drag handle - whole card is draggable */}
      <div
        {...listeners}
        {...attributes}
        className="absolute inset-0 cursor-grab active:cursor-grabbing touch-none z-10"
        style={{ touchAction: "none" }}
      />
      <div className="relative z-0 pointer-events-none">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-sm font-semibold text-gray-900 truncate block">
              {assignment.contractor
                ? `${assignment.contractor.firstName} ${assignment.contractor.lastName}`
                : "Unknown"}
            </span>
            <p className="truncate text-xs text-gray-500">
              {assignment.company?.name || "—"}
            </p>
            <p className="mt-1 text-xs font-medium text-gray-700">
              {assignment.role}
            </p>
            {assignment.location && (
              <p className="text-xs text-gray-400">{assignment.location}</p>
            )}
            <div className="mt-2 text-xs text-gray-400">
              {formatDate(assignment.startDate)} –{" "}
              {assignment.endDate ? (
                <span className={isEndingSoon(assignment.endDate) ? "font-semibold text-amber-600" : undefined}>
                  {formatDate(assignment.endDate)}
                </span>
              ) : (
                "no end date"
              )}
            </div>
          </div>
        </div>
      </div>
      {/* View link - above the drag overlay */}
      <Link
        href={`/contractors/${assignment.contractorId}`}
        className="absolute top-2 right-3 z-20 text-xs font-medium text-blue-600 hover:text-blue-800 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        Open →
      </Link>
    </div>
  );
}

// ─── Card Overlay (shown while dragging) ───────────────────────────
function CardOverlay({ assignment }: { assignment: Assignment }) {
  const initials = assignment.contractor
    ? getInitials(assignment.contractor.firstName, assignment.contractor.lastName)
    : "??";
  const colors = statusColors[assignment.status] || statusColors.Placed;

  return (
    <div className={`rounded-xl border border-gray-200 border-l-4 bg-white p-4 shadow-2xl ring-2 ring-blue-400 rotate-[2deg] scale-105 w-[280px] ${colors.border}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-sm font-semibold text-gray-900 truncate block">
            {assignment.contractor
              ? `${assignment.contractor.firstName} ${assignment.contractor.lastName}`
              : "Unknown"}
          </span>
          <p className="truncate text-xs text-gray-500">
            {assignment.company?.name || "—"}
          </p>
          <p className="mt-1 text-xs font-medium text-gray-700">
            {assignment.role}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Droppable Column ──────────────────────────────────────────────
function DroppableColumn({
  status,
  assignments,
}: {
  status: string;
  assignments: Assignment[];
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status}`,
    data: { status },
  });

  const colors = statusColors[status] || statusColors.Placed;

  return (
    <div className="flex flex-col">
      {/* Column Header */}
      <div className={`flex items-center justify-between rounded-lg px-4 py-2.5 mb-3 ${colors.header}`}>
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${colors.dot}`} />
          <span className="text-sm font-semibold">{status}</span>
        </div>
        <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-white/60 text-xs font-bold px-1.5">
          {assignments.length}
        </span>
      </div>

      {/* Drop Zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[200px] space-y-3 rounded-xl border-2 border-dashed p-2 transition-all duration-200 ${
          isOver
            ? `${colors.dropBorder} ${colors.dropBg} scale-[1.02]`
            : "border-gray-200 bg-gray-50/30"
        }`}
      >
        {assignments.length === 0 ? (
          <div
            className={`rounded-xl border border-dashed px-4 py-8 text-center text-sm transition-colors ${
              isOver
                ? "border-blue-400 bg-blue-50 text-blue-600 font-medium"
                : "border-gray-300 bg-gray-50 text-gray-400"
            }`}
          >
            {isOver ? "✓ Drop here!" : "No one here"}
          </div>
        ) : (
          assignments.map((assignment) => (
            <DraggableCard key={assignment.id} assignment={assignment} />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main Kanban Board ─────────────────────────────────────────────
export function WorkBoard({
  initialAssignments,
}: {
  initialAssignments: Assignment[];
}) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");

  // Support both mouse and touch
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 8 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 5 },
  });

  const sensors = useSensors(mouseSensor, touchSensor);

  // Get unique companies for dropdown
  const companies = Array.from(
    new Set(assignments.map((a) => a.company?.name).filter(Boolean))
  ).sort() as string[];

  // Filter assignments
  const filtered = assignments.filter((a) => {
    const name = a.contractor
      ? `${a.contractor.firstName} ${a.contractor.lastName}`.toLowerCase()
      : "";
    const matchesSearch = !searchQuery || name.includes(searchQuery.toLowerCase()) || (a.role?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCompany = !companyFilter || a.company?.name === companyFilter;
    return matchesSearch && matchesCompany;
  });

  // Built from STATUSES so a new status gets a column automatically — the
  // hardcoded version silently dropped any assignment whose status wasn't listed.
  const grouped: Record<string, Assignment[]> = Object.fromEntries(
    STATUSES.map((s) => [s, filtered.filter((a) => a.status === s)])
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const assignment = event.active.data.current?.assignment as Assignment | undefined;
    if (assignment) {
      setActiveAssignment(assignment);
      setError(null);
    }
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveAssignment(null);
      const { active, over } = event;

      if (!over) return;

      const draggedId = active.id as string;
      const overId = over.id as string;

      // Determine target status
      let targetStatus: string | null = null;
      if (overId.startsWith("column-")) {
        targetStatus = overId.replace("column-", "");
      } else {
        // Dropped on another card - get that card's status
        const overAssignment = assignments.find((a) => a.id === overId);
        if (overAssignment) {
          targetStatus = overAssignment.status;
        }
      }

      if (!targetStatus) return;

      // Find dragged assignment
      const draggedAssignment = assignments.find((a) => a.id === draggedId);
      if (!draggedAssignment || draggedAssignment.status === targetStatus) return;

      // Optimistic update
      const previousAssignments = [...assignments];
      setAssignments((prev) =>
        prev.map((a) => (a.id === draggedId ? { ...a, status: targetStatus! } : a))
      );

      // Save to server
      setSaving(true);
      try {
        await updateAssignmentStatus(draggedId, targetStatus);
        setError(null);
      } catch (err) {
        setAssignments(previousAssignments);
        setError(
          err instanceof Error && err.message
            ? err.message
            : "Failed to update status. Please try again."
        );
      } finally {
        setSaving(false);
      }
    },
    [assignments]
  );

  const handleDragCancel = useCallback(() => {
    setActiveAssignment(null);
  }, []);

  return (
    <div className="relative">
      {/* Search & Filter Bar */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by name or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-2 rounded p-0.5 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
        <select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Companies</option>
          {companies.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {(searchQuery || companyFilter) && (
          <button
            onClick={() => { setSearchQuery(""); setCompanyFilter(""); }}
            className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200"
          >
            Clear filters
          </button>
        )}
        {(searchQuery || companyFilter) && (
          <span className="text-xs text-gray-500">
            {filtered.length} of {assignments.length} shown
          </span>
        )}
      </div>

      {/* Status indicators */}
      {saving && (
        <div className="absolute -top-2 right-0 z-20">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            Saving...
          </span>
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STATUSES.map((status) => (
            <DroppableColumn
              key={status}
              status={status}
              assignments={grouped[status]}
            />
          ))}
        </div>

        {/* Drag Overlay - floats above everything */}
        <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
          {activeAssignment ? <CardOverlay assignment={activeAssignment} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
