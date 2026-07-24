"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Clock, ShieldCheck, FileUp, LogOut, User, MessageSquare, Receipt, CalendarDays } from "lucide-react";
import { useEffect } from "react";

const portalNav = [
  { name: "Home", href: "/portal", icon: LayoutDashboard },
  { name: "Timesheets", href: "/portal/timesheets", icon: Clock },
  { name: "Expenses", href: "/portal/expenses", icon: Receipt },
  { name: "Holiday", href: "/portal/holiday", icon: CalendarDays },
  { name: "Documents", href: "/portal/documents", icon: FileUp },
  { name: "Compliance", href: "/portal/compliance", icon: ShieldCheck },
  { name: "Profile", href: "/portal/profile", icon: User },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const router = useRouter();

  // Auto-refresh every 30s + when tab becomes visible
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), 30000);
    function onVisible() {
      if (document.visibilityState === "visible") router.refresh();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-first top nav */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-3xl px-4">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/prl_logo.jpg" alt="PRL" width={32} height={32} className="rounded-full" />
              <div>
                <p className="text-sm font-bold text-gray-900 leading-tight">Contractor Portal</p>
                <p className="text-[10px] text-gray-500">{session?.user?.name || ""}</p>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-4 py-4 pb-24">
        {children}
      </main>

      {/* Bottom tab bar (mobile-friendly) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white safe-area-bottom">
        <div className="mx-auto max-w-3xl flex">
          {portalNav.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/portal" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors",
                  isActive ? "text-blue-600" : "text-gray-500"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive ? "text-blue-600" : "text-gray-400")} />
                {item.name.replace("My ", "")}
              </Link>
            );
          })}
          <a
            href={`mailto:info@prlsitesolutions.co.uk?subject=${encodeURIComponent(
              `Pay Query — ${session?.user?.name || ""}`
            )}`}
            className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium text-gray-500 transition-colors"
          >
            <MessageSquare className="h-5 w-5 text-gray-400" />
            Pay Query
          </a>
        </div>
      </nav>
    </div>
  );
}
