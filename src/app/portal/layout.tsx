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
    <div className="min-h-screen bg-prism-canvas">
      {/* Mobile-first top nav */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-prism-ink">
        <div className="mx-auto max-w-3xl px-4">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/prl-logo.png" alt="PRL" width={28} height={28} />
              <div>
                <p className="text-sm font-bold text-prism-paper leading-tight">PRISM Portal</p>
                <p className="text-[10px] text-white/50">{session?.user?.name || ""}</p>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-lg p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-prism-paper"
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
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-prism-line bg-prism-paper safe-area-bottom">
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
                  "flex flex-1 flex-col items-center gap-0.5 py-2.5 min-h-[44px] text-[10px] font-medium transition-colors",
                  isActive ? "text-prism-ink" : "text-prism-ink-muted"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive ? "text-prism-ink" : "text-prism-ink-muted")} />
                {item.name.replace("My ", "")}
              </Link>
            );
          })}
          <Link
            href="/portal/pay-query"
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2.5 min-h-[44px] text-[10px] font-medium transition-colors",
              pathname.startsWith("/portal/pay-query") ? "text-prism-ink" : "text-prism-ink-muted"
            )}
          >
            <MessageSquare
              className={cn("h-5 w-5", pathname.startsWith("/portal/pay-query") ? "text-prism-ink" : "text-prism-ink-muted")}
            />
            Pay Query
          </Link>
        </div>
      </nav>
    </div>
  );
}
