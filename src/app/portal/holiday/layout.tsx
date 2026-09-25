import { redirect } from "next/navigation";
import { portalFeatureEnabled } from "@/lib/portal-features";

// Hidden feature: old links and bookmarks land on the portal home instead.
export default function PortalHolidayLayout({ children }: { children: React.ReactNode }) {
  if (!portalFeatureEnabled("holiday")) redirect("/portal");
  return children;
}
