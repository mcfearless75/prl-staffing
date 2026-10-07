export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { listActiveJobRoles } from "@/lib/job-roles";
import { StarterChecklists } from "./starter-checklists";
import { PipelineBoard } from "./pipeline-board";
import { AddNewStarterButton } from "./add-new-starter-modal";
import { OnboardingTabs } from "@/components/onboarding-tabs";

/**
 * /new-starters has two tabs:
 *   - Pipeline (default): people staff have added with a job already agreed,
 *     from app invite through to ready-to-start (Jen's "Scenario 1").
 *   - Starter checklists: HMRC starter declarations from the public form.
 */
export default async function NewStartersPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string; status?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const tab = params?.tab === "checklists" ? "checklists" : "pipeline";

  const [companies, roles] =
    tab === "pipeline"
      ? await Promise.all([
          prisma.company.findMany({
            where: { isActive: true },
            select: { id: true, name: true, sites: { where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } } },
            orderBy: { name: "asc" },
          }),
          listActiveJobRoles(),
        ])
      : [[], []];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Onboarding"
        description={
          tab === "pipeline"
            ? "New starters: people placed with a job agreed, from app invite to ready to start"
            : "HMRC starter declarations from the public new-starter form"
        }
        action={tab === "pipeline" ? <AddNewStarterButton companies={companies} roles={roles.map((r) => r.name)} /> : undefined}
      />

      <OnboardingTabs active={tab === "pipeline" ? "new-starters" : "checklists"} />

      {tab === "pipeline" ? <PipelineBoard /> : <StarterChecklists statusFilter={params?.status || ""} />}
    </div>
  );
}
