export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/badge";
import { formatDate } from "@/lib/utils";
import { PayQueryForm } from "./form";
import type { TimesheetOption } from "./types";

export default async function PortalPayQueryPage({
  searchParams,
}: {
  searchParams?: Promise<{ success?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const successTicket = params?.success;

  const session = await auth();
  const contractorId = (session?.user as { contractorId?: string })?.contractorId;
  if (!contractorId) redirect("/login");

  const contractor = await prisma.contractor.findUnique({
    where: { id: contractorId },
    select: { email: true },
  });
  if (!contractor) redirect("/login");

  const [timesheets, previousQueries] = await Promise.all([
    prisma.timesheet.findMany({
      where: { contractorId },
      include: { entries: { orderBy: { dayOfWeek: "asc" } } },
      orderBy: { weekStarting: "desc" },
      take: 12,
    }),
    // Own queries are matched on email since PaymentQuery has no
    // contractor relation (it also serves the pre-portal mailto/public
    // form submissions, which never had a contractorId to link).
    prisma.paymentQuery.findMany({
      where: { email: contractor.email },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const timesheetOptions: TimesheetOption[] = timesheets.map((ts) => ({
    id: ts.id,
    weekStarting: ts.weekStarting.toISOString(),
    totalHours: ts.totalHours,
    overtimeHours: ts.overtimeHours,
    entries: ts.entries.map((e) => ({
      dayOfWeek: e.dayOfWeek,
      hours: e.hours,
      startTime: e.startTime,
      finishTime: e.finishTime,
      status: e.status,
    })),
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Pay Query</h1>

      {successTicket ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-emerald-900">
            Query submitted — ticket <span className="font-bold">{successTicket}</span>
          </p>
          <p className="mt-1 text-xs text-emerald-700">
            We aim to respond within 48 hours. Track its status below.
          </p>
          <Link
            href="/portal/pay-query"
            className="mt-3 inline-block text-xs font-medium text-emerald-800 underline"
          >
            Submit another query
          </Link>
        </div>
      ) : (
        <PayQueryForm timesheets={timesheetOptions} />
      )}

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-900">Your Previous Queries</h2>
        {previousQueries.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
            No pay queries submitted yet.
          </div>
        ) : (
          previousQueries.map((q) => (
            <div
              key={q.id}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {q.ticketNumber} — {q.queryType}
                </p>
                <p className="text-xs text-gray-500">
                  Week ending {q.weekEnding} · Submitted {formatDate(q.createdAt)}
                </p>
              </div>
              <Badge variant={q.status}>{q.status}</Badge>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
