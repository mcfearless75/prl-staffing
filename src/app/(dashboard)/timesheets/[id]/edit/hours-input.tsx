"use client";

import { useState } from "react";
import { calculateProfessionalHours } from "@/lib/professional-hours";

export function HoursInput({
  dayOfWeek,
  defaultHours,
  defaultStart,
  defaultFinish,
  isRejected,
}: {
  dayOfWeek: number;
  defaultHours: number;
  defaultStart: string | null;
  defaultFinish: string | null;
  isRejected: boolean;
}) {
  const [start, setStart] = useState(defaultStart ?? "");
  const [finish, setFinish] = useState(defaultFinish ?? "");
  const [manualHours, setManualHours] = useState(String(defaultHours ?? 0));

  const computed = calculateProfessionalHours(start, finish);
  const borderClass = isRejected
    ? "border-red-400 focus:border-red-500 focus:ring-red-500"
    : "border-gray-300 focus:border-blue-500 focus:ring-blue-500";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <input
          type="time"
          name={`start_${dayOfWeek}`}
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className={`w-24 rounded-lg border bg-white px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 ${borderClass}`}
        />
        <span className="text-gray-400">–</span>
        <input
          type="time"
          name={`finish_${dayOfWeek}`}
          value={finish}
          onChange={(e) => setFinish(e.target.value)}
          className={`w-24 rounded-lg border bg-white px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 ${borderClass}`}
        />
      </div>
      {computed !== null ? (
        <div className="text-xs font-medium text-gray-700">
          {computed.toFixed(2)}h calculated
          <input type="hidden" name={`hours_${dayOfWeek}`} value={computed} />
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            name={`hours_${dayOfWeek}`}
            value={manualHours}
            onChange={(e) => setManualHours(e.target.value)}
            step={0.5}
            min={0}
            max={24}
            className={`w-20 rounded-lg border bg-white px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-1 ${borderClass}`}
          />
          <span className="text-[11px] text-gray-400">h (or set times)</span>
        </div>
      )}
    </div>
  );
}
