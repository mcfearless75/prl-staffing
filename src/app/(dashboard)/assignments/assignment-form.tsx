"use client";

import { useEffect, useState, useActionState } from "react";
import Link from "next/link";
import type { AssignmentFormState } from "./actions";

type Dept = { id: string; name: string };
type Site = { id: string; name: string; departments: Dept[] };
type Company = { id: string; name: string; sites: Site[] };
type Contractor = { id: string; firstName: string; lastName: string };
type Project = { id: string; code: string; name: string };

type ComplianceRequirementSummary = { type: string; description: string | null; met: boolean };
type ComplianceSummary = {
  allMet: boolean;
  requirements: ComplianceRequirementSummary[];
  missingTypes: string[];
} | null;

// Statuses that trigger the compliance gate — must match assignments/actions.ts.
const GATED_STATUSES = new Set(["Placed", "Active"]);

export interface AssignmentDefaultValues {
  contractorId: string;
  companyId: string;
  siteId?: string | null;
  departmentId?: string | null;
  projectId?: string | null;
  role: string;
  location?: string | null;
  startDate: string; // yyyy-mm-dd
  endDate?: string | null;
  status: string;
  poNumber?: string | null;
  notes?: string | null;
  chargeRate?: number | null;
  payRate?: number | null;
  rateBasis?: string | null;
  comparatorRate?: number | null;
  awrExempt?: boolean;
  awrStartDate?: string | null; // yyyy-mm-dd
}

interface Props {
  contractors: Contractor[];
  companies: Company[];
  projects?: Project[];
  action: (prevState: AssignmentFormState, formData: FormData) => Promise<AssignmentFormState>;
  defaultValues?: AssignmentDefaultValues;
  submitLabel?: string;
  cancelHref: string;
}

export function AssignmentForm({
  contractors,
  companies,
  projects = [],
  action,
  defaultValues,
  submitLabel = "Create Assignment",
  cancelHref,
}: Props) {
  const [state, formAction, pending] = useActionState(action, null);

  const [selectedContractorId, setSelectedContractorId] = useState(defaultValues?.contractorId ?? "");
  const [selectedCompanyId, setSelectedCompanyId] = useState(defaultValues?.companyId ?? "");
  const [selectedSiteId, setSelectedSiteId] = useState(defaultValues?.siteId ?? "");
  const [role, setRole] = useState(defaultValues?.role ?? "");
  const [status, setStatus] = useState(defaultValues?.status ?? "Placed");

  const [compliance, setCompliance] = useState<ComplianceSummary>(null);
  const [complianceLoading, setComplianceLoading] = useState(false);

  const sites = companies.find((c) => c.id === selectedCompanyId)?.sites ?? [];
  const departments = sites.find((s) => s.id === selectedSiteId)?.departments ?? [];

  // Fetch the compliance summary whenever contractor, company, or role
  // changes — debounced so free-typing the role field doesn't spam requests.
  useEffect(() => {
    if (!selectedContractorId) {
      setCompliance(null);
      return;
    }

    const timer = setTimeout(() => {
      setComplianceLoading(true);
      const params = new URLSearchParams();
      if (role.trim()) params.set("role", role.trim());
      if (selectedCompanyId) params.set("companyId", selectedCompanyId);

      fetch(`/api/contractors/${selectedContractorId}/compliance-summary?${params.toString()}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setCompliance({ allMet: data.allMet, requirements: data.requirements, missingTypes: data.missingTypes });
          } else {
            setCompliance(null);
          }
        })
        .catch(() => setCompliance(null))
        .finally(() => setComplianceLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [selectedContractorId, selectedCompanyId, role]);

  const showOverride = !!compliance && !compliance.allMet && GATED_STATUSES.has(status);

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

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
            value={selectedContractorId}
            onChange={(e) => setSelectedContractorId(e.target.value)}
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
              onChange={(e) => setSelectedSiteId(e.target.value)}
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
              defaultValue={defaultValues?.departmentId ?? ""}
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
            value={role}
            onChange={(e) => setRole(e.target.value)}
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
            defaultValue={defaultValues?.location ?? ""}
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
            defaultValue={defaultValues?.startDate ?? ""}
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
            defaultValue={defaultValues?.endDate ?? ""}
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
            value={status}
            onChange={(e) => setStatus(e.target.value)}
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
            defaultValue={defaultValues?.poNumber ?? ""}
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
            defaultValue={defaultValues?.projectId ?? ""}
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
            defaultValue={defaultValues?.chargeRate ?? ""}
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
            defaultValue={defaultValues?.payRate ?? ""}
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
            defaultValue={defaultValues?.rateBasis ?? "Hourly"}
            className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="Hourly">Hourly</option>
            <option value="Daily">Daily</option>
          </select>
        </div>
      </div>

      {/* AWR (Agency Workers Regulations) */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h3 className="text-sm font-semibold text-gray-800">AWR</h3>
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="comparatorRate" className="block text-sm font-medium text-gray-700">
              Comparator rate (AWR)
            </label>
            <input
              type="number"
              step="0.01"
              id="comparatorRate"
              name="comparatorRate"
              defaultValue={defaultValues?.comparatorRate ?? ""}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. 20.00"
            />
          </div>

          <div>
            <label htmlFor="awrStartDate" className="block text-sm font-medium text-gray-700">
              AWR clock start override
            </label>
            <input
              type="date"
              id="awrStartDate"
              name="awrStartDate"
              defaultValue={defaultValues?.awrStartDate ?? ""}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                name="awrExempt"
                defaultChecked={defaultValues?.awrExempt ?? false}
                className="rounded border-gray-300"
              />
              AWR exempt (e.g. Swedish derogation)
            </label>
          </div>
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
          defaultValue={defaultValues?.notes ?? ""}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Additional notes..."
        />
      </div>

      {/* Compliance panel — fetched from /api/contractors/[id]/compliance-summary */}
      {selectedContractorId && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="text-sm font-semibold text-gray-800">Compliance check</h3>

          {complianceLoading && !compliance && (
            <p className="mt-1 text-xs text-gray-500">Checking compliance…</p>
          )}

          {compliance && compliance.requirements.length === 0 && (
            <p className="mt-1 text-xs text-gray-500">
              No mandatory compliance requirements apply to this role yet.
            </p>
          )}

          {compliance && compliance.requirements.length > 0 && (
            <ul className="mt-2 space-y-1">
              {compliance.requirements.map((req) => (
                <li key={req.type} className="flex items-center gap-2 text-xs">
                  <span
                    className={
                      req.met
                        ? "inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700"
                        : "inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700"
                    }
                  >
                    {req.met ? "Met" : "Unmet"}
                  </span>
                  <span className="text-gray-700">{req.type}</span>
                  {req.description && <span className="text-gray-400">— {req.description}</span>}
                </li>
              ))}
            </ul>
          )}

          {showOverride && (
            <div className="mt-4 space-y-2 border-t border-gray-200 pt-4">
              <p className="text-xs font-medium text-red-700">
                This contractor is missing mandatory compliance for a Placed/Active assignment. Saving will be
                blocked unless you override — the reason is recorded in the assignment notes.
              </p>
              <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
                <input type="checkbox" name="overrideCompliance" className="rounded border-gray-300" />
                Override compliance and proceed anyway
              </label>
              <div>
                <label htmlFor="complianceOverrideNote" className="block text-xs font-medium text-gray-700">
                  Override note <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="complianceOverrideNote"
                  name="complianceOverrideNote"
                  rows={2}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Reason for proceeding despite missing compliance..."
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 border-t border-gray-200 pt-6">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-60"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        <Link
          href={cancelHref}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
