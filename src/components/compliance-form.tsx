"use client";

import Link from "next/link";
import { COMPLIANCE_TYPE_GROUPS } from "@/lib/compliance-types";

interface ComplianceFormProps {
  record?: any;
  contractors: Array<{ id: string; firstName: string; lastName: string }>;
  action: (formData: FormData) => Promise<void>;
  defaultContractorId?: string;
  backUrl?: string;
}

function toDateInputValue(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toISOString().split("T")[0];
}

export function ComplianceForm({
  record,
  contractors,
  action,
  defaultContractorId,
  backUrl,
}: ComplianceFormProps) {
  return (
    <form action={action}>
      <div className="rounded-xl border bg-white p-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Contractor */}
          <div>
            <label
              htmlFor="contractorId"
              className="block text-sm font-medium text-gray-700"
            >
              Contractor
            </label>
            <select
              id="contractorId"
              name="contractorId"
              required
              defaultValue={record?.contractorId ?? defaultContractorId ?? ""}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select a contractor</option>
              {contractors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div>
            <label
              htmlFor="type"
              className="block text-sm font-medium text-gray-700"
            >
              Type
            </label>
            <select
              id="type"
              name="type"
              required
              defaultValue={record?.type ?? ""}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select type</option>
              {COMPLIANCE_TYPE_GROUPS.map((group) => (
                <optgroup key={group.category} label={group.category}>
                  {group.types.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Document Name */}
          <div>
            <label
              htmlFor="documentName"
              className="block text-sm font-medium text-gray-700"
            >
              Document Name
            </label>
            <input
              type="text"
              id="documentName"
              name="documentName"
              defaultValue={record?.documentName ?? ""}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Reference Number */}
          <div>
            <label
              htmlFor="reference"
              className="block text-sm font-medium text-gray-700"
            >
              Reference Number
            </label>
            <input
              type="text"
              id="reference"
              name="reference"
              defaultValue={record?.reference ?? ""}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Issue Date */}
          <div>
            <label
              htmlFor="issueDate"
              className="block text-sm font-medium text-gray-700"
            >
              Issue Date
            </label>
            <input
              type="date"
              id="issueDate"
              name="issueDate"
              defaultValue={toDateInputValue(record?.issueDate)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Expiry Date */}
          <div>
            <label
              htmlFor="expiryDate"
              className="block text-sm font-medium text-gray-700"
            >
              Expiry Date
            </label>
            <input
              type="date"
              id="expiryDate"
              name="expiryDate"
              defaultValue={toDateInputValue(record?.expiryDate)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Status */}
          <div>
            <label
              htmlFor="status"
              className="block text-sm font-medium text-gray-700"
            >
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={record?.status ?? "Pending"}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="Verified">Verified</option>
              <option value="Pending">Pending</option>
              <option value="Expiring">Expiring</option>
              <option value="Expired">Expired</option>
              <option value="Non-Compliant">Non-Compliant</option>
            </select>
          </div>

          {/* Notes - full width */}
          <div className="md:col-span-2">
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-gray-700"
            >
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              defaultValue={record?.notes ?? ""}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <Link
            href={backUrl ?? "/compliance"}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Save Record
          </button>
        </div>
      </div>
    </form>
  );
}
