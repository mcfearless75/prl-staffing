"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  useDroppable,
} from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { formatDate, getInitials } from "@/lib/utils";
import { updateAssignmentStatus } from "./actions";
import { GripVertical } from "lucide-react";

type Assignment = {
  id: string;
  role: string;
  location: string | null;
  startDate: Date | string;
  endDate: Date | string | null;
  status: string;
  contractor: { firstName: string; lastName: string } | null;
  company: { name: string } | null;
};

const STATUSES = ["Placed", "Active", "Ending", "Completed"] as const;

const statusColors: Record<
  string,
  {
    border: string;
    header: string;
    drop: string;
    dropActive: string;
    dot: string;
  }
> = {
  Placed: {
    border: "border-l-blue-500",
    header: "bg-blue-50 text-blue-700",
    drop: "border-transparent",
    dropActive: "border-blue-300 bg-blue-50/50",
    dot: "bg-blue-500",
  },
  Active: {
    border: "border-l-emerald-500",
    header: "bg-emerald-50 text-emerald-700",
    drop: "border-transparent",
    dropActive: "border-emerald-300 bg-emerald-50/50",
    dot: "bg-emerald-500",
  },
  Ending: {
    border: "border-l-orange-500",
    header: "bg-orange-50 text-orange-700",
    drop: "border-transparent",
    dropActive: "border-orange-300 bg-orange-50/50",
    dot: "bg-orange-500",
  },
  Completed: {
    border: "border-l-gray-400",
    header: "bg-gray-50 text-gray-600",
    drop: "border-transparent",
    dropActive: "border-gray-300 bg-gray-50/50",
    dot: "bg-gray-400",
  },
};

// Draggable Card Component
function KanbanCard({
  assignment,
  isOverlay = false,
}: {
  assignment: Assignment;
  isOverlay?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: assignment.id,
    data: { status: assignment.status },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const initials = assignment.contractor
    ? getInitials(assignment.contractor.firstName, assignment.contractor.lastName)
    : "??";

  const colors = statusColors[assignment.status] || statusColors.Placed;

  const cardContent = (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={isOverlay ? undefined : style}
      className={`group rounded-xl border border-gray-200 border-l-4 bg-white p-4 shadow-sm transition-all ${
        colors.border
      } ${
        isDragging
          ? "opacity-30 shadow-none"
          : isOverlay
          ? "shadow-xl ring-2 ring-blue-300 rotate-[2deg] scale-105"
          : "hover:shadow-md"
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          {...(isOverlay ? {} : { ...attributes, ...listeners })}
          className="mt-1 cursor-grab active:cursor-grabbing text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 touch-none"
          style={isOverlay ? { opacity: 1 } : undefined}
          aria-label="Drag handle"
          type="button"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          {isOverlay ? (
            <span className="text-sm font-semibold text-gray-900 truncate block">
              {assignment.contractor
                ? `${assignment.contractor.firstName} ${assignment.contractor.lastName}`
                : "Unknown"}
            </span>
          ) : (
            <Link
              href={`/assignments/${assignment.id}`}
              className="text-sm font-semibold text-gray-900 hover:text-blue-600 truncate block"
            >
              {assignment.contractor
                ? `${assignment.contractor.firstName} ${assignment.contractor.lastName}`
                : "Unknown"}
            </Link>
          )}
          <p className="truncate text-xs text-gray-500">
            {assignment.company?.name || "—"}
          </p>
          <p className="mt-1 text-xs font-medium text-gray-700">
            {assignment.role}
          </p>
          {assignment.location && (
            <p className="text-xs text-gray-400">{assignment.location}</p>
          )}
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
            <span>{formatDate(assignment.startDate)}</span>
            {assignment.endDate && (
              <>
                <span>—</span>
                <span>{formatDate(assignment.endDate)}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return cardContent;
}

// Droppable Column Component
function KanbanColumn({
  status,
  assignments,
  isOver,
}: {
  status: string;
  assignments: Assignment[];
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({
    id: `column-${status}`,
    data: { status },
  });

  const colors = statusColors[status] || statusColors.Placed;

  return (
    <div className="space-y-3">
      {/* Column Header */}
      <div
        className={`flex items-center justify-between rounded-lg px-4 py-2.5 ${colors.header}`}
      >
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${colors.dot}`} />
          <span className="text-sm font-semibold">{status}</span>
        </div>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/60 text-xs font-bold">
          {assignments.length}
        </span>
      </div>

      {/* Drop Zone */}
      <div
        ref={setNodeRef}
        className={`min-h-[200px] space-y-3 rounded-xl border-2 border-dashed p-2 transition-all duration-200 ${
          isOver ? colors.dropActive : colors.drop
        }`}
      >
        {assignments.length === 0 ? (
          <div
            className={`rounded-xl border border-dashed px-4 py-8 text-center text-sm transition-colors ${
              isOver
                ? "border-blue-400 bg-blue-50 text-blue-500"
                : "border-gray-300 bg-gray-50 text-gray-400"
            }`}
          >
            {isOver ? "Drop here!" : "Drop assignments here"}
          </div>
        ) : (
          assignments.map((assignment) => (
            <KanbanCard key={assignment.id} assignment={assignment} />
          ))
        )}
      </div>
    </div>
  );
}

// Main Kanban Board
export function KanbanBoard({
  initialAssignments,
}: {
  initialAssignments: Assignment[];
}) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const grouped: Record<string, Assignment[]> = {
    Placed: assignments.filter((a) => a.status === "Placed"),
    Active: assignments.filter((a) => a.status === "Active"),
    Ending: assignments.filter((a) => a.status === "Ending"),
    Completed: assignments.filter((a) => a.status === "Completed"),
  };

  const activeAssignment = activeId
    ? assignments.find((a) => a.id === activeId) || null
    : null;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    if (!over) {
      setOverColumn(null);
      return;
    }

    // Check if we're over a column
    const overId = over.id as string;
    if (overId.startsWith("column-")) {
      setOverColumn(overId.replace("column-", ""));
    } else {
      // We're over another card — find which column it belongs to
      const overAssignment = assignments.find((a) => a.id === overId);
      if (overAssignment) {
        setOverColumn(overAssignment.status);
      }
    }
  }, [assignments]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      setOverColumn(null);

      if (!over) return;

      const draggedId = active.id as string;
      const overId = over.id as string;

      // Determine the target column
      let targetStatus: string;
      if (overId.startsWith("column-")) {
        targetStatus = overId.replace("column-", "");
      } else {
        // Dropped on a card — get that card's status
        const overAssignment = assignments.find((a) => a.id === overId);
        if (!overAssignment) return;
        targetStatus = overAssignment.status;
      }

      // Find the dragged assignment
      const draggedAssignment = assignments.find((a) => a.id === draggedId);
      if (!draggedAssignment || draggedAssignment.status === targetStatus) return;

      // Optimistic update
      const previousAssignments = [...assignments];
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === draggedId ? { ...a, status: targetStatus } : a
        )
      );

      // Save to server
      setSaving(true);
      try {
        await updateAssignmentStatus(draggedId, targetStatus);
      } catch {
        // Revert on error
        setAssignments(previousAssignments);
      } finally {
        setSaving(false);
      }
    },
    [assignments]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setOverColumn(null);
  }, []);

  return (
    <div className="relative">
      {saving && (
        <div className="absolute -top-2 right-0 z-20">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
            Saving...
          </span>
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              assignments={grouped[status]}
              isOver={overColumn === status}
            />
          ))}
        </div>

        {/* Drag Overlay - renders outside the columns */}
        <DragOverlay dropAnimation={null}>
          {activeAssignment ? (
            <KanbanCard assignment={activeAssignment} isOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
