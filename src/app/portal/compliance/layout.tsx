import { redirect } from "next/navigation";

// The Compliance tab was folded into Documents (App Invite Form, part C). Old
// links, bookmarks and emails land there instead of a dead end.
export default function PortalComplianceLayout() {
  redirect("/portal/documents");
}
