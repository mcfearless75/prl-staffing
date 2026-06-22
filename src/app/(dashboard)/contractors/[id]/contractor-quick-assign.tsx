"use client";

import { useState } from "react";
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

export function ContractorQuickAssign({
  contractorId,
  companies,
}: {
  contractorId: string;
  companies: Company[];
}) {
  const [companyId, setCompanyId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedCompany = companies.find((c) => c.id === companyId);
  const selectedSite = selectedCompany?.sites.find((s) => s.id === siteId);

  const action = quickAssignContractorFromProfile.bind(null, contractorId);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    await action(formData);
    setCompanyId("");
    setSiteId("");
    setDepartmentId("");
    setLoading(false);
  }

  return (
    <form action={handleSubmit} className="mt-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
        Quick Assign
      </p>
      <div className="flex flex-wrap gap-3 items-end">
        {/* Company */}
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

        {/* Site */}
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

        {/* Department */}
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

        <button
          type="submit"
          disabled={!companyId || loading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Assigning..." : "Assign"}
        </button>
      </div>
    </form>
  );
}
