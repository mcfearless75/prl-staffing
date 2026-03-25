"use client";

import { useState } from "react";
import { Search } from "lucide-react";

interface CellData {
  type: string;
  status: "verified" | "pending" | "expired" | "expiring" | "missing";
  expiryDate: string | null;
}

interface ContractorRow {
  id: string;
  name: string;
  email: string;
  cells: CellData[];
  isCompliant: boolean;
  overallStatus: "compliant" | "expiring" | "non-compliant";
}

function StatusCell({ cell }: { cell: CellData }) {
  const icons: Record<CellData["status"], string> = {
    verified: "\u2705",
    pending: "\u23F3",
    expired: "\u274C",
    expiring: "\u23F3",
    missing: "\u2B1C",
  };

  const bgColors: Record<CellData["status"], string> = {
    verified: "bg-emerald-50 text-emerald-700",
    pending: "bg-yellow-50 text-yellow-700",
    expired: "bg-red-50 text-red-700",
    expiring: "bg-yellow-50 text-yellow-700",
    missing: "bg-gray-50 text-gray-400",
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    });
  };

  return (
    <td className="whitespace-nowrap px-3 py-3 text-center">
      <div className={`inline-flex flex-col items-center rounded-lg px-2 py-1 ${bgColors[cell.status]}`}>
        <span className="text-sm">{icons[cell.status]}</span>
        {cell.expiryDate && (
          <span className="text-[10px] font-medium mt-0.5">
            {formatDate(cell.expiryDate)}
          </span>
        )}
      </div>
    </td>
  );
}

export function TrainingMatrixClient({
  matrixData,
  complianceTypes,
}: {
  matrixData: ContractorRow[];
  complianceTypes: string[];
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = matrixData.filter((row) => {
    const matchesSearch =
      !search ||
      row.name.toLowerCase().includes(search.toLowerCase()) ||
      row.email.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || row.overallStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <>
      {/* Search and Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by contractor name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">All Statuses</option>
          <option value="compliant">Compliant</option>
          <option value="expiring">Expiring</option>
          <option value="non-compliant">Non-Compliant</option>
        </select>
      </div>

      {/* Matrix Table */}
      {filtered.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="sticky left-0 z-10 bg-gray-50 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Contractor
                </th>
                {complianceTypes.map((type) => (
                  <th
                    key={type}
                    className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    {type}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  <td className="sticky left-0 z-10 bg-white whitespace-nowrap px-6 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {row.name}
                      </p>
                      <p className="text-xs text-gray-500">{row.email}</p>
                    </div>
                  </td>
                  {row.cells.map((cell) => (
                    <StatusCell key={cell.type} cell={cell} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-gray-500">
            No contractors found matching your criteria.
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
        <span className="font-medium">Legend:</span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">{"\u2705"}</span>
          Verified
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block rounded bg-yellow-50 px-1.5 py-0.5 text-yellow-700">{"\u23F3"}</span>
          Pending / Expiring
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block rounded bg-red-50 px-1.5 py-0.5 text-red-700">{"\u274C"}</span>
          Expired
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block rounded bg-gray-50 px-1.5 py-0.5 text-gray-400">{"\u2B1C"}</span>
          Missing
        </span>
      </div>

      <div className="text-xs text-gray-400">
        Showing {filtered.length} of {matrixData.length} contractors
      </div>
    </>
  );
}
