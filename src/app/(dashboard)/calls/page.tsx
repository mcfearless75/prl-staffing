export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";
import {
  CALL_ENQUIRY_CATEGORIES,
  CALL_ENQUIRY_STATUSES,
  categoryLabel,
  type CallEnquiryCategory,
} from "@/lib/calls/constants";

function buildHref(status: string, category: string): string {
  const params = new URLSearchParams();
  if (status && status !== "All") params.set("status", status);
  if (category && category !== "All") params.set("category", category);
  const qs = params.toString();
  return qs ? `/calls?${qs}` : "/calls";
}

export default async function CallsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; category?: string }>;
}) {
  const guard = await requireStaff();
  if (!guard.ok) redirect("/login");

  const params = searchParams ? await searchParams : {};
  const statusFilter = params?.status || "";
  const categoryFilter = params?.category || "";

  const where: Prisma.CallEnquiryWhereInput = {};
  if (statusFilter && statusFilter !== "All") where.status = statusFilter;
  if (categoryFilter && categoryFilter !== "All") where.category = categoryFilter;

  const enquiries = await prisma.callEnquiry.findMany({
    where,
    orderBy: { receivedAt: "desc" },
    select: {
      id: true,
      receivedAt: true,
      category: true,
      urgent: true,
      callerName: true,
      callerPhone: true,
      reason: true,
      status: true,
    },
  });

  const statuses = ["All", ...CALL_ENQUIRY_STATUSES];
  const categories = ["All", ...CALL_ENQUIRY_CATEGORIES];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Call Enquiries</h1>

      <div className="flex gap-2 mb-3 flex-wrap">
        {statuses.map((s) => (
          <Link
            key={s}
            href={buildHref(s, categoryFilter)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              (statusFilter || "All") === s ? "bg-prism-ink text-prism-paper" : "bg-gray-100 text-gray-700"
            }`}
          >
            {s}
          </Link>
        ))}
      </div>
      <div className="flex gap-2 mb-6 flex-wrap">
        {categories.map((c) => (
          <Link
            key={c}
            href={buildHref(statusFilter, c)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              (categoryFilter || "All") === c ? "bg-prism-ink text-prism-paper" : "bg-gray-50 text-gray-600"
            }`}
          >
            {c === "All" ? "All" : categoryLabel(c as CallEnquiryCategory)}
          </Link>
        ))}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b">
            <th className="py-2">Received</th>
            <th>Category</th>
            <th>Caller</th>
            <th>Reason</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {enquiries.map((e) => (
            <tr key={e.id} className="border-b hover:bg-gray-50">
              <td className="py-2">
                <Link href={`/calls/${e.id}`} className="block">
                  {e.receivedAt.toLocaleString("en-GB")}
                </Link>
              </td>
              <td>
                {e.urgent && e.category !== "URGENT" ? (
                  <span className="mr-1 inline-flex items-center rounded-full bg-prism-warn/10 px-2 py-0.5 text-xs font-semibold text-prism-warn">
                    URGENT
                  </span>
                ) : null}
                {categoryLabel(e.category as CallEnquiryCategory)}
              </td>
              <td>
                {e.callerName || "—"} {e.callerPhone ? `(${e.callerPhone})` : ""}
              </td>
              <td className="max-w-xs truncate">{e.reason}</td>
              <td>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    e.status === "Actioned" ? "bg-prism-ok/10 text-prism-ok" : "bg-prism-warn/10 text-prism-warn"
                  }`}
                >
                  {e.status}
                </span>
              </td>
            </tr>
          ))}
          {enquiries.length === 0 && (
            <tr>
              <td colSpan={5} className="py-6 text-center text-gray-400">
                No call enquiries yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
