import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUS_TABS = ["All", "Open", "Assigned", "Resolved", "Closed"];

const statusColour: Record<string, string> = {
  Open: "bg-red-100 text-red-700",
  Assigned: "bg-yellow-100 text-yellow-700",
  Resolved: "bg-green-100 text-green-700",
  Closed: "bg-gray-100 text-gray-500",
};

export default async function GrievancesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { status } = await searchParams;
  const filter = STATUS_TABS.includes(status || "") && status !== "All" ? status : undefined;

  const grievances = await prisma.grievance.findMany({
    where: filter ? { status: filter } : undefined,
    orderBy: { createdAt: "desc" },
  });

  const counts = await prisma.grievance.groupBy({
    by: ["status"],
    _count: { id: true },
  });
  const countMap: Record<string, number> = { All: 0 };
  for (const row of counts) {
    countMap[row.status] = row._count.id;
    countMap.All = (countMap.All || 0) + row._count.id;
  }

  const activeTab = status || "All";

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grievances</h1>
          <p className="text-sm text-gray-500 mt-0.5">Formal grievances raised by workers or contractors</p>
        </div>
        <a
          href="/grievance"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 transition-colors"
        >
          Share Form ↗
        </a>
      </div>

      {/* Status tabs */}
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-gray-200">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab}
            href={tab === "All" ? "/grievances" : `/grievances?status=${tab}`}
            className={`shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-purple-600 text-purple-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
            {countMap[tab] > 0 && (
              <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-600">
                {countMap[tab]}
              </span>
            )}
          </Link>
        ))}
      </div>

      {grievances.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-12 text-center">
          <p className="text-sm text-gray-500">No grievances found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {grievances.map((g) => (
            <Link
              key={g.id}
              href={`/grievances/${g.id}`}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 hover:border-purple-300 hover:bg-purple-50/30 transition-all group"
            >
              <div className="flex items-center gap-4 min-w-0">
                <span className="shrink-0 rounded-lg bg-purple-100 px-2.5 py-1 text-xs font-bold text-purple-700">
                  {g.ticketNumber}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{g.name}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {g.grievanceType || "General"} {g.site ? `· ${g.site}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-4">
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusColour[g.status] || "bg-gray-100 text-gray-500"}`}>
                  {g.status}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(g.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
                <span className="text-gray-300 group-hover:text-purple-500">›</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
