export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Plus, Search } from "lucide-react";
import { CompaniesTable } from "./companies-table";

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams?: Promise<{ search?: string }>;
}) {
  const params = await searchParams;
  const search = params?.search || "";

  const where: Record<string, unknown> = {};

  if (search) {
    where.name = { contains: search, mode: "insensitive" };
  }

  const companies = await prisma.company.findMany({
    where,
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Companies"
        action={
          <Link
            href="/companies/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Company
          </Link>
        }
      />

      {/* Search Bar */}
      <form method="GET" className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            name="search"
            placeholder="Search by company name..."
            defaultValue={search}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
        >
          Search
        </button>
      </form>

      {/* Count */}
      <p className="text-sm text-gray-500">
        {companies.length} {companies.length === 1 ? "company" : "companies"}{search ? ` matching "${search}"` : " total"}
      </p>

      {/* Companies Table */}
      {companies.length > 0 ? (
        <CompaniesTable companies={companies} />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-gray-500">
            No companies found.{" "}
            {search ? (
              <Link href="/companies" className="text-blue-600 hover:underline">
                Clear search
              </Link>
            ) : (
              <Link href="/companies/new" className="text-blue-600 hover:underline">
                Add your first company
              </Link>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
