export const dynamic = "force-dynamic";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { CAMPAIGN_CATEGORIES, CAMPAIGN_STATUSES, CAMPAIGN_TEMPLATES } from "@/lib/campaign-builder";
import { ComposeClient } from "./compose-client";

export default async function CampaignComposePage() {
  const titles = await prisma.contractor.findMany({
    where: { jobTitle: { not: null } },
    select: { jobTitle: true },
    distinct: ["jobTitle"],
    orderBy: { jobTitle: "asc" },
  });
  const jobTitles = Array.from(
    new Set(titles.map((t) => (t.jobTitle ?? "").trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Custom email"
        description="Pick who it goes to, check the list, edit the message, then send."
        action={
          <Link
            href="/campaign"
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Back to Campaign
          </Link>
        }
      />
      <ComposeClient
        jobTitles={jobTitles}
        statuses={[...CAMPAIGN_STATUSES]}
        categories={[...CAMPAIGN_CATEGORIES]}
        templates={CAMPAIGN_TEMPLATES}
      />
    </div>
  );
}
