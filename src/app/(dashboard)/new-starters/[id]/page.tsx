export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { formatDate } from "@/lib/utils";
import { NewStarterActions } from "../new-starter-actions";

const STATEMENT_LABELS: Record<string, string> = {
  A: "A — This is my first job since 6 April and I have not been receiving taxable benefits or a pension",
  B: "B — This is now my only job, but since 6 April I have had another job, or taxable benefits. I do not receive a pension",
  C: "C — I have another job or receive a State/Occupational pension",
};

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value || "—"}</dd>
    </div>
  );
}

export default async function NewStarterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const submission = await prisma.newStarterSubmission.findUnique({ where: { id } });
  if (!submission) notFound();

  const linkedContractor = submission.contractorId
    ? await prisma.contractor.findUnique({
        where: { id: submission.contractorId },
        select: { id: true, firstName: true, lastName: true, ref: true },
      })
    : null;

  const statusVariant =
    submission.status === "Processed"
      ? "Active"
      : submission.status === "Rejected"
        ? "Inactive"
        : "Pending";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${submission.firstName} ${submission.lastName}`}
        description={`New starter checklist submitted ${formatDate(submission.createdAt)}`}
        action={
          <Link
            href="/new-starters"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Back to list
          </Link>
        }
      />

      {/* Status banner */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <Badge variant={statusVariant}>{submission.status}</Badge>
        {submission.processedAt && (
          <span className="text-sm text-gray-500">
            {submission.status === "Processed" ? "Processed" : "Actioned"}{" "}
            {formatDate(submission.processedAt)}
            {submission.processedBy ? ` by ${submission.processedBy}` : ""}
          </span>
        )}
        {linkedContractor && (
          <Link
            href={`/contractors/${linkedContractor.id}`}
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            View subcontractor record
            {linkedContractor.ref ? ` (${linkedContractor.ref})` : ""} →
          </Link>
        )}
      </div>

      {/* Personal details */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Personal Details</h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="First Name" value={submission.firstName} />
          <Field label="Last Name" value={submission.lastName} />
          <Field label="Email" value={submission.email} />
          <Field label="Phone" value={submission.phone} />
          <Field label="Gender" value={submission.gender} />
          <Field label="Date of Birth" value={submission.dob} />
          <Field label="NI Number" value={submission.niNumber} />
          <Field label="Country" value={submission.country} />
        </dl>
      </div>

      {/* Address */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Address</h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Address" value={submission.address} />
          <Field label="City" value={submission.city} />
          <Field label="Postcode" value={submission.postcode} />
        </dl>
      </div>

      {/* Employment / HMRC */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Employment &amp; HMRC Declaration</h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Employment Start Date" value={submission.employmentStartDate} />
          <Field label="Employee Statement" value={submission.employeeStatement} />
        </dl>
        <p className="mt-3 rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs text-gray-600">
          {STATEMENT_LABELS[submission.employeeStatement] || "Statement not recognised."}
        </p>
        <div className="mt-4 border-t border-gray-100 pt-4">
          <Field label="Signed" value={submission.signature} />
        </div>
      </div>

      {/* Review actions */}
      <NewStarterActions
        submissionId={submission.id}
        status={submission.status}
        notes={submission.notes}
        name={`${submission.firstName} ${submission.lastName}`}
      />
    </div>
  );
}
