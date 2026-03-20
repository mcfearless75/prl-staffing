import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Sidebar />
      <main className="ml-64 min-h-screen">
        <div className="p-8">{children}</div>
      </main>
    </>
  );
}
