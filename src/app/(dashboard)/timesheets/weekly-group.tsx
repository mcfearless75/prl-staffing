"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/badge";
import { formatDate } from "@/lib/utils";
import { ChevronDown, ChevronRight, Clock, AlertTriangle, CheckCircle2, Send } from "lucide-react";

type TimesheetRow = {
  id: string;
  contractorName: string;
  weekStarting: string;
  totalHours: number;
  overtimeHours: number;
  status: string;
  isException: boolean;
  approvedBy: string | null;
  companyName: string;
  hasAbsence: boolean;
};

type GroupedData = Record<string, TimesheetRow[]>;

export function WeeklyTimesheetGroup({
  weeks,
  grouped,
}: {
  weeks: string[];
  grouped: GroupedData;
}) {
  // Most recent week open by default
  const [openWeeks, setOpenWeeks] = useState<Set<string>>(
    new Set(weeks.length > 0 ? [weeks[0]] : [])
  );

  function toggleWeek(week: string) {
    setOpenWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(week)) {
        next.delete(week);
      } else {
        next.add(week);
      }
      return next;
    });
  }

  function expandAll() {
    setOpenWeeks(new Set(weeks));
  }

  function collapseAll() {
    setOpenWeeks(new Set());
  }

  return (
    <div className="space-y-3">
      {/* Expand/Collapse controls */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={expandAll}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          Expand all
        </button>
        <span className="text-xs text-gray-300">|</span>
        <button
          onClick={collapseAll}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          Collapse all
        </button>
      </div>

      {weeks.map((week) => {
        const timesheets = grouped[week];
        const isOpen = openWeeks.has(week);

        // Week stats
        const count = timesheets.length;
        const totalHours = timesheets.reduce((sum, t) => sum + t.totalHours, 0);
        const totalOT = timesheets.reduce((sum, t) => sum + t.overtimeHours, 0);
        const submitted = timesheets.filter((t) => t.status === "Submitted").length;
        const draft = timesheets.filter((t) => t.status === "Draft").length;
        const approved = timesheets.filter((t) => t.status === "Approved").length;
        const rejected = timesheets.filter((t) => t.status === "Rejected").length;

        const weekDate = new Date(week);
        const weekEnd = new Date(weekDate);
        weekEnd.setDate(weekEnd.getDate() + 6);

        return (
          <div key={week} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            {/* Week Header - clickable */}
            <button
              onClick={() => toggleWeek(week)}
              className="flex w-full items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
            >
              {isOpen ? (
                <ChevronDown className="h-5 w-5 text-gray-400 shrink-0" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-400 shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Week of {formatDate(week)}
                  </h3>
                  <span className="text-xs text-gray-400">
                    → {formatDate(weekEnd.toISOString())}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1">
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    {count} timesheets · {totalHours}h total
                    {totalOT > 0 && (
                      <span className="text-orange-600 font-medium">({totalOT}h OT)</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Status summary badges */}
              <div className="flex items-center gap-1.5 shrink-0">
                {submitted > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">
                    <Send className="h-2.5 w-2.5" />
                    {submitted}
                  </span>
                )}
                {draft > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                    {draft} draft
                  </span>
                )}
                {approved > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    {approved}
                  </span>
                )}
                {rejected > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    {rejected}
                  </span>
                )}
              </div>
            </button>

            {/* Collapsible content */}
            {isOpen && (
              <div className="border-t border-gray-200">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-gray-500">
                        Contractor
                      </th>
                      <th className="px-4 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-gray-500">
                        Hours
                      </th>
                      <th className="px-4 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-gray-500">
                        Overtime
                      </th>
                      <th className="px-4 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-gray-500">
                        Status
                      </th>
                      <th className="px-4 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-gray-500">
                        Assignment
                      </th>
                      <th className="px-4 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-gray-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {timesheets.map((ts) => (
                      <tr
                        key={ts.id}
                        className={`hover:bg-gray-50 transition-colors ${
                          ts.isException ? "bg-amber-50/40" : ""
                        } ${ts.status === "Submitted" ? "bg-orange-50/30" : ""} ${
                          ts.hasAbsence ? "bg-indigo-50/30" : ""
                        }`}
                      >
                        <td className="whitespace-nowrap px-4 py-2.5 text-sm font-medium text-gray-900">
                          {ts.contractorName}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-sm font-semibold text-gray-900">
                          {ts.totalHours}h
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-sm">
                          <span
                            className={
                              ts.overtimeHours > 0
                                ? "font-semibold text-orange-600"
                                : "text-gray-400"
                            }
                          >
                            {ts.overtimeHours}h
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <Badge variant={ts.status}>{ts.status}</Badge>
                            {ts.isException && (
                              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                                Exception
                              </span>
                            )}
                            {ts.status === "Approved" &&
                              ts.approvedBy === "system" && (
                                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                                  Auto
                                </span>
                              )}
                            {ts.hasAbsence && (
                              <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">
                                Absence
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-sm text-gray-500">
                          {ts.companyName}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right">
                          <Link
                            href={`/timesheets/${ts.id}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Week summary footer */}
                <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-4 py-2">
                  <span className="text-xs text-gray-500">
                    {count} timesheets · {totalHours} total hours
                  </span>
                  {submitted > 0 && (
                    <span className="text-xs font-medium text-orange-600">
                      {submitted} awaiting approval
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
