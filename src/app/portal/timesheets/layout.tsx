import { redirect } from "next/navigation";
import { portalFeatureEnabled } from "@/lib/portal-features";

// Hidden feature: old links and bookmarks land on the portal home instead.
export default function PortalTimesheetsLayout({ children }: { children: React.ReactNode }) {
  if (!portalFeatureEnabled("timesheets")) redirect("/portal");
  return children;
}
