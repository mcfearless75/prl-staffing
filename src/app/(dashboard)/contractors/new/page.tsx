export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { ContractorForm } from "@/components/contractor-form";
import { listActiveJobRoles } from "@/lib/job-roles";
import { createContractor } from "../actions";

export default async function NewContractorPage() {
  const [suppliers, jobRoles] = await Promise.all([
    prisma.supplier.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    listActiveJobRoles(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Add Contractor" />
      <ContractorForm suppliers={suppliers} jobRoles={jobRoles} action={createContractor} />
    </div>
  );
}
