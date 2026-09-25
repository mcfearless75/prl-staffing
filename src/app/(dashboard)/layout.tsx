import { Sidebar } from "@/components/sidebar";
import { AutoRefresh } from "@/components/auto-refresh";
import { HelpButton } from "@/components/help-button";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Sidebar />
      {/* Auto-refresh every 30s — keeps dashboard, timesheets, compliance live */}
      <AutoRefresh intervalMs={30000} />
      <HelpButton />
      <main className="relative min-h-screen pt-14 lg:pt-0 lg:ml-64 bg-prism-canvas">
        {/* Full-screen watermark */}
        <div className="pointer-events-none fixed inset-0 lg:ml-64 flex items-center justify-center opacity-[0.03] z-0">
          <img
            src="/prl-logo.png"
            alt=""
            width={500}
            height={500}
            className="select-none"
          />
        </div>
        {/* No z-index on this or the footer: a z-index here traps every page
            modal's z-50 inside it, and the footer then paints over (and
            swallows clicks on) the bottom of the modal. */}
        <div className="relative p-4 lg:p-8">{children}</div>
        {/* Footer */}
        <footer className="relative border-t border-prism-line mt-8 px-4 lg:px-8 py-4 flex items-center gap-4">
          <img
            src="/cyber-essentials-white.png"
            alt="Cyber Essentials Certified"
            height={48}
            className="h-12 w-auto object-contain"
          />
          <img
            src="/iso-logo.png"
            alt="ISO 9001 Certified"
            height={48}
            className="h-12 w-auto object-contain"
          />
          <span className="text-xs text-prism-ink-muted">PRL Site Solutions — Cyber Essentials &amp; ISO 9001 Certified</span>
        </footer>
      </main>
    </>
  );
}
