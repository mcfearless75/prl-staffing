export const dynamic = "force-dynamic";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/db";
import { CoverageMapClient } from "./coverage-map-client";

export default async function CoverageMapPage() {
  const [contractors, sites, allContractorCount, allSiteCount] = await Promise.all([
    prisma.contractor.findMany({
      where: { status: { notIn: ["Left", "Inactive"] }, latitude: { not: null }, longitude: { not: null } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        status: true,
        latitude: true,
        longitude: true,
      },
    }),
    prisma.site.findMany({
      where: { isActive: true, latitude: { not: null }, longitude: { not: null } },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        company: { select: { id: true, name: true } },
      },
    }),
    prisma.contractor.count({ where: { status: { notIn: ["Left", "Inactive"] }, postcode: { not: null } } }),
    prisma.site.count({ where: { isActive: true, postcode: { not: null } } }),
  ]);

  const companies = Array.from(
    new Map(sites.map((s) => [s.company.id, s.company.name])).entries()
  )
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <Link
        href="/intelligence"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Intelligence
      </Link>
      <PageHeader
        title="Coverage Map"
        description="Subcontractor locations against client sites — where your workforce actually is, versus where the work is."
      />

      <CoverageMapClient
        contractors={contractors}
        sites={sites}
        companies={companies}
        geocodedContractors={contractors.length}
        totalContractorsWithPostcode={allContractorCount}
        geocodedSites={sites.length}
        totalSitesWithPostcode={allSiteCount}
      />
    </div>
  );
}
