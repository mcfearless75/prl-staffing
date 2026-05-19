import { Sidebar } from "@/components/sidebar";
import { AutoRefresh } from "@/components/auto-refresh";

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
      <main className="relative min-h-screen pt-14 lg:pt-0 lg:ml-64">
        {/* Full-screen watermark */}
        <div className="pointer-events-none fixed inset-0 lg:ml-64 flex items-center justify-center opacity-[0.03] z-0">
          <img
            src="/prl_logo.jpg"
            alt=""
            width={500}
            height={500}
            className="select-none"
          />
        </div>
        <div className="relative z-10 p-4 lg:p-8">{children}</div>
        {/* Footer */}
        <footer className="relative z-10 border-t border-gray-100 mt-8 px-4 lg:px-8 py-4 flex items-center gap-4">
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
          <span className="text-xs text-gray-400">PRL Site Solutions — Cyber Essentials &amp; ISO 9001 Certified</span>
        </footer>
      </main>
    </>
  );
}
