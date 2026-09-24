export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { AssignmentForm } from "../../assignment-form";
import { updateAssignment } from "../../actions";

export default async function EditAssignmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const fromContractor = (await searchParams)?.from === "contractor";

  const [assignment, contractors, companies, projects] = await Promise.all([
    prisma.assignment.findUnique({ where: { id } }),
    prisma.contractor.findMany({
      select: { id: true, firstName: true, lastName: true },
      orderBy: { lastName: "asc" },
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
    prisma.project.findMany({
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true },
    }),
  ]);

  if (!assignment) {
    notFound();
  }

  const updateAction = updateAssignment.bind(null, assignment.id);

  const toDateInputValue = (date: Date | null) => {
    if (!date) return "";
    return new Date(date).toISOString().split("T")[0];
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Edit Assignment" />

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <AssignmentForm
          contractors={contractors}
          companies={companies}
          projects={projects}
          action={updateAction}
          submitLabel="Update Assignment"
          cancelHref={
            fromContractor
              ? `/contractors/${assignment.contractorId}?tab=Assignments`
              : `/assignments/${assignment.id}`
          }
          returnTo={fromContractor ? "contractor" : undefined}
          defaultValues={{
            contractorId: assignment.contractorId,
            companyId: assignment.companyId,
            siteId: assignment.siteId,
            departmentId: assignment.departmentId,
            projectId: assignment.projectId,
            role: assignment.role,
            location: assignment.location,
            startDate: toDateInputValue(assignment.startDate),
            endDate: toDateInputValue(assignment.endDate),
            status: assignment.status,
            poNumber: assignment.poNumber,
            notes: assignment.notes,
            chargeRate: assignment.chargeRate,
            payRate: assignment.payRate,
            rateBasis: assignment.rateBasis,
            comparatorRate: assignment.comparatorRate,
            awrExempt: assignment.awrExempt,
            awrStartDate: toDateInputValue(assignment.awrStartDate),
          }}
        />
      </div>
    </div>
  );
}
