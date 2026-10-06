"use client";

import { useActionState, useState } from "react";
import { updateMyDetails } from "./actions";

const inputCls =
  "mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

export function MyDetailsForm({ initial }: { initial: { phone: string; jobTitle: string } }) {
  const [state, formAction, pending] = useActionState(updateMyDetails, null);
  // Controlled, so React's post-action form reset doesn't blank what was just saved.
  const [jobTitle, setJobTitle] = useState(initial.jobTitle);
  const [phone, setPhone] = useState(initial.phone);

  return (
    <form action={formAction} className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        Job title
        <input
          name="jobTitle"
          type="text"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          maxLength={100}
          className={inputCls}
        />
      </label>
      <label className="block text-sm font-medium text-gray-700">
        Phone
        <input
          name="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="e.g. 07700 900123"
          maxLength={30}
          autoComplete="tel"
          className={inputCls}
        />
      </label>

      {state && (
        <p
          className={`rounded-lg border px-3 py-2 text-sm ${
            state.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {pending ? "Saving..." : "Save my details"}
      </button>
    </form>
  );
}
