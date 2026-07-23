"use client";

import { useActionState, useState, useEffect } from "react";
import { quickAssignContractorFromProfile } from "../actions";

interface Department {
  id: string;
  name: string;
}

interface Site {
  id: string;
  name: string;
  departments: Department[];
}

interface Company {
  id: string;
  name: string;
  sites: Site[];
}

interface Project {
  id: string;
  code: string;
  name: string;
}

export function ContractorQuickAssign({
  contractorId,
  companies,
  projects = [],
}: {
  contractorId: string;
  companies: Company[];
  projects?: Project[];
}) {
  const [companyId, setCompanyId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [departmentId, setDepartmentId] = useState("");

  const [state, formAction, pending] = useActionState(quickAssignContractorFromProfile, null);

  const selectedCompany = companies.find((c) => c.id === companyId);
  const selectedSite = selectedCompany?.sites.find((s) => s.id === siteId);

  useEffect(() => {
    if (state?.type === "ok" || state?.type === "moved") {
      setCompanyId("");
      setSiteId("");
      setDepartmentId("");
    }
  }, [state]);

  const bannerStyle =
    state?.type === "duplicate" || state?.type === "error"
      ? "bg-amber-50 border border-amber-300 text-amber-800"
      : state?.type === "moved"
        ? "bg-blue-50 border border-blue-300 text-blue-800"
        : "bg-green-50 border border-green-300 text-green-800";

  return (
    <div className="mt-4">
      {state?.message && (
        <div className={`mb-2 rounded-lg px-3 py-2 text-xs font-medium ${bannerStyle}`}>
          {state.message}
        </div>
      )}
      <form action={formAction} className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
        <input type="hidden" name="contractorId" value={contractorId} />
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Quick Assign
        </p>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">Company</label>
            <select
              name="companyId"
              value={companyId}
              onChange={(e) => { setCompanyId(e.target.value); setSiteId(""); setDepartmentId(""); }}
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">Select company...</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">Site</label>
            <select
              name="siteId"
              value={siteId}
              onChange={(e) => { setSiteId(e.target.value); setDepartmentId(""); }}
              disabled={!selectedCompany || selectedCompany.sites.length === 0}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
            >
              <option value="">Any site</option>
              {selectedCompany?.sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
            <select
              name="departmentId"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              disabled={!selectedSite || selectedSite.departments.length === 0}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
            >
              <option value="">Any dept</option>
              {selectedSite?.departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[120px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select
              name="status"
              defaultValue="Active"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="Placed">Placed</option>
              <option value="Active">Active</option>
              <option value="Ending">Ending</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">Project</label>
            <select
              name="projectId"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
              ))}
            </select>
          </div>

          <div className="w-24">
            <label className="block text-xs font-medium text-gray-600 mb-1">Charge £</label>
            <input
              type="number"
              step="0.01"
              name="chargeRate"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="w-24">
            <label className="block text-xs font-medium text-gray-600 mb-1">Pay £</label>
            <input
              type="number"
              step="0.01"
              name="payRate"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="w-28">
            <label className="block text-xs font-medium text-gray-600 mb-1">Basis</label>
            <select
              name="rateBasis"
              defaultValue="Hourly"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="Hourly">Hourly</option>
              <option value="Daily">Daily</option>
            </select>
          </div>

          <div className="w-24">
            <label className="block text-xs font-medium text-gray-600 mb-1">Value £</label>
            <input
              type="number"
              step="0.01"
              name="value"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={!companyId || pending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {pending ? "Assigning..." : "Assign"}
          </button>
        </div>
      </form>
    </div>
  );
}
