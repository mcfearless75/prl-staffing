"use client";

import { useActionState, useState } from "react";
import { updateAssignmentSiteDept } from "./sites/actions";

interface Dept { id: string; name: string }
interface Site { id: string; name: string; departments: Dept[] }

export function AssignmentSitePicker({
  assignmentId,
  companyId,
  sites,
}: {
  assignmentId: string;
  companyId: string;
  sites: Site[];
}) {
  const [siteId, setSiteId] = useState("");
  const [deptId, setDeptId] = useState("");
  const [state, formAction, pending] = useActionState(updateAssignmentSiteDept, null);

  const selectedSite = sites.find((s) => s.id === siteId);

  if (state?.type === "ok") {
    return <span className="text-xs text-green-600 font-medium">Moved — refresh to see</span>;
  }

  return (
    <form action={formAction} className="flex items-center gap-1.5 flex-wrap">
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="siteId" value={siteId} />
      <input type="hidden" name="departmentId" value={deptId} />
      <select
        value={siteId}
        onChange={(e) => { setSiteId(e.target.value); setDeptId(""); }}
        className="rounded border border-gray-300 bg-white px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
      >
        <option value="">Site...</option>
        {sites.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <select
        value={deptId}
        onChange={(e) => setDeptId(e.target.value)}
        disabled={!selectedSite || selectedSite.departments.length === 0}
        className="rounded border border-gray-300 bg-white px-2 py-1 text-xs focus:border-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
      >
        <option value="">Dept...</option>
        {selectedSite?.departments.map((d) => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>
      <button
        type="submit"
        disabled={!siteId || pending}
        className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
      >
        {pending ? "..." : "Move"}
      </button>
      {state?.type === "error" && (
        <span className="text-xs text-red-600">{state.message}</span>
      )}
    </form>
  );
}
