export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";
import { categoryLabel, type CallEnquiryCategory } from "@/lib/calls/constants";
import { markActioned } from "../actions";

export default async function CallDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const guard = await requireStaff();
  if (!guard.ok) redirect("/login");

  const { id } = await params;
  const enquiry = await prisma.callEnquiry.findUnique({ where: { id } });
  if (!enquiry) notFound();

  const boundMarkActioned = markActioned.bind(null, enquiry.id);

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-semibold mb-2">
        {enquiry.urgent && enquiry.category !== "URGENT" ? (
          <span className="text-red-600">URGENT — </span>
        ) : null}
        {categoryLabel(enquiry.category as CallEnquiryCategory)}
      </h1>
      <p className="text-gray-500 mb-6">{enquiry.receivedAt.toLocaleString("en-GB")}</p>

      <dl className="grid grid-cols-[140px_1fr] gap-y-2 mb-6 text-sm">
        <dt className="text-gray-500">Caller</dt>
        <dd>{enquiry.callerName || "Not given"}</dd>
        <dt className="text-gray-500">Phone</dt>
        <dd>{enquiry.callerPhone || "Not given"}</dd>
        <dt className="text-gray-500">Contractor hint</dt>
        <dd>{enquiry.contractorIdHint || "—"}</dd>
        <dt className="text-gray-500">Reason</dt>
        <dd>{enquiry.reason}</dd>
        <dt className="text-gray-500">Summary</dt>
        <dd>{enquiry.summary}</dd>
        <dt className="text-gray-500">Status</dt>
        <dd>
          {enquiry.status}
          {enquiry.actionedBy ? ` by ${enquiry.actionedBy}` : ""}
        </dd>
      </dl>

      <h2 className="text-lg font-medium mb-2">Transcript</h2>
      <pre className="whitespace-pre-wrap bg-gray-50 border rounded p-4 text-sm mb-6">
        {enquiry.transcript}
      </pre>

      {enquiry.status !== "Actioned" && (
        <form action={boundMarkActioned}>
          <button type="submit" className="rounded bg-blue-600 text-white px-4 py-2 text-sm font-medium">
            Mark actioned
          </button>
        </form>
      )}
    </div>
  );
}
