// Folded into /portal/documents (App Invite Form, part C); the route layout
// redirects there. Kept as a thin wrapper so the checklist has one home.
export const dynamic = "force-dynamic";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ComplianceChecklist } from "../documents/compliance-checklist";

export default async function PortalCompliancePage() {
  const session = await auth();
  const contractorId = (session?.user as { contractorId?: string })?.contractorId;
  if (!contractorId) redirect("/login");
  return <ComplianceChecklist contractorId={contractorId} />;
}
