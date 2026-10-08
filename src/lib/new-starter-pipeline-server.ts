import { prisma } from "@/lib/db";
import { agreementState, derivePipelineStage, pipelineActions } from "@/lib/new-starter-pipeline";

/**
 * Open placements (not completed, not cancelled) with their stage and next
 * actions. Shared by the board on /new-starters and /onboarding/submissions and
 * by the sidebar badges, so a page and its badge always agree on who is where.
 */
export async function loadPipelineRows() {
  const placements = await prisma.newStarterPlacement.findMany({
    where: { completedAt: null, cancelledAt: null },
    orderBy: { startDate: "asc" },
    include: {
      company: { select: { name: true } },
      site: { select: { name: true } },
      contractor: {
        select: {
          id: true, firstName: true, lastName: true, email: true, phone: true, status: true, inviteSentAt: true,
          _count: { select: { compliances: { where: { status: "Pending" } } } },
        },
      },
    },
  });

  const agreementIds = placements.map((p) => p.supplyAgreementId).filter((id): id is string => Boolean(id));
  const agreements = agreementIds.length
    ? await prisma.supplyAgreement.findMany({
        where: { id: { in: agreementIds } },
        select: { id: true, createdAt: true, signedAt: true, signedName: true },
      })
    : [];
  const agreementById = new Map(agreements.map((a) => [a.id, a]));

  return placements.map((p) => {
    const agreement = p.supplyAgreementId ? agreementById.get(p.supplyAgreementId) ?? null : null;
    const snapshot = {
      contractorStatus: p.contractor.status,
      pendingDocCount: p.contractor._count.compliances,
      agreement,
      inductionRequired: p.inductionRequired,
    };
    return { p, agreement, stage: derivePipelineStage(snapshot), actions: pipelineActions(snapshot), agreementState: agreementState(agreement) };
  });
}

export type PipelineRow = Awaited<ReturnType<typeof loadPipelineRows>>[number];
