import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { waiverDecisionLabel } from "@/lib/working-time-waiver";

/**
 * Staff view (read-only) of the worker's 48-hour waiver and references, which
 * the worker fills in on their app profile (src/app/portal/profile).
 */
export async function WaiverReferencesCard({ contractorId }: { contractorId: string }) {
  const contractor = await prisma.contractor.findUnique({
    where: { id: contractorId },
    select: {
      waiverDecision: true,
      waiverSignature: true,
      waiverSignedAt: true,
      references: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!contractor) return null;

  const { waiverDecision, waiverSignature, waiverSignedAt, references } = contractor;
  const pill =
    waiverDecision === "opt-out"
      ? "bg-amber-100 text-amber-800"
      : waiverDecision === "no-opt-out"
        ? "bg-emerald-100 text-emerald-700"
        : "bg-gray-100 text-gray-600";

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">48 Hour Waiver &amp; References</h2>
      </div>

      <div className="space-y-4 p-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">48 Hour Waiver</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${pill}`}>
              {waiverDecisionLabel(waiverDecision)}
            </span>
            {waiverSignedAt && (
              <span className="text-xs text-gray-500">
                Signed {waiverSignature ? `"${waiverSignature}" ` : ""}on {formatDate(waiverSignedAt)}
              </span>
            )}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">References</p>
          {references.length === 0 ? (
            <p className="mt-1 text-sm text-gray-500">None given.</p>
          ) : (
            <ul className="mt-2 divide-y divide-gray-100 rounded-lg border border-gray-200">
              {references.map((r) => (
                <li key={r.id} className="px-3 py-2 text-sm">
                  <p className="font-medium text-gray-900">
                    {r.companyName || "Company not given"}
                    {r.jobRole && <span className="font-normal text-gray-500"> — {r.jobRole}</span>}
                  </p>
                  {(r.startDate || r.endDate) && (
                    <p className="text-xs text-gray-500">
                      {r.startDate ? formatDate(r.startDate) : "?"} – {r.endDate ? formatDate(r.endDate) : "?"}
                    </p>
                  )}
                  {(r.contactName || r.email || r.phone) && (
                    <p className="mt-0.5 text-xs text-gray-600">
                      {[r.contactName, r.email, r.phone].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
