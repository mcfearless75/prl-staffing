export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { PageHeader } from "@/components/page-header";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Search } from "lucide-react";
import { EMPLOYMENT_TYPES, RATE_TYPES, RATE_BASES, RATES_PAGE_SIZE } from "./constants";
import { RatesActions } from "./rates-actions";

type RatesSearchParams = {
  q?: string;
  employmentType?: string;
  rateType?: string;
  rateBasis?: string;
  page?: string;
};

function buildQuery(current: RatesSearchParams, patch: Partial<RatesSearchParams>): string {
  const params = new URLSearchParams();
  const merged = { ...current, ...patch };
  for (const [key, value] of Object.entries(merged)) {
    if (value && key !== "page") params.set(key, value);
  }
  return params.toString();
}

function getMarginColor(margin: number): string {
  if (margin >= 30) return "text-emerald-700 bg-emerald-50";
  if (margin >= 20) return "text-amber-700 bg-amber-50";
  return "text-red-700 bg-red-50";
}

function Segmented({
  options,
  active,
  paramKey,
  current,
}: {
  options: readonly string[];
  active?: string;
  paramKey: keyof RatesSearchParams;
  current: RatesSearchParams;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-gray-200 bg-white">
      {options.map((opt) => {
        const isActive = active === opt;
        // Clicking the active option again clears the filter.
        const query = buildQuery(current, { [paramKey]: isActive ? "" : opt });
        return (
          <Link
            key={opt}
            href={`/rates${query ? `?${query}` : ""}`}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            {opt}
          </Link>
        );
      })}
    </div>
  );
}

export default async function RatesPage({
  searchParams,
}: {
  searchParams: Promise<RatesSearchParams>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() || "";
  const employmentType = EMPLOYMENT_TYPES.includes(sp.employmentType as never) ? sp.employmentType : undefined;
  const rateType = RATE_TYPES.includes(sp.rateType as never) ? sp.rateType : undefined;
  const rateBasis = RATE_BASES.includes(sp.rateBasis as never) ? sp.rateBasis : undefined;
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);

  const where: Prisma.RateCardWhereInput = {
    ...(employmentType ? { employmentType } : {}),
    ...(rateType ? { rateType } : {}),
    ...(rateBasis ? { rateBasis } : {}),
    ...(q
      ? {
          OR: [
            { trade: { contains: q, mode: "insensitive" } },
            { region: { contains: q, mode: "insensitive" } },
            { sector: { contains: q, mode: "insensitive" } },
            { project: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [rateCards, total] = await Promise.all([
    prisma.rateCard.findMany({
      where,
      orderBy: [{ trade: "asc" }, { region: "asc" }],
      skip: (page - 1) * RATES_PAGE_SIZE,
      take: RATES_PAGE_SIZE,
    }),
    prisma.rateCard.count({ where }),
  ]);

  const current: RatesSearchParams = {
    ...(q ? { q } : {}),
    ...(employmentType ? { employmentType } : {}),
    ...(rateType ? { rateType } : {}),
    ...(rateBasis ? { rateBasis } : {}),
  };
  const query = buildQuery(current, {});
  const activeFilterCount = [employmentType, rateType, rateBasis].filter(Boolean).length;
  const totalPages = Math.max(1, Math.ceil(total / RATES_PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * RATES_PAGE_SIZE + 1;
  const to = Math.min(page * RATES_PAGE_SIZE, total);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rates"
        action={
          <div className="flex items-center gap-2">
            <RatesActions query={query} />
            <Link
              href="/rates/new"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Rate
            </Link>
          </div>
        }
      />

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Segmented options={RATE_TYPES} active={rateType} paramKey="rateType" current={current} />
        <Segmented options={EMPLOYMENT_TYPES} active={employmentType} paramKey="employmentType" current={current} />
        <Segmented options={RATE_BASES} active={rateBasis} paramKey="rateBasis" current={current} />

        <form action="/rates" method="get" className="ml-auto flex items-center gap-2">
          {employmentType && <input type="hidden" name="employmentType" value={employmentType} />}
          {rateType && <input type="hidden" name="rateType" value={rateType} />}
          {rateBasis && <input type="hidden" name="rateBasis" value={rateBasis} />}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search"
              className="w-56 rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {activeFilterCount > 0 && (
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-blue-600 px-1.5 text-xs font-semibold text-white">
              {activeFilterCount}
            </span>
          )}
        </form>
      </div>

      {rateCards.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {["Trade", "Region", "Sector", "Project", "Pay", "Agency Markup", "Charge"].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                    >
                      {h}
                    </th>
                  ))}
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rateCards.map((rate) => {
                  const unit = rate.rateBasis === "Daily" ? "/day" : "/hr";
                  const hasMargin = rate.margin !== null && Number.isFinite(rate.margin);
                  return (
                    <tr key={rate.id} className="hover:bg-gray-50 transition-colors">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                        {rate.trade}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {rate.region || "—"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {rate.sector || "—"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {rate.project || "—"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {formatCurrency(Number(rate.pay))}
                        <span className="text-xs text-gray-400">{unit}</span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {rate.agencyMarkup !== null ? formatCurrency(Number(rate.agencyMarkup)) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {formatCurrency(Number(rate.charge))}
                        <span className="text-xs text-gray-400">{unit}</span>
                        {hasMargin && (
                          <span
                            className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${getMarginColor(rate.margin as number)}`}
                          >
                            {(rate.margin as number).toFixed(1)}%
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <Link
                          href={`/rates/${rate.id}/edit`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3 text-sm text-gray-500">
            <span>
              {from}–{to} of {total}
            </span>
            <div className="flex items-center gap-1">
              {page > 1 && (
                <Link
                  href={`/rates?${new URLSearchParams({ ...current, page: String(page - 1) }).toString()}`}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50"
                >
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/rates?${new URLSearchParams({ ...current, page: String(page + 1) }).toString()}`}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-gray-500">
            {q || activeFilterCount > 0 ? (
              "No rates match your filters."
            ) : (
              <>
                No rates found.{" "}
                <Link href="/rates/new" className="text-blue-600 hover:underline">
                  Add your first rate
                </Link>
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
