"use client";

import { useState } from "react";

type Contractor = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

type ErasureRequest = {
  id: string;
  contractorId: string | null;
  email: string;
  requestedBy: string;
  reason: string | null;
  status: string;
  processedBy: string | null;
  processedAt: Date | string | null;
  notes: string | null;
  createdAt: string;
};

export function GdprClientPage({
  contractors,
  erasureRequests: initialRequests,
  isAdmin,
  userEmail,
}: {
  contractors: Contractor[];
  erasureRequests: ErasureRequest[];
  isAdmin: boolean;
  userEmail: string;
}) {
  const [sarContractorId, setSarContractorId] = useState("");
  const [sarLoading, setSarLoading] = useState(false);

  const [erasureContractorId, setErasureContractorId] = useState("");
  const [erasureReason, setErasureReason] = useState("");
  const [erasureLoading, setErasureLoading] = useState(false);

  const [erasureRequests, setErasureRequests] = useState(initialRequests);
  const [executingId, setExecutingId] = useState<string | null>(null);

  async function handleSarExport() {
    if (!sarContractorId) return;
    setSarLoading(true);
    try {
      const res = await fetch(`/api/gdpr/sar?contractorId=${sarContractorId}`);
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to generate SAR export");
        return;
      }

      const disposition = res.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || "sar-export.json";

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to generate SAR export");
    } finally {
      setSarLoading(false);
    }
  }

  async function handleNewErasureRequest() {
    if (!erasureContractorId) return;
    setErasureLoading(true);
    try {
      const res = await fetch("/api/gdpr/erasure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractorId: erasureContractorId,
          reason: erasureReason || undefined,
          requestedBy: userEmail,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to create erasure request");
        return;
      }

      const data = await res.json();
      setErasureRequests((prev) => [data.erasureRequest, ...prev]);
      setErasureContractorId("");
      setErasureReason("");
    } catch {
      alert("Failed to create erasure request");
    } finally {
      setErasureLoading(false);
    }
  }

  async function handleExecuteErasure(erasureRequestId: string) {
    if (
      !confirm(
        "WARNING: This will permanently anonymise this contractor's data and delete their documents. This action cannot be undone. Continue?"
      )
    ) {
      return;
    }

    setExecutingId(erasureRequestId);
    try {
      const res = await fetch("/api/gdpr/erasure/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ erasureRequestId }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to execute erasure");
        return;
      }

      // Update the local state
      setErasureRequests((prev) =>
        prev.map((r) =>
          r.id === erasureRequestId
            ? { ...r, status: "Completed", processedBy: userEmail, processedAt: new Date().toISOString() }
            : r
        )
      );
    } catch {
      alert("Failed to execute erasure");
    } finally {
      setExecutingId(null);
    }
  }

  function formatDate(dateStr: string) {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(dateStr));
  }

  const statusColour: Record<string, string> = {
    Pending: "bg-yellow-100 text-yellow-800",
    Approved: "bg-blue-100 text-blue-800",
    Completed: "bg-green-100 text-green-800",
    Rejected: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-6">
      {/* Subject Access Requests */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          Subject Access Requests
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Generate a full data export for a contractor under GDPR Article 15.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={sarContractorId}
            onChange={(e) => setSarContractorId(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">Select contractor...</option>
            {contractors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.lastName}, {c.firstName} ({c.email})
              </option>
            ))}
          </select>
          <button
            onClick={handleSarExport}
            disabled={!sarContractorId || sarLoading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {sarLoading ? "Generating..." : "Generate SAR Export"}
          </button>
        </div>
      </div>

      {/* Erasure Requests */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          Erasure Requests
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Manage Right to Erasure requests under GDPR Article 17.
        </p>

        {/* New Request Form */}
        <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            New Erasure Request
          </h3>
          <div className="flex flex-col gap-3">
            <select
              value={erasureContractorId}
              onChange={(e) => setErasureContractorId(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">Select contractor...</option>
              {contractors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.lastName}, {c.firstName} ({c.email})
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Reason for erasure request (optional)"
              value={erasureReason}
              onChange={(e) => setErasureReason(e.target.value)}
              className="rounded-lg border border-gray-300 py-2 px-3 text-sm focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={handleNewErasureRequest}
              disabled={!erasureContractorId || erasureLoading}
              className="self-start rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {erasureLoading ? "Submitting..." : "Submit Erasure Request"}
            </button>
          </div>
        </div>

        {/* Requests Table */}
        {erasureRequests.length === 0 ? (
          <p className="text-sm text-gray-500">No erasure requests found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <th className="pb-3 pr-4">Email</th>
                  <th className="pb-3 pr-4">Requested By</th>
                  <th className="pb-3 pr-4">Reason</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Date</th>
                  {isAdmin && <th className="pb-3">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {erasureRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="py-3 pr-4 font-medium text-gray-900">
                      {req.email}
                    </td>
                    <td className="py-3 pr-4 text-gray-600">
                      {req.requestedBy}
                    </td>
                    <td className="py-3 pr-4 text-gray-600 max-w-[200px] truncate">
                      {req.reason || "-"}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          statusColour[req.status] || "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-gray-600 whitespace-nowrap">
                      {formatDate(req.createdAt)}
                    </td>
                    {isAdmin && (
                      <td className="py-3">
                        {req.status === "Pending" && (
                          <button
                            onClick={() => handleExecuteErasure(req.id)}
                            disabled={executingId === req.id}
                            className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            {executingId === req.id
                              ? "Executing..."
                              : "Execute"}
                          </button>
                        )}
                        {req.status === "Completed" && (
                          <span className="text-xs text-gray-500">
                            {req.processedBy}
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
