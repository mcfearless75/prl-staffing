export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { ComplianceForm } from "@/components/compliance-form";
import {
  createComplianceRecord,
  createComplianceRecordFromProfile,
  createComplianceRecordForUpload,
} from "../actions";

export default async function NewComplianceRecordPage({
  searchParams,
}: {
  searchParams?: Promise<{ contractorId?: string }>;
}) {
  const params = await searchParams;
  const defaultContractorId = params?.contractorId;

  const contractors = await prisma.contractor.findMany({
    select: { id: true, firstName: true, lastName: true },
    orderBy: { lastName: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Add Compliance Record" />
      <ComplianceForm
        contractors={contractors}
        action={defaultContractorId ? createComplianceRecordFromProfile : createComplianceRecord}
        createForUpload={createComplianceRecordForUpload.bind(null, Boolean(defaultContractorId))}
        defaultContractorId={defaultContractorId}
        backUrl={defaultContractorId ? `/contractors/${defaultContractorId}` : "/compliance"}
      />
    </div>
  );
}
