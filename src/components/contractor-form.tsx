"use client";

import Link from "next/link";

interface ContractorFormProps {
  contractor?: any;
  suppliers: Array<{ id: string; name: string }>;
  action: (formData: FormData) => Promise<void>;
}

export function ContractorForm({
  contractor,
  suppliers,
  action,
}: ContractorFormProps) {
  return (
    <form action={action}>
      <div className="rounded-xl border bg-white p-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* First Name */}
          <div>
            <label
              htmlFor="firstName"
              className="block text-sm font-medium text-gray-700"
            >
              First Name
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              required
              defaultValue={contractor?.firstName ?? ""}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Last Name */}
          <div>
            <label
              htmlFor="lastName"
              className="block text-sm font-medium text-gray-700"
            >
              Last Name
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              required
              defaultValue={contractor?.lastName ?? ""}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              defaultValue={contractor?.email ?? ""}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Phone */}
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700"
            >
              Phone
            </label>
            <input
              type="text"
              id="phone"
              name="phone"
              defaultValue={contractor?.phone ?? ""}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Job Title */}
          <div>
            <label
              htmlFor="jobTitle"
              className="block text-sm font-medium text-gray-700"
            >
              Job Title
            </label>
            <input
              type="text"
              id="jobTitle"
              name="jobTitle"
              defaultValue={contractor?.jobTitle ?? ""}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Day Rate */}
          <div>
            <label
              htmlFor="dayRate"
              className="block text-sm font-medium text-gray-700"
            >
              Day Rate
            </label>
            <input
              type="number"
              id="dayRate"
              name="dayRate"
              step="0.01"
              defaultValue={contractor?.dayRate ?? ""}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Pay Rate */}
          <div>
            <label
              htmlFor="payRate"
              className="block text-sm font-medium text-gray-700"
            >
              Pay Rate/hr
            </label>
            <input
              type="text"
              id="payRate"
              name="payRate"
              defaultValue={contractor?.payRate ?? ""}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Charge Rate */}
          <div>
            <label
              htmlFor="chargeRate"
              className="block text-sm font-medium text-gray-700"
            >
              Charge Rate/hr
            </label>
            <input
              type="text"
              id="chargeRate"
              name="chargeRate"
              defaultValue={contractor?.chargeRate ?? ""}
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
              defaultValue={contractor?.status ?? "Active"}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="On Hold">On Hold</option>
            </select>
          </div>

          {/* Supplier */}
          <div>
            <label
              htmlFor="supplierId"
              className="block text-sm font-medium text-gray-700"
            >
              Supplier
            </label>
            <select
              id="supplierId"
              name="supplierId"
              defaultValue={contractor?.supplierId ?? ""}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">No Supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>

          {/* NI Number */}
          <div>
            <label
              htmlFor="niNumber"
              className="block text-sm font-medium text-gray-700"
            >
              NI Number
            </label>
            <input
              type="text"
              id="niNumber"
              name="niNumber"
              defaultValue={contractor?.niNumber ?? ""}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* UTR Number */}
          <div>
            <label
              htmlFor="utrNumber"
              className="block text-sm font-medium text-gray-700"
            >
              UTR Number
            </label>
            <input
              type="text"
              id="utrNumber"
              name="utrNumber"
              defaultValue={contractor?.utrNumber ?? ""}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* IR35 Status */}
          <div>
            <label
              htmlFor="ir35Status"
              className="block text-sm font-medium text-gray-700"
            >
              IR35 Status
            </label>
            <select
              id="ir35Status"
              name="ir35Status"
              defaultValue={contractor?.ir35Status ?? "TBD"}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="Inside">Inside</option>
              <option value="Outside">Outside</option>
              <option value="TBD">TBD</option>
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
              defaultValue={contractor?.notes ?? ""}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <Link
            href="/contractors"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Save Contractor
          </button>
        </div>
      </div>
    </form>
  );
}
