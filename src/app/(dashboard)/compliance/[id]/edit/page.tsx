export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { ComplianceForm } from "@/components/compliance-form";
import { updateComplianceRecord } from "../../actions";

export default async function EditComplianceRecordPage({
  params,
}: {
  params: { id: string };
}) {
  const [record, contractors] = await Promise.all([
    prisma.complianceRecord.findUnique({
      where: { id: params.id },
    }),
    prisma.contractor.findMany({
      select: { id: true, firstName: true, lastName: true },
      orderBy: { lastName: "asc" },
    }),
  ]);

  if (!record) {
    notFound();
  }

  const updateAction = updateComplianceRecord.bind(null, record.id);

  return (
    <div className="space-y-6">
      <PageHeader title="Edit Compliance Record" />
      <ComplianceForm
        record={record}
        contractors={contractors}
        action={updateAction}
      />
    </div>
  );
}
