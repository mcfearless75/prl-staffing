"use client";

import { useState, useTransition } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
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

const statusBorderColors: Record<string, string> = {
  Placed: "border-l-blue-500",
  Active: "border-l-emerald-500",
  Ending: "border-l-orange-500",
  Completed: "border-l-gray-400",
};

const statusHeaderColors: Record<string, string> = {
  Placed: "bg-blue-50 text-blue-700",
  Active: "bg-emerald-50 text-emerald-700",
  Ending: "bg-orange-50 text-orange-700",
  Completed: "bg-gray-50 text-gray-600",
};

const statusDropColors: Record<string, string> = {
  Placed: "bg-blue-50/50",
  Active: "bg-emerald-50/50",
  Ending: "bg-orange-50/50",
  Completed: "bg-gray-50/50",
};

export function KanbanBoard({
  initialAssignments,
}: {
  initialAssignments: Assignment[];
}) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [isPending, startTransition] = useTransition();
  const [movingId, setMovingId] = useState<string | null>(null);

  const grouped = {
    Placed: assignments.filter((a) => a.status === "Placed"),
    Active: assignments.filter((a) => a.status === "Active"),
    Ending: assignments.filter((a) => a.status === "Ending"),
    Completed: assignments.filter((a) => a.status === "Completed"),
  };

  function handleDragEnd(result: DropResult) {
    const { draggableId, destination, source } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    const newStatus = destination.droppableId;

    // Optimistic update
    setAssignments((prev) =>
      prev.map((a) => (a.id === draggableId ? { ...a, status: newStatus } : a))
    );
    setMovingId(draggableId);

    startTransition(async () => {
      try {
        await updateAssignmentStatus(draggableId, newStatus);
      } catch {
        // Revert on error
        setAssignments((prev) =>
          prev.map((a) =>
            a.id === draggableId
              ? { ...a, status: source.droppableId }
              : a
          )
        );
      } finally {
        setMovingId(null);
      }
    });
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {STATUSES.map((status) => (
          <div key={status} className="space-y-3">
            {/* Column Header */}
            <div
              className={`flex items-center justify-between rounded-lg px-4 py-2.5 ${statusHeaderColors[status]}`}
            >
              <span className="text-sm font-semibold">{status}</span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/60 text-xs font-bold">
                {grouped[status].length}
              </span>
            </div>

            {/* Droppable Column */}
            <Droppable droppableId={status}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`min-h-[120px] space-y-3 rounded-xl border-2 border-dashed p-2 transition-colors ${
                    snapshot.isDraggingOver
                      ? `${statusDropColors[status]} border-gray-400`
                      : "border-transparent"
                  }`}
                >
                  {grouped[status].length === 0 && !snapshot.isDraggingOver ? (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-400">
                      Drop assignments here
                    </div>
                  ) : (
                    grouped[status].map((assignment, index) => {
                      const initials = assignment.contractor
                        ? getInitials(
                            assignment.contractor.firstName,
                            assignment.contractor.lastName
                          )
                        : "??";
                      const isMoving = movingId === assignment.id;

                      return (
                        <Draggable
                          key={assignment.id}
                          draggableId={assignment.id}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`group rounded-xl border border-gray-200 border-l-4 bg-white p-4 shadow-sm transition-shadow ${
                                statusBorderColors[status]
                              } ${
                                snapshot.isDragging
                                  ? "shadow-lg ring-2 ring-blue-200"
                                  : "hover:shadow-md"
                              } ${isMoving ? "opacity-70" : ""}`}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  {...provided.dragHandleProps}
                                  className="mt-1 cursor-grab text-gray-300 opacity-0 transition-opacity group-hover:opacity-100"
                                >
                                  <GripVertical className="h-4 w-4" />
                                </div>
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
                                  {initials}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <Link
                                    href={`/assignments/${assignment.id}`}
                                    className="text-sm font-semibold text-gray-900 hover:text-blue-600 truncate block"
                                  >
                                    {assignment.contractor
                                      ? `${assignment.contractor.firstName} ${assignment.contractor.lastName}`
                                      : "Unknown"}
                                  </Link>
                                  <p className="truncate text-xs text-gray-500">
                                    {assignment.company?.name || "—"}
                                  </p>
                                  <p className="mt-1 text-xs font-medium text-gray-700">
                                    {assignment.role}
                                  </p>
                                  {assignment.location && (
                                    <p className="text-xs text-gray-400">
                                      {assignment.location}
                                    </p>
                                  )}
                                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                                    <span>
                                      {formatDate(assignment.startDate)}
                                    </span>
                                    {assignment.endDate && (
                                      <>
                                        <span>—</span>
                                        <span>
                                          {formatDate(assignment.endDate)}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
