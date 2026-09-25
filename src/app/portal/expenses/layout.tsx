import { redirect } from "next/navigation";
import { portalFeatureEnabled } from "@/lib/portal-features";

// Hidden feature: old links and bookmarks land on the portal home instead.
export default function PortalExpensesLayout({ children }: { children: React.ReactNode }) {
  if (!portalFeatureEnabled("expenses")) redirect("/portal");
  return children;
}
