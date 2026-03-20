export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { ComplianceForm } from "@/components/compliance-form";
import { createComplianceRecord } from "../actions";

export default async function NewComplianceRecordPage() {
  const contractors = await prisma.contractor.findMany({
    select: { id: true, firstName: true, lastName: true },
    orderBy: { lastName: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Add Compliance Record" />
      <ComplianceForm contractors={contractors} action={createComplianceRecord} />
    </div>
  );
}
