export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Badge } from "@/components/badge";
import { formatDate } from "@/lib/utils";

export default async function PortalCompliancePage() {
  const session = await auth();
  const contractorId = (session?.user as { contractorId?: string })?.contractorId;
  if (!contractorId) redirect("/login");

  const records = await prisma.complianceRecord.findMany({
    where: { contractorId },
    orderBy: [{ status: "asc" }, { expiryDate: "asc" }],
  });

  const verified = records.filter((r) => r.status === "Verified").length;
  const total = records.length;
  const score = total > 0 ? Math.round((verified / total) * 100) : 0;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">My Compliance</h1>

      {/* Score */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 text-center">
        <p className={`text-4xl font-bold ${score >= 80 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-red-600"}`}>
          {score}%
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {verified} of {total} records verified
        </p>
      </div>

      {/* Records */}
      <div className="space-y-2">
        {records.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
            No compliance records on file.
          </div>
        ) : (
          records.map((record) => (
            <div
              key={record.id}
              className={`rounded-xl border bg-white px-4 py-3 ${
                record.status === "Expired" || record.status === "Non-Compliant"
                  ? "border-red-200 bg-red-50/30"
                  : record.status === "Expiring"
                  ? "border-amber-200 bg-amber-50/30"
                  : "border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">{record.type}</p>
                <Badge variant={record.status}>{record.status}</Badge>
              </div>
              <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                {record.reference && <span>Ref: {record.reference}</span>}
                {record.expiryDate && (
                  <span className={record.status === "Expired" ? "text-red-600 font-medium" : ""}>
                    Expires: {formatDate(record.expiryDate)}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <p className="text-[10px] text-gray-400 text-center">
        Contact PRL Site Solutions if any records need updating.
      </p>
    </div>
  );
}
