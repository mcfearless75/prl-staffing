export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { updateProject } from "../../actions";
import { ProjectForm } from "../../project-form";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [project, companies] = await Promise.all([
    prisma.project.findUnique({ where: { id } }),
    prisma.company.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!project) {
    notFound();
  }

  const updateAction = updateProject.bind(null, project.id);

  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${project.name}`} />

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <ProjectForm
          action={updateAction}
          companies={companies}
          project={{
            code: project.code,
            name: project.name,
            companyId: project.companyId,
            siteAddress: project.siteAddress,
            costCode: project.costCode,
            status: project.status,
            notes: project.notes,
          }}
          cancelHref={`/projects/${project.id}`}
          submitLabel="Update Project"
        />
      </div>
    </div>
  );
}
