export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { AssignmentForm } from "./assignment-form";

export default async function NewAssignmentPage() {
  const [contractors, projects, companies] = await Promise.all([
    prisma.contractor.findMany({
      select: { id: true, firstName: true, lastName: true },
      orderBy: { lastName: "asc" },
    }),
    prisma.project.findMany({
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true },
    }),
    prisma.company.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        sites: {
          where: { isActive: true },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            departments: {
              where: { isActive: true },
              orderBy: { name: "asc" },
              select: { id: true, name: true },
            },
          },
        },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="New Assignment" />
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <AssignmentForm contractors={contractors} companies={companies} projects={projects} />
      </div>
    </div>
  );
}
