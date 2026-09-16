export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { formatDate, getInitials } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LIVE_ASSIGNMENT_STATUSES } from "@/lib/assignment-statuses";

async function approveApplicant(id: string) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");
  // approvedAt is what welcomeAgent keys off. This is the canonical approval —
  // a deliberate, individual staff decision — so it is one of the only two
  // places that stamps it. Bulk imports and onboarding creates deliberately do
  // not, or an import would welcome everyone in the file at once.
  await prisma.contractor.update({
    where: { id },
    data: { status: "Active", approvedAt: new Date() },
  });
  revalidatePath("/applicants");
  revalidatePath("/");
}

async function rejectApplicant(id: string) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");
  await prisma.contractor.update({ where: { id }, data: { status: "Inactive" } });
  revalidatePath("/applicants");
  revalidatePath("/");
}

async function setLooking(id: string) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");
  await prisma.contractor.update({ where: { id }, data: { status: "Looking" } });
  revalidatePath("/applicants");
}

async function reactivateApplicant(id: string) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");
  // Deliberately does not touch approvedAt — that stamp means "staff approved
  // this application", not "currently working". Going back to work isn't a
  // new approval.
  await prisma.contractor.update({ where: { id }, data: { status: "Active" } });
  revalidatePath("/applicants");
  revalidatePath("/");
}

export default async function ApplicantsPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const view =
    params?.view === "approved"
      ? "approved"
      : params?.view === "looking"
      ? "looking"
      : params?.view === "benched"
      ? "benched"
      : "pending";

  // Pending = Applied status
  const applied = await prisma.contractor.findMany({
    where: { status: "Applied" },
    orderBy: { createdAt: "desc" },
  });

  // Looking = contractors marked as actively looking
  const looking = await prisma.contractor.findMany({
    where: { status: "Looking" },
    orderBy: { updatedAt: "desc" },
  });

  // Recently approved = Active, not yet on a live assignment, sorted by when
  // they were approved. Once someone is actually placed they've moved past
  // this "just approved, needs work" queue.
  const recentlyApproved = await prisma.contractor.findMany({
    where: {
      status: "Active",
      assignments: { none: { status: { in: [...LIVE_ASSIGNMENT_STATUSES] } } },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  // Benched = Inactive (approved before, no live work now) and, as a
  // belt-and-braces check, still genuinely unassigned — deactivateContractorIfNoLiveWork
  // (contractor-status.ts) is what puts people here in the ordinary course of
  // business, but this guards against anyone manually flipped to Inactive
  // while still holding a live assignment.
  const benched = await prisma.contractor.findMany({
    where: {
      status: "Inactive",
      assignments: { none: { status: { in: [...LIVE_ASSIGNMENT_STATUSES] } } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const activeList =
    view === "approved"
      ? recentlyApproved
      : view === "looking"
      ? looking
      : view === "benched"
      ? benched
      : applied;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Applicants"
        description={
          view === "approved"
            ? `${recentlyApproved.length} recently approved, not yet assigned`
            : view === "looking"
            ? `${looking.length} contractors actively looking`
            : view === "benched"
            ? `${benched.length} inactive and unassigned`
            : `${applied.length} pending applications`
        }
      />

      {/* View Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/applicants"
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            view === "pending"
              ? "bg-amber-500 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Pending ({applied.length})
        </Link>
        <Link
          href="/applicants?view=looking"
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            view === "looking"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Looking ({looking.length})
        </Link>
        <Link
          href="/applicants?view=approved"
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            view === "approved"
              ? "bg-emerald-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Recently Approved ({recentlyApproved.length})
        </Link>
        <Link
          href="/applicants?view=benched"
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            view === "benched"
              ? "bg-gray-700 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Benched ({benched.length})
        </Link>
      </div>

      {activeList.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Job Title</th>
                {view === "pending" && (
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  {view === "approved"
                    ? "Approved On ↓"
                    : view === "looking"
                    ? "Marked Looking"
                    : view === "benched"
                    ? "Benched Since ↓"
                    : "Applied"}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {activeList.map((a) => {
                const approve = approveApplicant.bind(null, a.id);
                const reject = rejectApplicant.bind(null, a.id);
                const markLooking = setLooking.bind(null, a.id);
                const reactivate = reactivateApplicant.bind(null, a.id);
                return (
                  <tr
                    key={a.id}
                    className={
                      view === "approved"
                        ? "bg-emerald-50/20 hover:bg-emerald-50"
                        : view === "looking"
                        ? "bg-blue-50/20 hover:bg-blue-50"
                        : view === "benched"
                        ? "bg-gray-50/50 hover:bg-gray-100"
                        : "bg-amber-50/30 hover:bg-amber-50"
                    }
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium text-white ${
                            view === "approved"
                              ? "bg-emerald-600"
                              : view === "looking"
                              ? "bg-blue-600"
                              : view === "benched"
                              ? "bg-gray-500"
                              : "bg-amber-500"
                          }`}
                        >
                          {getInitials(a.firstName, a.lastName)}
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {a.firstName} {a.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{a.email}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{a.phone || "—"}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{a.jobTitle || "—"}</td>
                    {view === "pending" && (
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            a.status === "Looking"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                    )}
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {view === "approved" || view === "looking" || view === "benched"
                        ? formatDate(a.updatedAt)
                        : formatDate(a.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/contractors/${a.id}`}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800"
                        >
                          View
                        </Link>
                        {(view === "pending" || view === "looking") && (
                          <>
                            <form action={approve}>
                              <button
                                type="submit"
                                className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                              >
                                Approve
                              </button>
                            </form>
                            {view === "pending" && a.status !== "Looking" && (
                              <form action={markLooking}>
                                <button
                                  type="submit"
                                  className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                                >
                                  Looking
                                </button>
                              </form>
                            )}
                            <form action={reject}>
                              <button
                                type="submit"
                                className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
                              >
                                Reject
                              </button>
                            </form>
                          </>
                        )}
                        {view === "approved" && (
                          <Badge variant="Active">Active</Badge>
                        )}
                        {view === "benched" && (
                          <>
                            <form action={reactivate}>
                              <button
                                type="submit"
                                className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                              >
                                Reactivate
                              </button>
                            </form>
                            <Badge variant="Inactive">Inactive</Badge>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-gray-500">
            {view === "approved"
              ? "No approved contractors awaiting placement."
              : view === "looking"
              ? "No contractors marked as Looking."
              : view === "benched"
              ? "No one benched — every inactive contractor is either back to work or genuinely gone."
              : "No pending applications."}
          </p>
        </div>
      )}
    </div>
  );
}
