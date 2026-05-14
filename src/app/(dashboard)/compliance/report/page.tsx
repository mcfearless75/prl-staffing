export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { PrintButton } from "./print-button";

type ComplianceStatus = "Verified" | "Expiring" | "Non-Compliant" | "Pending";

function worstStatus(statuses: string[]): ComplianceStatus {
  if (statuses.some((s) => s === "Expired" || s === "Non-Compliant"))
    return "Non-Compliant";
  if (statuses.some((s) => s === "Expiring")) return "Expiring";
  if (statuses.some((s) => s === "Pending")) return "Pending";
  return "Verified";
}

function statusPillClass(status: string): string {
  switch (status) {
    case "Verified":
      return "bg-green-100 text-green-800 border border-green-300";
    case "Expiring":
      return "bg-amber-100 text-amber-800 border border-amber-300";
    case "Expired":
    case "Non-Compliant":
      return "bg-red-100 text-red-800 border border-red-300";
    default:
      return "bg-gray-100 text-gray-600 border border-gray-300";
  }
}

function ragBadgeClass(status: ComplianceStatus): string {
  switch (status) {
    case "Verified":
      return "bg-green-600 text-white";
    case "Expiring":
      return "bg-amber-500 text-white";
    case "Non-Compliant":
      return "bg-red-600 text-white";
    default:
      return "bg-gray-400 text-white";
  }
}

function contractorStatusClass(status: string): string {
  switch (status) {
    case "Active":
      return "bg-green-100 text-green-800";
    case "Pending":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

export default async function ComplianceReportPage() {
  const [allRecords, totalContractors] = await Promise.all([
    prisma.complianceRecord.findMany({
      include: { contractor: true },
      orderBy: [
        { contractor: { lastName: "asc" } },
        { type: "asc" },
      ],
    }),
    prisma.contractor.count({
      where: { status: { notIn: ["Left", "Inactive"] } },
    }),
  ]);

  // Group records by contractor
  const byContractor = new Map<
    string,
    {
      contractor: {
        id: string;
        firstName: string;
        lastName: string;
        status: string;
        email: string | null;
      };
      records: typeof allRecords;
    }
  >();

  for (const r of allRecords) {
    if (!byContractor.has(r.contractorId)) {
      byContractor.set(r.contractorId, {
        contractor: r.contractor,
        records: [],
      });
    }
    byContractor.get(r.contractorId)!.records.push(r);
  }

  // Contractors with no records
  const contractorIdsWithRecords = [...byContractor.keys()];
  const noRecordContractors = await prisma.contractor.findMany({
    where: {
      id: { notIn: contractorIdsWithRecords },
      status: { notIn: ["Left", "Inactive"] },
    },
    orderBy: [{ lastName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      status: true,
    },
  });

  // Stats
  const withRecords = byContractor.size;
  let fullyCompliant = 0;
  for (const { records } of byContractor.values()) {
    const worst = worstStatus(records.map((r) => r.status));
    if (worst === "Verified") fullyCompliant++;
  }
  const noRecords = noRecordContractors.length;

  const generatedAt = new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Sorted contractor entries
  const contractorEntries = [...byContractor.values()].sort((a, b) =>
    a.contractor.lastName.localeCompare(b.contractor.lastName)
  );

  return (
    <div className="min-h-screen bg-white p-6 print:p-4">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between border-b border-gray-300 pb-4 print:border-gray-400">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Compliance Audit Report
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            PRL Site Solutions — PRISM Workforce Management
          </p>
          <p className="mt-0.5 text-xs text-gray-400">
            Generated: {generatedAt}
          </p>
        </div>
        <PrintButton />
      </div>

      {/* Summary stats bar */}
      <div className="mb-6 grid grid-cols-4 gap-4 print:gap-3">
        {[
          { label: "Total Contractors", value: totalContractors, color: "bg-gray-50 border-gray-200" },
          { label: "Fully Compliant", value: fullyCompliant, color: "bg-green-50 border-green-200" },
          { label: "With Records", value: withRecords, color: "bg-blue-50 border-blue-200" },
          { label: "No Records", value: noRecords, color: "bg-amber-50 border-amber-200" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className={`rounded-lg border p-4 text-center ${color}`}
          >
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="mt-0.5 text-xs font-medium text-gray-600">{label}</p>
          </div>
        ))}
      </div>

      {/* Main contractor table */}
      <div className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Compliance Records by Contractor
        </h2>
        <div className="overflow-hidden rounded-lg border border-gray-200 print:rounded-none print:border-gray-400">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100 text-left print:bg-gray-200">
                <th className="border-b border-gray-200 px-4 py-2 font-semibold text-gray-700">
                  Contractor
                </th>
                <th className="border-b border-gray-200 px-4 py-2 font-semibold text-gray-700">
                  Status
                </th>
                <th className="border-b border-gray-200 px-4 py-2 font-semibold text-gray-700">
                  Compliance Items
                </th>
                <th className="border-b border-gray-200 px-4 py-2 text-right font-semibold text-gray-700">
                  RAG
                </th>
              </tr>
            </thead>
            <tbody>
              {contractorEntries.map(({ contractor, records }, idx) => {
                const rag = worstStatus(records.map((r) => r.status));
                return (
                  <tr
                    key={contractor.id}
                    className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    <td className="border-b border-gray-100 px-4 py-3 align-top">
                      <p className="font-medium text-gray-900">
                        {contractor.lastName}, {contractor.firstName}
                      </p>
                      {contractor.email && (
                        <p className="text-xs text-gray-400">
                          {contractor.email}
                        </p>
                      )}
                    </td>
                    <td className="border-b border-gray-100 px-4 py-3 align-top">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${contractorStatusClass(contractor.status)}`}
                      >
                        {contractor.status}
                      </span>
                    </td>
                    <td className="border-b border-gray-100 px-4 py-3 align-top">
                      <div className="flex flex-wrap gap-1.5">
                        {records.map((rec) => (
                          <span
                            key={rec.id}
                            className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${statusPillClass(rec.status)}`}
                            title={`${rec.type}: ${rec.status}${rec.expiryDate ? ` (expires ${new Date(rec.expiryDate).toLocaleDateString("en-GB")})` : ""}`}
                          >
                            {rec.type}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="border-b border-gray-100 px-4 py-3 text-right align-top">
                      <span
                        className={`inline-block rounded px-2.5 py-0.5 text-xs font-bold ${ragBadgeClass(rag)}`}
                      >
                        {rag}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* No records section */}
      {noRecordContractors.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            No Compliance Records ({noRecordContractors.length})
          </h2>
          <div className="overflow-hidden rounded-lg border border-amber-200 print:rounded-none print:border-gray-400">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-amber-50 text-left">
                  <th className="border-b border-amber-200 px-4 py-2 font-semibold text-gray-700">
                    Contractor
                  </th>
                  <th className="border-b border-amber-200 px-4 py-2 font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="border-b border-amber-200 px-4 py-2 font-semibold text-gray-700">
                    Email
                  </th>
                  <th className="border-b border-amber-200 px-4 py-2 text-right font-semibold text-gray-700">
                    RAG
                  </th>
                </tr>
              </thead>
              <tbody>
                {noRecordContractors.map((c, idx) => (
                  <tr
                    key={c.id}
                    className={idx % 2 === 0 ? "bg-white" : "bg-amber-50/40"}
                  >
                    <td className="border-b border-gray-100 px-4 py-2.5 font-medium text-gray-900">
                      {c.lastName}, {c.firstName}
                    </td>
                    <td className="border-b border-gray-100 px-4 py-2.5">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${contractorStatusClass(c.status)}`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="border-b border-gray-100 px-4 py-2.5 text-xs text-gray-500">
                      {c.email ?? "—"}
                    </td>
                    <td className="border-b border-gray-100 px-4 py-2.5 text-right">
                      <span className="inline-block rounded bg-gray-400 px-2.5 py-0.5 text-xs font-bold text-white">
                        Pending
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Print footer */}
      <div className="mt-8 hidden border-t border-gray-300 pt-3 text-center text-xs text-gray-400 print:block">
        PRL Site Solutions — PRISM Workforce Management | Confidential |{" "}
        {generatedAt}
      </div>
    </div>
  );
}
