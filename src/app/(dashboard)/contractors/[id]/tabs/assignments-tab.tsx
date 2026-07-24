import { ContractorQuickAssign } from "../contractor-quick-assign";
import { AssignmentsPanel } from "../assignments-panel";
import type { ContractorWithRelations, CompanyWithSites, ProjectOption } from "./types";

export function AssignmentsTab({
  contractorId,
  assignments,
  companies,
  projects,
}: {
  contractorId: string;
  assignments: ContractorWithRelations["assignments"];
  companies: CompanyWithSites[];
  projects: ProjectOption[];
}) {
  return (
    <div className="rounded-xl border bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Assignments</h2>
      <ContractorQuickAssign contractorId={contractorId} companies={companies} projects={projects} />
      <div className="mt-4">
        <AssignmentsPanel assignments={assignments} />
      </div>
    </div>
  );
}
