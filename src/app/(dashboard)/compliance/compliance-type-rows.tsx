"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/badge";
import { formatDate } from "@/lib/utils";
import {
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Clock,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

type ChaseEntry = {
  recordId: string;
  contractorId: string;
  contractorName: string;
  status: string;
  expiryDate: string | null;
};

type TypeRow = {
  type: string;
  total: number;
  verified: number;
  percentage: number;
  displayStatus: string;
  chase: ChaseEntry[];
};

function statusIcon(displayStatus: string) {
  switch (displayStatus) {
    case "Verified":
      return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
    case "Expiring":
      return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    case "Non-Compliant":
    case "Expired":
      return <AlertOctagon className="h-5 w-5 text-red-500" />;
    case "Pending":
      return <Clock className="h-5 w-5 text-gray-400" />;
    default:
      return <Clock className="h-5 w-5 text-gray-300" />;
  }
}

function barColor(displayStatus: string) {
  switch (displayStatus) {
    case "Verified":
      return "bg-emerald-500";
    case "Expiring":
      return "bg-amber-500";
    case "Non-Compliant":
    case "Expired":
      return "bg-red-500";
    default:
      return "bg-gray-300";
  }
}

function trackColor(displayStatus: string) {
  switch (displayStatus) {
    case "Verified":
      return "bg-emerald-100";
    case "Expiring":
      return "bg-amber-100";
    case "Non-Compliant":
    case "Expired":
      return "bg-red-100";
    default:
      return "bg-gray-100";
  }
}

function ComplianceTypeRow({ row }: { row: TypeRow }) {
  const [open, setOpen] = useState(false);
  const canExpand = row.chase.length > 0;

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/50">
      <button
        type="button"
        onClick={() => canExpand && setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex w-full items-center gap-4 px-4 py-3 text-left ${
          canExpand ? "cursor-pointer hover:bg-gray-100/70" : "cursor-default"
        } transition-colors rounded-lg`}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white">
          {statusIcon(row.displayStatus)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900">{row.type}</span>
            <span className="text-xs text-gray-500">
              {row.total} contractor{row.total !== 1 ? "s" : ""} / {row.verified} verified
            </span>
          </div>
          <div className={`h-2.5 w-full rounded-full ${trackColor(row.displayStatus)}`}>
            <div
              className={`h-2.5 rounded-full transition-all ${barColor(row.displayStatus)}`}
              style={{ width: `${row.percentage}%` }}
            />
          </div>
        </div>
        <div className="ml-2 flex shrink-0 items-center gap-2">
          {canExpand && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-gray-600 ring-1 ring-inset ring-gray-200">
              {row.chase.length} to chase
              {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </span>
          )}
          <Badge variant={row.displayStatus}>{row.displayStatus}</Badge>
        </div>
      </button>

      {open && canExpand && (
        <div className="border-t border-gray-200 bg-white">
          <ul className="divide-y divide-gray-100">
            {row.chase.map((c) => (
              <li
                key={c.recordId}
                className="flex items-center justify-between gap-4 px-4 py-2.5 pl-16"
              >
                <div className="min-w-0">
                  <Link
                    href={`/contractors/${c.contractorId}`}
                    className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors"
                  >
                    {c.contractorName}
                  </Link>
                  {c.expiryDate && (
                    <p className="text-xs text-gray-400">
                      Expires {formatDate(new Date(c.expiryDate))}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge variant={c.status}>{c.status}</Badge>
                  <Link
                    href={`/compliance/${c.recordId}`}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800"
                  >
                    View
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function ComplianceTypeRows({ rows }: { rows: TypeRow[] }) {
  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <ComplianceTypeRow key={row.type} row={row} />
      ))}
    </div>
  );
}
