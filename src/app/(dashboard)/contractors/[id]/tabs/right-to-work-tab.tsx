import Link from "next/link";
import { categoryForType } from "@/lib/compliance-types";
import { maskPassportNumber } from "@/lib/utils";
import type { ComplianceRecordRow } from "./types";
import { ComplianceRecordsSummary, GroupedComplianceRecords } from "./compliance-record-card";
import { BulkDocUploader } from "../bulk-doc-uploader";

/** What the applicant declared on /apply, as opposed to documents later uploaded. */
export type DeclaredRightToWork = {
  nonBritishNational: string | null;
  requiresWorkPermit: string | null;
  passportNumber: string | null;
  passportExpiry: Date | null;
  visaNumber: string | null;
  visaExpiry: Date | null;
};

const DAY = 86_400_000;

function expiryState(d: Date | null) {
  if (!d) return null;
  const days = Math.floor((d.getTime() - Date.now()) / DAY);
  if (days < 0) return { label: `Expired ${Math.abs(days)}d ago`, cls: "bg-red-100 text-red-700" };
  if (days <= 90) return { label: `Expires in ${days}d`, cls: "bg-amber-100 text-amber-700" };
  return { label: "Valid", cls: "bg-green-100 text-green-700" };
}

function DeclaredRow({ label, value, expiry }: { label: string; value: string | null; expiry?: Date | null }) {
  if (!value && !expiry) return null;
  const state = expiryState(expiry ?? null);
  return (
    <div className="grid grid-cols-[180px_1fr] gap-2 py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <span className="flex items-center gap-2 text-xs text-gray-800">
        {value ?? "—"}
        {expiry && (
          <>
            <span className="text-gray-400">
              {expiry.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </span>
            {state && (
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${state.cls}`}>{state.label}</span>
            )}
          </>
        )}
      </span>
    </div>
  );
}

export function RightToWorkTab({
  contractorId,
  complianceRecords,
  crVerified,
  crPending,
  crActionRequired,
  declared,
}: {
  contractorId: string;
  complianceRecords: ComplianceRecordRow[];
  crVerified: number;
  crPending: number;
  crActionRequired: number;
  declared?: DeclaredRightToWork;
}) {
  const rtwRecords = complianceRecords.filter((r) => categoryForType(r.type) === "Right to Work");

  // Before this existed, an applicant could supply a passport number and expiry
  // on /apply and this tab would still read "No Right to Work records on file",
  // because it only ever looked at uploaded ComplianceRecords. The declared
  // values sat on the Application tab, where nobody checking RTW would look.
  const hasDeclared =
    !!declared &&
    Object.values(declared).some((v) => v !== null && v !== undefined && v !== "");

  return (
    <div className="rounded-xl border bg-white p-6">
      <ComplianceRecordsSummary
        contractorId={contractorId}
        total={complianceRecords.length}
        verified={crVerified}
        pending={crPending}
        actionRequired={crActionRequired}
      />

      <details className="mb-6">
        <summary className="cursor-pointer select-none text-xs font-medium text-blue-600 hover:text-blue-800">
          📥 Upload Right to Work documents
        </summary>
        <div className="mt-3">
          <BulkDocUploader contractorId={contractorId} onlyCategory="Right to Work" />
        </div>
      </details>

      {hasDeclared && declared && (
        <section className="mb-6">
          <h3 className="mb-3 border-b border-gray-200 pb-1.5 text-sm font-semibold text-gray-900">
            Declared at application
            <span className="ml-2 font-normal text-gray-400">
              (self-reported — verify against documents)
            </span>
          </h3>
          <DeclaredRow label="Non-British national" value={declared.nonBritishNational} />
          <DeclaredRow label="Requires work permit" value={declared.requiresWorkPermit} />
          <DeclaredRow
            label="Passport"
            value={declared.passportNumber ? maskPassportNumber(declared.passportNumber) : null}
            expiry={declared.passportExpiry}
          />
          <DeclaredRow
            label="Visa"
            value={declared.visaNumber ? maskPassportNumber(declared.visaNumber) : null}
            expiry={declared.visaExpiry}
          />
        </section>
      )}

      {complianceRecords.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 px-6 py-8 text-center">
          <p className="text-sm text-gray-500 mb-3">No compliance records on file.</p>
          <Link
            href={`/compliance/new?contractorId=${contractorId}`}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
          >
            + Add Compliance Record
          </Link>
        </div>
      ) : rtwRecords.length === 0 ? (
        <p className="text-sm text-gray-500">No Right to Work records on file.</p>
      ) : (
        <section>
          <h3 className="mb-3 border-b border-gray-200 pb-1.5 text-sm font-semibold text-gray-900">
            Right to Work
            <span className="ml-2 font-normal text-gray-400">({rtwRecords.length})</span>
          </h3>
          <GroupedComplianceRecords records={rtwRecords} />
        </section>
      )}
    </div>
  );
}
