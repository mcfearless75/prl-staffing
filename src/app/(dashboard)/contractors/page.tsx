export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/badge";
import { getInitials } from "@/lib/utils";
import { Plus, Search, Upload, Download, ArrowUpDown, ArrowUp, ArrowDown, MailWarning } from "lucide-react";
import { ContractorStatusSelect } from "@/components/contractor-status-select";
import { SETTABLE_CONTRACTOR_STATUSES, PRE_WORK_CONTRACTOR_STATUSES } from "@/lib/contractor-statuses";
import { LIVE_ASSIGNMENT_STATUSES } from "@/lib/assignment-statuses";
import { WorkBoard } from "./work-board";
import type { ContractorSort } from "@/lib/contractor-list";
import {
  COMPLIANCE_OPTIONS,
  NAME_CHECK_FILTER,
  NONE,
  loadContractorList,
  parseContractorListParams,
  type ComplianceStatus,
} from "@/lib/contractor-list-query";

// Presentation only — the vocabulary itself lives in contractor-statuses.ts.
// A status with no entry here still gets a working tab, just a neutral one.
const STATUS_TAB_COLORS: Record<string, string> = {
  "":          "bg-gray-100 text-gray-700 hover:bg-gray-200",
  Active:      "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
  Inactive:    "bg-gray-100 text-gray-600 hover:bg-gray-200",
};

function ViewToggle({ view }: { view: "list" | "board" }) {
  const base = "px-3 py-1.5 text-sm font-medium transition-colors";
  const on = "bg-blue-600 text-white";
  const off = "bg-white text-gray-600 hover:bg-gray-50";
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-gray-200 shadow-sm">
      <Link href="/contractors" className={`${base} ${view === "list" ? on : off}`}>List</Link>
      <Link href="/contractors?view=board" className={`${base} border-l border-gray-200 ${view === "board" ? on : off}`}>Board</Link>
    </div>
  );
}

function ComplianceBadge({ status }: { status: ComplianceStatus }) {
  return <StatusBadge value={status} />;
}

export default async function ContractorsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    search?: string; status?: string; view?: string;
    title?: string; working?: string; compliance?: string;
    sort?: string; dir?: string;
    sortBy?: string; // legacy: firstName | lastName
  }>;
}) {
  const params = await searchParams;

  // Board view: everyone on live work, by assignment status. It has its own
  // search and client filter, so the list's filters don't apply to it.
  if (params?.view === "board") {
    const boardAssignments = await prisma.assignment.findMany({
      where: { status: { in: [...LIVE_ASSIGNMENT_STATUSES] } },
      select: {
        id: true, contractorId: true, role: true, location: true,
        startDate: true, endDate: true, status: true,
        contractor: { select: { firstName: true, lastName: true } },
        company: { select: { name: true } },
      },
      orderBy: [{ endDate: { sort: "asc", nulls: "last" } }, { startDate: "desc" }],
    });
    return (
      <div className="space-y-6">
        <PageHeader title="Contractors" action={<ViewToggle view="board" />} />
        <p className="text-sm text-gray-500">
          Everyone on live work. Click a card to open the person; drag it to change the job&apos;s status.
          End dates in <span className="font-semibold text-amber-600">amber</span> are within two weeks.
        </p>
        <WorkBoard initialAssignments={JSON.parse(JSON.stringify(boardAssignments))} />
      </div>
    );
  }
  const filters = parseContractorListParams(params);
  const { search, status, title: titleFilter, working: workingFilter, compliance: complianceFilter, sort, dir } = filters;
  const { contractors, titleOptions, clientOptions } = await loadContractorList(filters);

  const current = { search, status, title: titleFilter, working: workingFilter, compliance: complianceFilter, sort, dir };
  const hasFilters = Boolean(search || status || titleFilter || workingFilter || complianceFilter);
  function hrefWith(over: Partial<typeof current>): string {
    const merged = { ...current, ...over };
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) {
      if (!v || (k === "sort" && v === "last") || (k === "dir" && v === "asc")) continue;
      qs.set(k, v);
    }
    const s = qs.toString();
    return s ? `/contractors?${s}` : "/contractors";
  }
  // Clicking the active column flips direction; a new column starts ascending.
  function sortLink(label: string, col: ContractorSort) {
    const active = sort === col;
    const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
    return (
      <Link
        href={hrefWith({ sort: col, dir: active && dir === "asc" ? "desc" : "asc" })}
        className={`inline-flex items-center gap-1 hover:text-gray-900 transition-colors ${active ? "text-gray-900" : ""}`}
      >
        {label}
        <Icon className="h-3 w-3" />
      </Link>
    );
  }
  function sortHeader(label: string, col: ContractorSort) {
    return (
      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
        {sortLink(label, col)}
      </th>
    );
  }
  const selectCls = "rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contractors"
        action={
          <div className="flex items-center gap-2">
            <ViewToggle view="list" />
            {/* Same filters as the list, so it downloads exactly what is shown. */}
            <a
              href={hrefWith({}).replace(/^\/contractors/, "/api/contractors/export")}
              download
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export
            </a>
            <Link
              href="/contractors/import"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
            >
              <Upload className="h-4 w-4" />
              Import
            </Link>
            <Link
              href="/contractors/new"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Contractor
            </Link>
          </div>
        }
      />

      {/* Quick-filter tabs */}
      <div className="flex flex-wrap gap-2">
        {/* Active / Inactive only — the Available tab was dropped at PRL's request (2026-10-01). */}
        {["", ...SETTABLE_CONTRACTOR_STATUSES].map((value) => (
          <Link
            key={value}
            href={hrefWith({ status: value })}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${STATUS_TAB_COLORS[value] ?? "bg-gray-100 text-gray-700 hover:bg-gray-200"} ${status === value ? "ring-2 ring-offset-1 ring-current" : ""}`}
          >
            {value || "All"}
          </Link>
        ))}
      </div>

      {/* Filter Bar */}
      <form method="GET" className="flex flex-wrap items-center gap-3">
        {/* Sort survives pressing Filter */}
        {sort !== "last" && <input type="hidden" name="sort" value={sort} />}
        {dir !== "asc" && <input type="hidden" name="dir" value={dir} />}
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            name="search"
            placeholder="Search by name or email..."
            defaultValue={search}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <select name="status" defaultValue={status} className={selectCls} aria-label="Status">
          <option value="">All Statuses</option>
          {SETTABLE_CONTRACTOR_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
          <option value={NAME_CHECK_FILTER}>Name changes to check</option>
          {/* Hidden from the default view; reachable only by asking for them. */}
          <optgroup label="Not started yet">
            {PRE_WORK_CONTRACTOR_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </optgroup>
        </select>
        <select name="title" defaultValue={titleFilter} className={`${selectCls} max-w-[220px]`} aria-label="Job title">
          <option value="">All Job Titles</option>
          <option value={NONE}>No job title</option>
          {titleOptions.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select name="working" defaultValue={workingFilter} className={`${selectCls} max-w-[220px]`} aria-label="Working at">
          <option value="">Working Anywhere</option>
          <option value={NONE}>Not working</option>
          {clientOptions.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select name="compliance" defaultValue={complianceFilter} className={selectCls} aria-label="Compliance">
          <option value="">All Compliance</option>
          {COMPLIANCE_OPTIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
        >
          Filter
        </button>
        {hasFilters && (
          <Link
            href={hrefWith({ search: "", status: "", title: "", working: "", compliance: "" })}
            className="text-sm text-blue-600 hover:underline"
          >
            Clear
          </Link>
        )}
        <span className="ml-auto text-sm text-gray-500">{contractors.length} shown</span>
      </form>

      {/* Contractors Table */}
      {contractors.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <span className="inline-flex items-center gap-2">
                    {sortLink("Name", sort === "first" ? "first" : "last")}
                    <Link
                      href={hrefWith({ sort: sort === "first" ? "last" : "first", dir: "asc" })}
                      className="normal-case font-normal text-gray-400 hover:text-gray-700"
                      title="Switch between sorting by first name and surname"
                    >
                      ({sort === "first" ? "first" : "last"})
                    </Link>
                  </span>
                </th>
                {sortHeader("Email", "email")}
                {sortHeader("Job Title", "title")}
                {sortHeader("Working At", "working")}
                {sortHeader("Compliance", "compliance")}
                {sortHeader("Status", "status")}
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {contractors.map((contractor) => (
                <tr
                  key={contractor.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
                        {getInitials(contractor.firstName, contractor.lastName)}
                      </div>
                      <Link
                        href={`/contractors/${contractor.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors"
                      >
                        {contractor.firstName} {contractor.lastName}
                      </Link>
                      {contractor.doNotEmploy && (
                        <span
                          title={contractor.doNotEmployReason ?? "Do not employ"}
                          className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white"
                        >
                          Do not employ
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1.5">
                      {contractor.email}
                      {contractor.emailBounced && (
                        <span
                          title={contractor.emailBounceReason ?? "Email bounced"}
                          className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
                        >
                          <MailWarning className="h-3 w-3" />
                          Bounced
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {contractor.title ? (
                      <span title={contractor.jobTitle?.trim() ? undefined : "Taken from the profile's Job Roles, current job or last job. The Job Title field itself is blank."}>
                        {contractor.title}
                        {!contractor.jobTitle?.trim() && <span className="ml-0.5 text-gray-300">*</span>}
                      </span>
                    ) : contractor.appliedFor ? (
                      <span
                        className="block max-w-[220px] truncate italic text-gray-400"
                        title={`Applied for: ${contractor.appliedFor}. No job title has been set.`}
                      >
                        Applied: {contractor.appliedFor}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {contractor.workingAt ||
                      (contractor.lastJob ? (
                        <span className="italic text-gray-400">Last: {contractor.lastJob}</span>
                      ) : "—")}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <Link href={`/compliance?search=${encodeURIComponent(contractor.firstName + " " + contractor.lastName)}`}>
                      <ComplianceBadge status={contractor.compliance} />
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <ContractorStatusSelect id={contractor.id} status={contractor.status} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/contractors/${contractor.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        View
                      </Link>
                      <Link
                        href={`/contractors/${contractor.id}/edit`}
                        className="text-sm font-medium text-gray-600 hover:text-gray-900"
                      >
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-gray-500">
            No contractors found.{" "}
            {hasFilters ? (
              <Link href="/contractors" className="text-blue-600 hover:underline">
                Clear filters
              </Link>
            ) : (
              <Link href="/contractors/new" className="text-blue-600 hover:underline">
                Add your first contractor
              </Link>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
