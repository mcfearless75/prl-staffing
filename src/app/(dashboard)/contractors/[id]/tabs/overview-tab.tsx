import Link from "next/link";
import { maskNI, maskUTR } from "@/lib/utils";
import { ContractorPortalStatus } from "@/components/contractor-portal-status";
import type { ContractorWithRelations } from "./types";

export function OverviewTab({ contractor }: { contractor: ContractorWithRelations }) {
  return (
    <div className="space-y-6">
      {/* Details Grid */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Details</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-sm font-medium text-gray-500">Email</p>
            <p className="text-sm text-gray-900">{contractor.email || "-"}</p>
          </div>
          {contractor.personalEmail && (
            <div>
              <p className="text-sm font-medium text-gray-500">Personal / secondary email</p>
              <p className="text-sm text-gray-900">{contractor.personalEmail}</p>
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-500">Phone</p>
            <p className="text-sm text-gray-900">{contractor.phone || "-"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Day Rate</p>
            <p className="text-sm text-gray-900">
              {contractor.dayRate != null ? `£${Number(contractor.dayRate).toFixed(2)}` : "-"}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Pay Rate/hr</p>
            <p className="text-sm text-gray-900">{contractor.payRate || "-"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Charge Rate/hr</p>
            <p className="text-sm text-gray-900">{contractor.chargeRate || "-"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">NI Number</p>
            <p className="text-sm text-gray-900 font-mono">{maskNI(contractor.niNumber)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">UTR Number</p>
            <p className="text-sm text-gray-900 font-mono">{maskUTR(contractor.utrNumber)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">IR35 Status</p>
            <p className="text-sm">
              {contractor.ir35Status ? (
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    contractor.ir35Status === "Outside"
                      ? "bg-emerald-100 text-emerald-700"
                      : contractor.ir35Status === "Inside"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {contractor.ir35Status}
                </span>
              ) : (
                <Link href={`/contractors/${contractor.id}/ir35`} className="text-blue-600 hover:underline text-xs">
                  Run assessment →
                </Link>
              )}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Supplier</p>
            <p className="text-sm text-gray-900">{contractor.supplier?.name || "-"}</p>
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="rounded-xl border border-red-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-red-900 flex items-center gap-2">🚨 Emergency Contact</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm font-medium text-gray-500">Contact Name</p>
            <p className="text-sm text-gray-900">{contractor.emergencyContactName || "-"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Contact Phone</p>
            <p className="text-sm text-gray-900">
              {contractor.emergencyContactPhone ? (
                <a href={`tel:${contractor.emergencyContactPhone}`} className="text-blue-600 hover:underline">
                  {contractor.emergencyContactPhone}
                </a>
              ) : (
                "-"
              )}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Relationship</p>
            <p className="text-sm text-gray-900">{contractor.emergencyContactRelation || "-"}</p>
          </div>
        </div>
        {!contractor.emergencyContactName && (
          <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
            <p className="text-xs text-red-600">
              ⚠️ No emergency contact on file.{" "}
              <Link href={`/contractors/${contractor.id}/edit`} className="font-medium underline">
                Add one now
              </Link>
            </p>
          </div>
        )}
      </div>

      {/* Personal Details */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Personal Details</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-sm font-medium text-gray-500">Date of Birth</p>
            <p className="text-sm text-gray-900">
              {contractor.dateOfBirth ? new Date(contractor.dateOfBirth).toLocaleDateString("en-GB") : "-"}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Address</p>
            <p className="text-sm text-gray-900">{contractor.address || "-"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Postcode</p>
            <p className="text-sm text-gray-900">{contractor.postcode || "-"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Next of Kin</p>
            <p className="text-sm text-gray-900">{contractor.nextOfKin || "-"}</p>
          </div>
          <div className="md:col-span-2">
            <p className="text-sm font-medium text-gray-500">Medical Notes</p>
            {contractor.medicalNotes ? (
              <details className="mt-1">
                <summary className="text-xs text-red-600 cursor-pointer hover:text-red-800 font-medium">
                  🔒 Confidential — click to reveal (Article 9 special category data)
                </summary>
                <p className="mt-2 text-sm text-gray-900 rounded-lg bg-red-50 border border-red-200 p-3">
                  {contractor.medicalNotes}
                </p>
              </details>
            ) : (
              <p className="text-sm text-gray-900">-</p>
            )}
          </div>
        </div>
      </div>

      {/* Portal Account */}
      <div className="rounded-xl border border-blue-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-blue-900 flex items-center gap-2">🔐 Portal Account</h2>
        <ContractorPortalStatus contractorId={contractor.id} />
      </div>
    </div>
  );
}
