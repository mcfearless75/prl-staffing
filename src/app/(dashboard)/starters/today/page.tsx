export const dynamic = "force-dynamic";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";
import { PageHeader } from "@/components/page-header";
import { formatDate, getInitials } from "@/lib/utils";
import { LIVE_ASSIGNMENT_STATUSES } from "@/lib/assignment-statuses";
import { addDaysToKey, londonDayBounds, londonDayKey, parseDayKey } from "@/lib/london-day";

const PRL_PHONE = "0800 772 3959";

/** Prefilled "have you started?" email. No SMS provider, so mailto only. */
function checkInHref(email: string, firstName: string, site: string): string {
  const subject = "Checking in on your first day";
  const body = `Hi ${firstName}, just checking you've started on site at ${site} today. Any issues call PRL on ${PRL_PHONE}.`;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** "Mon 6 Oct 2026" for a YYYY-MM-DD key, without timezone drift. */
function describeDay(key: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${key}T00:00:00Z`));
}

export default async function TodaysStartersPage({
  searchParams,
}: {
  searchParams?: Promise<{ date?: string }>;
}) {
  const guard = await requireStaff();
  if (!guard.ok) redirect("/login");

  const params = searchParams ? await searchParams : {};
  const todayKey = londonDayKey();
  const dayKey = parseDayKey(params?.date) ?? todayKey;
  const { start, end } = londonDayBounds(dayKey);
  const isToday = dayKey === todayKey;

  const assignments = await prisma.assignment.findMany({
    where: {
      status: { in: [...LIVE_ASSIGNMENT_STATUSES] },
      startDate: { gte: start, lt: end },
    },
    orderBy: [{ contractor: { lastName: "asc" } }, { contractor: { firstName: "asc" } }],
    select: {
      id: true,
      role: true,
      location: true,
      startDate: true,
      contractor: {
        select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      },
      company: { select: { name: true } },
      site: { select: { name: true } },
    },
  });

  const peopleCount = new Set(assignments.map((a) => a.contractor.id)).size;
  const dayLabel = isToday ? "today" : describeDay(dayKey);
  const navLink =
    "rounded-full bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-200";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Starters"
        description={`${peopleCount} ${peopleCount === 1 ? "person" : "people"} starting ${dayLabel} — ${describeDay(dayKey)}`}
      />

      {/* Day picker */}
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/starters/today?date=${addDaysToKey(dayKey, -1)}`} className={navLink}>
          &larr; Prev day
        </Link>
        <Link
          href="/starters/today"
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            isToday ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Today
        </Link>
        <Link href={`/starters/today?date=${addDaysToKey(dayKey, 1)}`} className={navLink}>
          Next day &rarr;
        </Link>
        <form method="get" action="/starters/today" className="ml-auto flex items-center gap-2">
          <label htmlFor="starters-date" className="text-sm text-gray-600">
            Date
          </label>
          <input
            id="starters-date"
            type="date"
            name="date"
            defaultValue={dayKey}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
          >
            Go
          </button>
        </form>
      </div>

      {assignments.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {["Name", "Phone", "Email", "Client", "Site", "Role", "Start Date"].map((h) => (
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
              {assignments.map((a) => {
                const c = a.contractor;
                const siteName = a.site?.name || a.location || "";
                return (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <Link href={`/contractors/${c.id}`} className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
                          {getInitials(c.firstName, c.lastName)}
                        </div>
                        <span className="text-sm font-medium text-gray-900 hover:text-blue-700 hover:underline">
                          {c.firstName} {c.lastName}
                        </span>
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {c.phone ? (
                        <a href={`tel:${c.phone.replace(/\s+/g, "")}`} className="text-blue-600 hover:text-blue-800">
                          {c.phone}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{c.email || "—"}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{a.company?.name || "—"}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{siteName || "—"}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{a.role || "—"}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{formatDate(a.startDate)}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      {c.email ? (
                        <a
                          href={checkInHref(c.email, c.firstName, siteName || "your site")}
                          className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                        >
                          Check in
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">No email</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-500">
          No one is due to start {isToday ? "today" : `on ${describeDay(dayKey)}`}.
        </div>
      )}
    </div>
  );
}
