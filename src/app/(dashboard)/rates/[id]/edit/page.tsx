export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { updateRateCard, deleteRateCard } from "../../actions";
import { EMPLOYMENT_TYPES, RATE_TYPES, RATE_BASES } from "../../constants";

const inputClass =
  "mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
const labelClass = "block text-sm font-medium text-gray-700";

export default async function EditRateCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const rateCard = await prisma.rateCard.findUnique({ where: { id } });
  if (!rateCard) notFound();

  const updateAction = updateRateCard.bind(null, rateCard.id);
  const deleteAction = deleteRateCard.bind(null, rateCard.id);

  const toDateInputValue = (date: Date | null) => {
    if (!date) return "";
    return new Date(date).toISOString().split("T")[0];
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Edit Rate" />

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <form action={updateAction} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="trade" className={labelClass}>
                Trade <span className="text-red-500">*</span>
              </label>
              <input type="text" id="trade" name="trade" required defaultValue={rateCard.trade} className={inputClass} />
            </div>

            <div>
              <label htmlFor="region" className={labelClass}>Region</label>
              <input type="text" id="region" name="region" defaultValue={rateCard.region || ""} className={inputClass} />
            </div>

            <div>
              <label htmlFor="sector" className={labelClass}>Sector</label>
              <input type="text" id="sector" name="sector" defaultValue={rateCard.sector || ""} className={inputClass} />
            </div>

            <div>
              <label htmlFor="project" className={labelClass}>Project</label>
              <input type="text" id="project" name="project" defaultValue={rateCard.project || ""} className={inputClass} />
            </div>

            <div>
              <label htmlFor="employmentType" className={labelClass}>Employment Type</label>
              <select id="employmentType" name="employmentType" defaultValue={rateCard.employmentType} className={inputClass}>
                {EMPLOYMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="rateType" className={labelClass}>Rate Type</label>
              <select id="rateType" name="rateType" defaultValue={rateCard.rateType} className={inputClass}>
                {RATE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="rateBasis" className={labelClass}>Rate Basis</label>
              <select id="rateBasis" name="rateBasis" defaultValue={rateCard.rateBasis} className={inputClass}>
                {RATE_BASES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="hidden md:block" />

            <div>
              <label htmlFor="pay" className={labelClass}>
                Pay <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">£</span>
                <input type="number" id="pay" name="pay" required step="0.01" min="0" defaultValue={Number(rateCard.pay)} className={`${inputClass} mt-0 pl-7`} />
              </div>
            </div>

            <div>
              <label htmlFor="agencyMarkup" className={labelClass}>Agency Markup</label>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">£</span>
                <input
                  type="number"
                  id="agencyMarkup"
                  name="agencyMarkup"
                  step="0.01"
                  min="0"
                  defaultValue={rateCard.agencyMarkup !== null ? Number(rateCard.agencyMarkup) : ""}
                  className={`${inputClass} mt-0 pl-7`}
                  placeholder="Auto (charge − pay)"
                />
              </div>
            </div>

            <div>
              <label htmlFor="charge" className={labelClass}>
                Charge <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">£</span>
                <input type="number" id="charge" name="charge" required step="0.01" min="0" defaultValue={Number(rateCard.charge)} className={`${inputClass} mt-0 pl-7`} />
              </div>
            </div>

            <div className="hidden md:block" />

            <div>
              <label htmlFor="effectiveFrom" className={labelClass}>Effective From</label>
              <input type="date" id="effectiveFrom" name="effectiveFrom" defaultValue={toDateInputValue(rateCard.effectiveFrom)} className={inputClass} />
            </div>

            <div>
              <label htmlFor="effectiveTo" className={labelClass}>Effective To</label>
              <input type="date" id="effectiveTo" name="effectiveTo" defaultValue={toDateInputValue(rateCard.effectiveTo)} className={inputClass} />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-gray-200 pt-6">
            <div className="flex items-center gap-3">
              <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors">
                Update Rate
              </button>
              <Link href="/rates" className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
                Cancel
              </Link>
            </div>
            <form action={deleteAction}>
              <button type="submit" className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50 transition-colors">
                Delete
              </button>
            </form>
          </div>
        </form>
      </div>
    </div>
  );
}
