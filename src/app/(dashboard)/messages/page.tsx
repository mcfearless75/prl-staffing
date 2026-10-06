export const dynamic = "force-dynamic";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/require-staff";
import { PageHeader } from "@/components/page-header";
import { getInitials } from "@/lib/utils";
import { MESSAGE_FROM_WORKER, summariseConversations } from "@/lib/contractor-messages";

const MAX_CONVERSATIONS = 300;

function when(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" }).format(date);
}

/** Every in-app conversation with a worker, unread replies first. */
export default async function MessagesPage() {
  const guard = await requireStaff();
  if (!guard.ok) redirect(guard.reason === "forbidden" ? "/" : "/login");

  const [latest, unreadGroups] = await Promise.all([
    prisma.contractorMessage.findMany({
      distinct: ["contractorId"],
      orderBy: [{ contractorId: "asc" }, { createdAt: "desc" }],
      select: {
        contractorId: true,
        body: true,
        direction: true,
        createdAt: true,
        contractor: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.contractorMessage.groupBy({
      by: ["contractorId"],
      where: { direction: MESSAGE_FROM_WORKER, readAt: null },
      _count: { _all: true },
    }),
  ]);

  const conversations = summariseConversations(
    latest.map((m) => ({
      contractorId: m.contractorId,
      name: `${m.contractor.firstName} ${m.contractor.lastName}`.trim(),
      lastBody: m.body,
      lastDirection: m.direction,
      lastAt: m.createdAt,
    })),
    new Map(unreadGroups.map((g) => [g.contractorId, g._count._all]))
  ).slice(0, MAX_CONVERSATIONS);
  const people = new Map(latest.map((m) => [m.contractorId, m.contractor]));
  const unreadPeople = conversations.filter((c) => c.unread > 0).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messages"
        description={
          unreadPeople > 0
            ? `${unreadPeople} ${unreadPeople === 1 ? "worker has" : "workers have"} replied and not been read yet`
            : "In-app messages with workers. Start one from a worker's profile, Messages tab."
        }
      />

      {conversations.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-500">
          No messages yet. Open a worker&apos;s profile and use the Messages tab to send one.
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {conversations.map((c) => (
            <li key={c.contractorId}>
              <Link
                href={`/contractors/${c.contractorId}?tab=Messages`}
                className={`flex items-center gap-4 px-6 py-4 hover:bg-gray-50 ${c.unread > 0 ? "bg-blue-50/50" : ""}`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
                  {getInitials(people.get(c.contractorId)?.firstName ?? "", people.get(c.contractorId)?.lastName ?? "")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${c.unread > 0 ? "font-semibold text-gray-900" : "font-medium text-gray-800"}`}>
                      {c.name}
                    </span>
                    {c.unread > 0 && (
                      <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                        {c.unread} new
                      </span>
                    )}
                  </div>
                  <p className="truncate text-sm text-gray-500">
                    {c.lastDirection === MESSAGE_FROM_WORKER ? "" : "PRL: "}
                    {c.snippet}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-gray-400">{when(c.lastAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
