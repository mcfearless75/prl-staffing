export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { ContractorForm } from "@/components/contractor-form";
import { updateContractor } from "../../actions";

export default async function EditContractorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [contractor, suppliers] = await Promise.all([
    prisma.contractor.findUnique({ where: { id } }),
    prisma.supplier.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!contractor) {
    notFound();
  }

  const updateAction = updateContractor.bind(null, contractor.id);

  return (
    <div className="space-y-6">
      <PageHeader title="Edit Contractor" />
      <ContractorForm
        contractor={contractor}
        suppliers={suppliers}
        action={updateAction}
      />
    </div>
  );
}
