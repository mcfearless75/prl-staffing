import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Sidebar />
      <main className="relative ml-64 min-h-screen">
        {/* Full-screen watermark */}
        <div className="pointer-events-none fixed inset-0 ml-64 flex items-center justify-center opacity-[0.03] z-0">
          <img
            src="/prl_logo.png"
            alt=""
            width={500}
            height={500}
            className="select-none"
          />
        </div>
        <div className="relative z-10 p-8">{children}</div>
      </main>
    </>
  );
}
