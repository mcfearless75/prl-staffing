import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Sidebar />
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
      </main>
    </>
  );
}
