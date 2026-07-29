export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { formatDate, maskNI } from "@/lib/utils";

const STATEMENT_LABELS: Record<string, string> = {
  A: "A — First job since 6 April",
  B: "B — Had another job since 6 April",
  C: "C — Has another job or pension",
};

export default async function NewStartersPage() {
  const submissions = await prisma.newStarterSubmission.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Starter Checklists"
        description={`${submissions.length} submission${submissions.length === 1 ? "" : "s"} from the public new-starter form`}
      />

      {submissions.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Start Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Statement</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">NI Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Postcode</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {submissions.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {s.firstName} {s.lastName}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{s.email}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{s.phone}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{s.employmentStartDate}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500" title={STATEMENT_LABELS[s.employeeStatement] || s.employeeStatement}>
                      {s.employeeStatement}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {s.niNumber ? maskNI(s.niNumber) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{s.postcode || "—"}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{formatDate(s.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-gray-500">No new starter checklists submitted yet.</p>
        </div>
      )}
    </div>
  );
}
