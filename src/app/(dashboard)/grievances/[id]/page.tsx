import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { updateGrievanceStatus } from "../actions";

export const dynamic = "force-dynamic";

const statusColour: Record<string, string> = {
  Open: "bg-red-100 text-red-700",
  Assigned: "bg-yellow-100 text-yellow-700",
  Resolved: "bg-green-100 text-green-700",
  Closed: "bg-gray-100 text-gray-500",
};

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <tr>
      <td className="py-2 pr-4 text-xs text-gray-500 whitespace-nowrap align-top w-36">{label}</td>
      <td className="py-2 text-sm text-gray-900">{value}</td>
    </tr>
  );
}

export default async function GrievanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const grievance = await prisma.grievance.findUnique({ where: { id } });
  if (!grievance) notFound();

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      {/* Back */}
      <Link href="/grievances" className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1 mb-4">
        ← Back to Grievances
      </Link>

      {/* Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 mb-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded-lg bg-purple-100 px-2.5 py-1 text-xs font-bold text-purple-700">{grievance.ticketNumber}</span>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusColour[grievance.status] || "bg-gray-100 text-gray-500"}`}>
                {grievance.status}
              </span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">{grievance.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{grievance.grievanceType || "General grievance"}</p>
          </div>
          <p className="text-xs text-gray-400">
            Submitted {new Date(grievance.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Details */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 mb-4">
        <h2 className="text-sm font-bold text-gray-900 mb-3">Details</h2>
        <table className="w-full">
          <tbody>
            <Row label="Email" value={grievance.email} />
            <Row label="Phone" value={grievance.phone} />
            <Row label="Role" value={grievance.role} />
            <Row label="Site / Employer" value={grievance.site} />
            <Row label="Incident Date" value={grievance.incidentDate} />
            <Row label="Raised Informally" value={grievance.raisedInformally} />
            <Row label="Witnesses" value={grievance.witnesses} />
          </tbody>
        </table>
      </div>

      {/* Description */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 mb-4">
        <h2 className="text-sm font-bold text-gray-900 mb-2">Description</h2>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{grievance.description}</p>
      </div>

      {/* Desired Outcome */}
      {grievance.desiredOutcome && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 mb-4">
          <h2 className="text-sm font-bold text-gray-900 mb-2">Desired Outcome</h2>
          <p className="text-sm text-gray-700">{grievance.desiredOutcome}</p>
        </div>
      )}

      {/* Resolution Notes */}
      {grievance.resolutionNotes && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 mb-4">
          <h2 className="text-sm font-bold text-emerald-800 mb-2">Resolution Notes</h2>
          <p className="text-sm text-emerald-900">{grievance.resolutionNotes}</p>
          {grievance.resolvedBy && (
            <p className="text-xs text-emerald-600 mt-2">
              Resolved by {grievance.resolvedBy}{" "}
              {grievance.resolvedAt && `on ${new Date(grievance.resolvedAt).toLocaleDateString("en-GB")}`}
            </p>
          )}
        </div>
      )}

      {/* Signature */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 mb-4">
        <p className="text-xs text-gray-500">Signed by: <span className="font-semibold text-gray-800">{grievance.signature}</span></p>
      </div>

      {/* Actions */}
      {grievance.status !== "Closed" && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Update Status</h2>
          <form action={async (fd: FormData) => {
            "use server";
            const newStatus = fd.get("status") as string;
            const notes = fd.get("notes") as string;
            await updateGrievanceStatus(id, newStatus, notes || undefined);
          }}>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">New Status</label>
                <select name="status" defaultValue={grievance.status} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500">
                  <option value="Open">Open</option>
                  <option value="Assigned">Assigned</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={grievance.resolutionNotes || ""}
                  placeholder="Add resolution notes or comments..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
                />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 transition-colors"
              >
                Update Status
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
