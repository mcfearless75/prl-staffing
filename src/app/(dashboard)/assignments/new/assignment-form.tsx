"use client";

import { useState } from "react";
import Link from "next/link";
import { createAssignment } from "../actions";

type Dept = { id: string; name: string };
type Site = { id: string; name: string; departments: Dept[] };
type Company = { id: string; name: string; sites: Site[] };
type Contractor = { id: string; firstName: string; lastName: string };
type Project = { id: string; code: string; name: string };

interface Props {
  contractors: Contractor[];
  companies: Company[];
  projects?: Project[];
}

export function AssignmentForm({ contractors, companies, projects = [] }: Props) {
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedSiteId, setSelectedSiteId] = useState("");

  const sites = companies.find((c) => c.id === selectedCompanyId)?.sites ?? [];
  const departments = sites.find((s) => s.id === selectedSiteId)?.departments ?? [];

  return (
    <form action={createAssignment} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

        {/* Contractor */}
        <div>
          <label htmlFor="contractorId" className="block text-sm font-medium text-gray-700">
            Contractor <span className="text-red-500">*</span>
          </label>
          <select
            id="contractorId"
            name="contractorId"
            required
            className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select a contractor</option>
            {contractors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName}
              </option>
            ))}
          </select>
        </div>

        {/* Company */}
        <div>
          <label htmlFor="companyId" className="block text-sm font-medium text-gray-700">
            Company <span className="text-red-500">*</span>
          </label>
          <select
            id="companyId"
            name="companyId"
            required
            value={selectedCompanyId}
            onChange={(e) => {
              setSelectedCompanyId(e.target.value);
              setSelectedSiteId("");
            }}
            className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select a company</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Site — only shown if company has sites */}
        {sites.length > 0 && (
          <div>
            <label htmlFor="siteId" className="block text-sm font-medium text-gray-700">
              Site
            </label>
            <select
              id="siteId"
              name="siteId"
              value={selectedSiteId}
              onChange={(e) => {
                setSelectedSiteId(e.target.value);
              }}
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">No specific site</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Department — only shown if site selected and has departments */}
        {selectedSiteId && departments.length > 0 && (
          <div>
            <label htmlFor="departmentId" className="block text-sm font-medium text-gray-700">
              Department
            </label>
            <select
              id="departmentId"
              name="departmentId"
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">No specific department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Role */}
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700">
            Role <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="role"
            name="role"
            required
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="e.g. Rigger, Electrician"
          />
        </div>

        {/* Location */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700">
            Location
          </label>
          <input
            type="text"
            id="location"
            name="location"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="e.g. Protos, Ellesmere Port"
          />
        </div>

        {/* Start Date */}
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
            Start Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            required
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* End Date */}
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
            End Date
          </label>
          <input
            type="date"
            id="endDate"
            name="endDate"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Status */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue="Placed"
            className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="Placed">Placed</option>
            <option value="Active">Active</option>
            <option value="Ending">Ending</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        {/* PO Number */}
        <div>
          <label htmlFor="poNumber" className="block text-sm font-medium text-gray-700">
            PO Number
          </label>
          <input
            type="text"
            id="poNumber"
            name="poNumber"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="e.g. PO-2024-001"
          />
        </div>

        {/* Project */}
        <div>
          <label htmlFor="projectId" className="block text-sm font-medium text-gray-700">
            Project
          </label>
          <select
            id="projectId"
            name="projectId"
            className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
            ))}
          </select>
        </div>

        {/* Charge Rate */}
        <div>
          <label htmlFor="chargeRate" className="block text-sm font-medium text-gray-700">
            Charge Rate (£)
          </label>
          <input
            type="number"
            step="0.01"
            id="chargeRate"
            name="chargeRate"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="e.g. 25.00"
          />
        </div>

        {/* Pay Rate */}
        <div>
          <label htmlFor="payRate" className="block text-sm font-medium text-gray-700">
            Pay Rate (£)
          </label>
          <input
            type="number"
            step="0.01"
            id="payRate"
            name="payRate"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="e.g. 18.00"
          />
        </div>

        {/* Rate Basis */}
        <div>
          <label htmlFor="rateBasis" className="block text-sm font-medium text-gray-700">
            Rate Basis
          </label>
          <select
            id="rateBasis"
            name="rateBasis"
            defaultValue="Hourly"
            className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="Hourly">Hourly</option>
            <option value="Daily">Daily</option>
          </select>
        </div>

        {/* Value */}
        <div>
          <label htmlFor="value" className="block text-sm font-medium text-gray-700">
            Value (£)
          </label>
          <input
            type="number"
            step="0.01"
            id="value"
            name="value"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="e.g. 5000.00"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Additional notes..."
        />
      </div>

      <div className="flex items-center gap-3 border-t border-gray-200 pt-6">
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          Create Assignment
        </button>
        <Link
          href="/assignments"
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
