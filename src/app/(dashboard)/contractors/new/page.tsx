export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { ContractorForm } from "@/components/contractor-form";
import { createContractor } from "../actions";

export default async function NewContractorPage() {
  const suppliers = await prisma.supplier.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Add Contractor" />
      <ContractorForm suppliers={suppliers} action={createContractor} />
    </div>
  );
}
