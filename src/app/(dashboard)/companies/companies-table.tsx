"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/badge";

type Company = {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  isActive: boolean;
};

export function CompaniesTable({ companies }: { companies: Company[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const allChecked = companies.length > 0 && selected.size === companies.length;
  const someChecked = selected.size > 0 && !allChecked;

  function toggleAll() {
    if (allChecked) {
      setSelected(new Set());
    } else {
      setSelected(new Set(companies.map((c) => c.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDelete() {
    if (selected.size === 0) return;
    if (
      !confirm(
        `Delete ${selected.size} company${selected.size > 1 ? " companies" : ""}? This cannot be undone.`
      )
    )
      return;

    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/companies/bulk-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Delete failed");
      } else {
        setSelected(new Set());
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3">
      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5">
          <span className="text-sm font-medium text-red-800">
            {selected.size} selected
          </span>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {isPending ? "Deleting..." : `Delete ${selected.size}`}
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={(el) => {
                    if (el) el.indeterminate = someChecked;
                  }}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Contact Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Contact Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Active</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {companies.map((company) => (
              <tr
                key={company.id}
                className={`transition-colors ${selected.has(company.id) ? "bg-red-50" : "hover:bg-gray-50"}`}
              >
                <td className="w-10 px-4 py-4">
                  <input
                    type="checkbox"
                    checked={selected.has(company.id)}
                    onChange={() => toggleOne(company.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{company.name}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{company.contactName || "—"}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{company.contactEmail || "—"}</td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{company.contactPhone || "—"}</td>
                <td className="whitespace-nowrap px-6 py-4">
                  <Badge variant={company.isActive ? "Active" : "Inactive"}>
                    {company.isActive ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right">
                  <Link
                    href={`/companies/${company.id}`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
