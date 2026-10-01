import { NextRequest } from "next/server";
import { requireStaff } from "@/lib/require-staff";
import { loadContractorList, parseContractorListParams } from "@/lib/contractor-list-query";
import { csvCell, toCsv } from "@/lib/csv";

/**
 * CSV of the Subcontractors list, with whatever filters are in the query
 * string — the Export button passes the list's own, so the file matches what
 * is on screen. Built for checking the Active list against who is actually
 * still working, hence the current job's dates and the phone number.
 */
export async function GET(request: NextRequest) {
  const guard = await requireStaff();
  if (!guard.ok) return new Response("Unauthorized", { status: guard.reason === "forbidden" ? 403 : 401 });

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const { contractors } = await loadContractorList(parseContractorListParams(params));

  const date = (d: Date | null) => (d ? new Intl.DateTimeFormat("en-GB").format(d) : "");
  // Not request origin: behind Railway's proxy that can be the internal host.
  const base = process.env.NEXTAUTH_URL || "https://www.prismworkforce.online";

  const header = [
    "First Name", "Last Name", "Email", "Phone", "Job Title", "Status",
    "Working At", "Job Started", "Job Ends", "Last Job", "Compliance", "Profile",
  ];
  const rows = contractors.map((c) => [
    csvCell(c.firstName),
    csvCell(c.lastName),
    csvCell(c.email),
    csvCell(c.phone),
    csvCell(c.title),
    csvCell(c.status),
    csvCell(c.workingAt),
    csvCell(date(c.workStart)),
    csvCell(date(c.workEnd)),
    csvCell(c.lastJob),
    csvCell(c.compliance),
    csvCell(`${base}/contractors/${c.id}`),
  ]);

  const stamp = new Date().toISOString().slice(0, 10);
  const label = (params.status || "all").replace(/[^\w-]/g, "").toLowerCase() || "all";
  return new Response(toCsv([header, ...rows]), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="subcontractors-${label}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
