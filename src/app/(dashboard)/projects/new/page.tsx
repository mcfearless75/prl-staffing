export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { createProject } from "../actions";
import { ProjectForm } from "../project-form";

export default async function NewProjectPage() {
  const companies = await prisma.company.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Add Project" />

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <ProjectForm
          action={createProject}
          companies={companies}
          cancelHref="/projects"
          submitLabel="Create Project"
        />
      </div>
    </div>
  );
}
