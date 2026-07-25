"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { JobRole } from "@prisma/client";
import type { JobRoleFormState } from "../../actions";

const inputClass =
  "mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
const labelClass = "block text-sm font-medium text-gray-700";

interface EditJobRoleFormProps {
  jobRole: JobRole;
  action: (prevState: JobRoleFormState, formData: FormData) => Promise<JobRoleFormState>;
}

export function EditJobRoleForm({ jobRole, action }: EditJobRoleFormProps) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <form action={formAction} className="space-y-6">
        {state?.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        )}

        <div>
          <label htmlFor="name" className={labelClass}>
            Role Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            defaultValue={jobRole.name}
            className={inputClass}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="active"
            name="active"
            defaultChecked={jobRole.active}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="active" className="text-sm font-medium text-gray-700">
            Active (uncheck to archive — archived roles stay linked to existing contractors but drop out of new-selection lists)
          </label>
        </div>

        <div className="flex items-center gap-3 border-t border-gray-200 pt-6">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? "Saving..." : "Update Role"}
          </button>
          <Link
            href="/job-roles"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
