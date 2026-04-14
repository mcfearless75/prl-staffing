export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { formatDate, getInitials } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

async function approveApplicant(id: string) {
  "use server";
  const session = await auth();
  if (!session?.user) redirect("/login");
  await prisma.contractor.update({ where: { id }, data: { status: "Active" } });
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

export default async function ApplicantsPage() {
  const applicants = await prisma.contractor.findMany({
    where: { status: "Pending" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="New Applicants" description={`${applicants.length} pending applications`} />

      {applicants.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Job Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Applied</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {applicants.map((a) => {
                const approve = approveApplicant.bind(null, a.id);
                const reject = rejectApplicant.bind(null, a.id);
                return (
                  <tr key={a.id} className="bg-amber-50/30 hover:bg-amber-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500 text-sm font-medium text-white">{getInitials(a.firstName, a.lastName)}</div>
                        <span className="text-sm font-medium text-gray-900">{a.firstName} {a.lastName}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{a.email}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{a.phone || "—"}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{a.jobTitle || "—"}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{formatDate(a.createdAt)}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/contractors/${a.id}`} className="text-xs font-medium text-blue-600 hover:text-blue-800">View</Link>
                        <form action={approve}><button type="submit" className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700">Approve</button></form>
                        <form action={reject}><button type="submit" className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700">Reject</button></form>
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
          <p className="text-sm text-gray-500">No pending applications.</p>
        </div>
      )}
    </div>
  );
}
