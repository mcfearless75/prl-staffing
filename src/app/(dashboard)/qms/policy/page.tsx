export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { formatDate } from "@/lib/utils";
import { AcknowledgeButton } from "./acknowledge-button";
import { FileCheck } from "lucide-react";

export default async function QualityPolicyPage() {
  const session = await auth();
  const user = session?.user as { id?: string; email?: string; name?: string } | undefined;

  const acknowledgements = await prisma.policyAcknowledgement.findMany({
    where: { policyVersion: "1.0" },
    orderBy: { acknowledgedAt: "desc" },
  });

  const hasAcknowledged = user?.id
    ? acknowledgements.some((a) => a.userId === user.id)
    : false;

  return (
    <div className="space-y-6">
      <PageHeader title="Quality Policy" />

      {/* Policy Document */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="rounded-lg bg-blue-100 p-2.5">
            <FileCheck className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">PRL Site Solutions Quality Policy</h2>
            <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500">
              <span>Version: 1.0</span>
              <span>Effective: March 2026</span>
              <span>Approved By: Adella Thomas (Managing Director)</span>
            </div>
          </div>
        </div>

        <div className="prose prose-sm max-w-none text-gray-700">
          <p>
            PRL Site Solutions is committed to providing high-quality recruitment and workforce
            management services. We are dedicated to:
          </p>
          <ul className="space-y-3 mt-4">
            <li className="flex items-start gap-3">
              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">1</span>
              <span>Meeting and exceeding client expectations through reliable, compliant contractor placement.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">2</span>
              <span>Ensuring full regulatory compliance across all operations including IR35, right-to-work verification, and health &amp; safety standards.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">3</span>
              <span>Continuously improving our processes, systems, and services through regular review and innovation.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">4</span>
              <span>Maintaining transparent and auditable records across all aspects of our business.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">5</span>
              <span>Investing in our people, technology, and partnerships to deliver consistent, measurable quality.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Acknowledge Section */}
      {user?.id && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Policy Acknowledgement</h2>
          <p className="text-sm text-gray-600 mb-4">
            By acknowledging this policy, you confirm that you have read, understood, and agree to
            comply with the PRL Site Solutions Quality Policy.
          </p>
          <AcknowledgeButton
            userId={user.id}
            userEmail={user.email || ""}
            userName={user.name || ""}
            hasAcknowledged={hasAcknowledged}
          />
        </div>
      )}

      {/* Acknowledgement List */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">
          Staff Acknowledgements ({acknowledgements.length})
        </h2>
        {acknowledgements.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Policy Version
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Acknowledged
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {acknowledgements.map((ack) => (
                  <tr key={ack.id} className="hover:bg-gray-50 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {ack.userName}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {ack.userEmail}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      v{ack.policyVersion}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {formatDate(ack.acknowledgedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No acknowledgements yet.</p>
        )}
      </div>
    </div>
  );
}
