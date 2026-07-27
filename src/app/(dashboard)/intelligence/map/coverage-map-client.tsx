"use client";

import { useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { RefreshCw, MapPin, Building2 } from "lucide-react";

export type MapContractor = {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  status: string;
  latitude: number | null;
  longitude: number | null;
};

export type MapSite = {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  company: { id: string; name: string };
};

const LeafletCoverageMap = dynamic(() => import("./leaflet-coverage-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[600px] items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
      <p className="text-sm text-gray-400">Loading map…</p>
    </div>
  ),
});

export function CoverageMapClient({
  contractors,
  sites,
  companies,
  geocodedContractors,
  totalContractorsWithPostcode,
  geocodedSites,
  totalSitesWithPostcode,
}: {
  contractors: MapContractor[];
  sites: MapSite[];
  companies: { id: string; name: string }[];
  geocodedContractors: number;
  totalContractorsWithPostcode: number;
  geocodedSites: number;
  totalSitesWithPostcode: number;
}) {
  const [companyFilter, setCompanyFilter] = useState<string>("");
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<{
    contractorsGeocoded: number;
    sitesGeocoded: number;
    contractorsFailed: number;
    sitesFailed: number;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredSites = useMemo(
    () => (companyFilter ? sites.filter((s) => s.company.id === companyFilter) : sites),
    [sites, companyFilter]
  );

  const missingContractors = totalContractorsWithPostcode - geocodedContractors;
  const missingSites = totalSitesWithPostcode - geocodedSites;
  const needsBackfill = missingContractors > 0 || missingSites > 0;

  async function handleBackfill() {
    setBackfilling(true);
    setBackfillResult(null);
    try {
      const res = await fetch("/api/geocode/backfill", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setBackfillResult(data);
        startTransition(() => {
          window.location.reload();
        });
      }
    } finally {
      setBackfilling(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Coverage summary + controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-gray-700">
            <MapPin className="h-4 w-4 text-blue-500" />
            <strong>{geocodedContractors}</strong> subcontractors plotted
          </span>
          <span className="flex items-center gap-1.5 text-gray-700">
            <Building2 className="h-4 w-4 text-emerald-500" />
            <strong>{geocodedSites}</strong> client sites plotted
          </span>
          {needsBackfill && (
            <span className="text-amber-600 text-xs font-medium">
              {missingContractors + missingSites} record{missingContractors + missingSites === 1 ? "" : "s"} with a postcode not yet mapped
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Clients</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {needsBackfill && (
            <button
              onClick={handleBackfill}
              disabled={backfilling || isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${backfilling || isPending ? "animate-spin" : ""}`} />
              {backfilling ? "Mapping…" : "Map Missing Records"}
            </button>
          )}
        </div>
      </div>

      {backfillResult && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          Mapped {backfillResult.contractorsGeocoded} subcontractors and {backfillResult.sitesGeocoded} sites.
          {(backfillResult.contractorsFailed > 0 || backfillResult.sitesFailed > 0) && (
            <span className="text-emerald-600">
              {" "}({backfillResult.contractorsFailed + backfillResult.sitesFailed} postcodes couldn&apos;t be resolved — check for typos.)
            </span>
          )}
        </div>
      )}

      <LeafletCoverageMap contractors={contractors} sites={filteredSites} />
    </div>
  );
}
