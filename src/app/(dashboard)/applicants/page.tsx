export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { formatDate, getInitials } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { isPlaceholderEmail } from "@/lib/placeholder-email";
import { ApplicantInviteButton } from "./applicant-invite-button";

// dd/mm/yyyy in UK time, so a late-evening send doesn't show tomorrow's date.
function inviteDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { timeZone: "Europe/London" });
}

async function approveApplicant(id: string) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");
  // approvedAt is what welcomeAgent keys off. This is the canonical approval —
  // a deliberate, individual staff decision — so it is one of the only two
  // places that stamps it. Bulk imports and onboarding creates deliberately do
  // not, or an import would welcome everyone in the file at once.
  //
  // Approved means "accepted onto PRL's books", NOT "working": Active is kept
  // for people actually on a job (Erica, 2026-10-01 — approved website
  // applicants were showing as Active with no work). They are switched to
  // Active automatically when first placed (contractor-status.ts).
  await prisma.contractor.update({
    where: { id },
    data: { status: "Inactive", approvedAt: new Date() },
  });
  await logActivity("Applicant approved", "Contractor", id, "Status Inactive until placed on a job");
  revalidatePath("/applicants");
  revalidatePath("/contractors");
  revalidatePath("/");
}

async function rejectApplicant(id: string) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");
  await prisma.contractor.update({ where: { id }, data: { status: "Inactive" } });
  await logActivity("Applicant rejected", "Contractor", id);
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

export default async function ApplicantsPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const view = params?.view === "looking" ? "looking" : "pending";

  // Pending = Applied status
  // _count of Pending records = documents they uploaded in the app that staff
  // have not verified yet ("Waiting verification").
  const pendingDocs = { _count: { select: { compliances: { where: { status: "Pending" } } } } } as const;
  const applied = await prisma.contractor.findMany({
    where: { status: "Applied" },
    orderBy: { createdAt: "desc" },
    include: pendingDocs,
  });

  // Looking = contractors marked as actively looking
  const looking = await prisma.contractor.findMany({
    where: { status: "Looking" },
    orderBy: { updatedAt: "desc" },
    include: pendingDocs,
  });

  const activeList = view === "looking" ? looking : applied;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Applicants"
        description={
          view === "looking"
            ? `${looking.length} contractors actively looking`
            : `${applied.length} pending applications — verifying moves them to Subcontractors as Inactive until they're placed on a job`
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
                  {view === "looking" ? "Marked Looking" : "Applied"}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {activeList.map((a) => {
                const approve = approveApplicant.bind(null, a.id);
                const reject = rejectApplicant.bind(null, a.id);
                const markLooking = setLooking.bind(null, a.id);
                const inviteSentLabel = a.inviteSentAt ? inviteDate(a.inviteSentAt) : null;
                const hasEmail = Boolean(a.email?.trim()) && !isPlaceholderEmail(a.email);
                return (
                  <tr
                    key={a.id}
                    className={
                      view === "looking"
                        ? "bg-blue-50/20 hover:bg-blue-50"
                        : "bg-amber-50/30 hover:bg-amber-50"
                    }
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium text-white ${
                            view === "looking" ? "bg-blue-600" : "bg-amber-500"
                          }`}
                        >
                          {getInitials(a.firstName, a.lastName)}
                        </div>
                        <div>
                          <Link
                            href={`/contractors/${a.id}`}
                            className="text-sm font-medium text-gray-900 hover:text-blue-700 hover:underline"
                          >
                            {a.firstName} {a.lastName}
                          </Link>
                          {a._count.compliances > 0 && (
                            <Link
                              href="/compliance/review"
                              title={`${a._count.compliances} uploaded document${a._count.compliances === 1 ? "" : "s"} waiting to be checked`}
                              className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 hover:bg-amber-200"
                            >
                              Waiting verification
                            </Link>
                          )}
                          {inviteSentLabel && (
                            <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                              Invite sent {inviteSentLabel}
                            </span>
                          )}
                        </div>
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
                      {view === "looking" ? formatDate(a.updatedAt) : formatDate(a.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/contractors/${a.id}`}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800"
                        >
                          View
                        </Link>
                        <ApplicantInviteButton
                          contractorId={a.id}
                          name={`${a.firstName} ${a.lastName}`.trim()}
                          sentLabel={inviteSentLabel}
                          disabledReason={hasEmail ? undefined : "No email address on file"}
                        />
                        <form action={approve}>
                          <button
                            type="submit"
                            className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                          >
                            Verify &amp; move to Subcontractors
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
            {view === "looking" ? "No contractors marked as Looking." : "No pending applications."}
          </p>
        </div>
      )}
    </div>
  );
}
