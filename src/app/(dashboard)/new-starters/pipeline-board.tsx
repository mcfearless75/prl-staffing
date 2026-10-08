import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { agreementDate } from "@/lib/supply-agreement-html";
import { PIPELINE_STAGE_LABELS, type PipelineStage } from "@/lib/new-starter-pipeline";
import { loadPipelineRows } from "@/lib/new-starter-pipeline-server";
import { PipelineRowActions } from "./pipeline-row-actions";

const STAGE_STYLE: Record<PipelineStage, string> = {
  invited: "border-sky-200 bg-sky-50 text-sky-800",
  docs: "border-amber-200 bg-amber-50 text-amber-800",
  onboarding: "border-violet-200 bg-violet-50 text-violet-800",
  induction: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

function ukDay(d: Date): string {
  return d.toLocaleDateString("en-GB", { timeZone: "Europe/London" });
}

/**
 * Open placements (not completed, not cancelled), grouped by stage. Shows only
 * `stages`: New Starters shows invited/docs, Onboarding shows the agreement and
 * induction stages (Jenni, 2026-10-08). `elsewhere` links to the other half.
 */
export async function PipelineBoard({
  stages,
  emptyText,
  elsewhere,
}: {
  stages: readonly PipelineStage[];
  /** Shown when nobody is in these stages; leave out to show nothing at all. */
  emptyText?: string;
  elsewhere?: { stages: readonly PipelineStage[]; label: string; href: string };
}) {
  const all = await loadPipelineRows();
  const rows = all.filter((r) => stages.includes(r.stage));
  const elsewhereCount = elsewhere ? all.filter((r) => elsewhere.stages.includes(r.stage)).length : 0;
  const elsewhereLink =
    elsewhere && elsewhereCount > 0 ? (
      <p className="text-sm text-gray-600">
        {elsewhereCount} more {elsewhereCount === 1 ? "person is" : "people are"} further on, in{" "}
        <Link href={elsewhere.href} className="font-medium text-blue-600 hover:underline">
          {elsewhere.label} →
        </Link>
      </p>
    ) : null;

  if (rows.length === 0) {
    if (!emptyText) return elsewhereLink;
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-gray-500">{emptyText}</p>
        </div>
        {elsewhereLink}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={`grid grid-cols-2 gap-3 ${stages.length > 2 ? "lg:grid-cols-4" : ""}`}>
        {stages.map((stage) => (
          <a key={stage} href={`#stage-${stage}`} className={`rounded-xl border p-4 text-center ${STAGE_STYLE[stage]}`}>
            <p className="text-2xl font-bold">{rows.filter((r) => r.stage === stage).length}</p>
            <p className="text-xs font-medium">{PIPELINE_STAGE_LABELS[stage]}</p>
          </a>
        ))}
      </div>

      {stages.map((stage) => {
        const inStage = rows.filter((r) => r.stage === stage);
        if (inStage.length === 0) return null;
        return (
          <section key={stage} id={`stage-${stage}`} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <h2 className={`border-b px-6 py-3 text-sm font-semibold ${STAGE_STYLE[stage]}`}>
              {PIPELINE_STAGE_LABELS[stage]} ({inStage.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {["Name", "Job", "Start", "Rates", "Progress", ""].map((h) => (
                      <th key={h} className={`px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 ${h ? "text-left" : "text-right"}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {inStage.map(({ p, agreement, actions, agreementState: as }) => {
                    const name = `${p.contractor.firstName} ${p.contractor.lastName}`;
                    const basis = p.rateBasis === "Daily" ? "/day" : "/hr";
                    return (
                      <tr key={p.id} className="align-top hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">
                          <Link href={`/contractors/${p.contractor.id}`} className="font-medium text-blue-700 hover:text-blue-900">
                            {name}
                          </Link>
                          <p className="text-xs text-gray-500">{p.contractor.email}</p>
                          {p.contractor.phone && <p className="text-xs text-gray-500">{p.contractor.phone}</p>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <p className="font-medium">{p.role}</p>
                          <p className="text-xs text-gray-500">
                            {p.company.name}
                            {p.site ? ` — ${p.site.name}` : ""}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{agreementDate(p.startDate)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-600">
                          {p.payRate != null && <p>Pay {formatCurrency(p.payRate)}{basis}</p>}
                          {p.chargeRate != null && <p>Charge {formatCurrency(p.chargeRate)}{basis}</p>}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          <p>{p.contractor.inviteSentAt ? `Invite sent ${ukDay(p.contractor.inviteSentAt)}` : "Invite not sent"}</p>
                          {p.contractor._count.compliances > 0 && (
                            <p>
                              {/* That person's documents, not everyone's (Jenni, 08-10-26). */}
                              <Link
                                href={`/contractors/${p.contractor.id}?tab=${encodeURIComponent("Comps & Certs")}`}
                                className="font-medium text-amber-700 hover:underline"
                              >
                                {p.contractor._count.compliances} document{p.contractor._count.compliances === 1 ? "" : "s"} to verify
                              </Link>
                            </p>
                          )}
                          {as === "sent" && agreement && <p>Agreement sent {ukDay(agreement.createdAt)}</p>}
                          {as === "signed" && agreement?.signedAt && (
                            <p className="font-medium text-emerald-700">
                              Signed {ukDay(agreement.signedAt)}
                              {agreement.signedName ? ` by ${agreement.signedName}` : ""}
                            </p>
                          )}
                          <p>{p.inductionRequired ? "Induction required" : "No induction needed"}</p>
                          <p className="text-gray-400">Added by {p.createdBy}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <PipelineRowActions
                            placementId={p.id}
                            contractorId={p.contractor.id}
                            name={name}
                            actions={actions}
                            agreementPrefill={{
                              personName: name,
                              sendToEmail: p.contractor.email,
                              supplyOf: p.role,
                              companyName: p.company.name,
                              siteLocation: p.site?.name ?? null,
                              startDate: p.startDate.toISOString().slice(0, 10),
                              payRate: p.payRate,
                              rateBasis: p.rateBasis,
                              contractorId: p.contractor.id,
                              placementId: p.id,
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      {elsewhereLink}
    </div>
  );
}
