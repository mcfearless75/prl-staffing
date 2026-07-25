export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { updateJobRole } from "../../actions";
import { EditJobRoleForm } from "./edit-job-role-form";

export default async function EditJobRolePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const jobRole = await prisma.jobRole.findUnique({ where: { id } });
  if (!jobRole) notFound();

  const updateAction = updateJobRole.bind(null, jobRole.id);

  return (
    <div className="space-y-6">
      <PageHeader title="Edit Job Role" />
      <EditJobRoleForm jobRole={jobRole} action={updateAction} />
    </div>
  );
}
