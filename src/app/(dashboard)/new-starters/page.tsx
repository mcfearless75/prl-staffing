export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { listActiveJobRoles } from "@/lib/job-roles";
import { StarterChecklists } from "./starter-checklists";
import { PipelineBoard } from "./pipeline-board";
import { AddNewStarterButton } from "./add-new-starter-modal";
import Link from "next/link";
import { NEW_STARTER_STAGES, ONBOARDING_STAGES } from "@/lib/new-starter-pipeline";

/**
 * /new-starters has two tabs:
 *   - Pipeline (default): people staff have added with a job already agreed,
 *     from app invite until their documents are verified (Jen's "Scenario 1").
 *     After that they are Onboarding's job and show there (Jenni, 2026-10-08).
 *   - Starter checklists: HMRC starter declarations from the public form.
 */
export default async function NewStartersPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string; status?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const tab = params?.tab === "checklists" ? "checklists" : "pipeline";

  // Starter checklists (HMRC forms from the website) no longer have a tab
  // (Jenni, 2026-10-08 tidy-up). Only a link, and only when one is waiting.
  const newChecklists = tab === "pipeline" ? await prisma.newStarterSubmission.count({ where: { status: "New" } }) : 0;

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
        title="New Starters"
        description={
          tab === "pipeline"
            ? "People placed with a job agreed, from app invite until their documents are verified"
            : "HMRC starter declarations from the public new-starter form"
        }
        action={tab === "pipeline" ? <AddNewStarterButton companies={companies} roles={roles.map((r) => r.name)} /> : undefined}
      />

      {tab === "checklists" && (
        <Link href="/new-starters" className="text-sm font-medium text-blue-600 hover:underline">
          ← Back to New Starters
        </Link>
      )}
      {newChecklists > 0 && (
        <Link href="/new-starters?tab=checklists" className="block text-sm font-medium text-amber-700 hover:underline">
          {newChecklists} new starter checklist{newChecklists === 1 ? "" : "s"} from the website form to process →
        </Link>
      )}

      {tab === "pipeline" ? (
        <PipelineBoard
          stages={NEW_STARTER_STAGES}
          emptyText="No new starters waiting on documents. Use “+ Add new starter” to add one."
          elsewhere={{ stages: ONBOARDING_STAGES, label: "Onboarding", href: "/onboarding/submissions" }}
        />
      ) : (
        <StarterChecklists statusFilter={params?.status || ""} />
      )}
    </div>
  );
}
