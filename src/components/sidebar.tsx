"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Building2,
  Clock,
  ShieldCheck,
  TrendingUp,
  Truck,
  ClipboardList,
  LogOut,
  Receipt,
  Brain,
  Menu,
  X,
  Activity,
  Shield,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, badgeKey: null },
  { name: "Intelligence", href: "/intelligence", icon: Brain, badgeKey: null },
  { name: "Contractors", href: "/contractors", icon: Users, badgeKey: null },
  { name: "Companies", href: "/companies", icon: Building2, badgeKey: null },
  { name: "Assignments", href: "/assignments", icon: ClipboardList, badgeKey: null },
  { name: "Timesheets", href: "/timesheets", icon: Clock, badgeKey: "pendingTimesheets" as const },
  { name: "Billing", href: "/billing", icon: Receipt, badgeKey: "draftInvoices" as const },
  { name: "Compliance", href: "/compliance", icon: ShieldCheck, badgeKey: "complianceAlerts" as const },
  { name: "Rates", href: "/rates", icon: TrendingUp, badgeKey: null },
  { name: "Suppliers", href: "/suppliers", icon: Truck, badgeKey: null },
  { name: "Activity Log", href: "/activity", icon: Activity, badgeKey: null },
  { name: "QMS", href: "/qms", icon: Shield, badgeKey: null },
];

type Counts = {
  pendingTimesheets: number;
  complianceAlerts: number;
  draftInvoices: number;
};

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session } = useSession();
  const [counts, setCounts] = useState<Counts>({ pendingTimesheets: 0, complianceAlerts: 0, draftInvoices: 0 });

  // Fetch badge counts on mount and every 30 seconds
  useEffect(() => {
    async function fetchCounts() {
      try {
        const res = await fetch("/api/counts");
        if (res.ok) {
          const data = await res.json();
          setCounts(data);
        }
      } catch {
        // silently fail
      }
    }
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const navContent = (
    <>
      {/* Logo */}
      <div className="flex h-16 lg:h-20 items-center gap-3 border-b border-gray-200 px-4">
        <img
          src="/prl_logo.jpg"
          alt="PRL Site Solutions"
          width={40}
          height={40}
          className="rounded-full lg:w-12 lg:h-12"
        />
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-gray-900 leading-tight truncate">PRL Site Solutions</h1>
          <p className="text-xs text-gray-500">Recruitment Specialists</p>
        </div>
        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3 lg:p-4">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const badgeCount = item.badgeKey ? counts[item.badgeKey] : 0;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 lg:py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="flex-1">{item.name}</span>
              {badgeCount > 0 && (
                <span className={cn(
                  "flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                  item.badgeKey === "pendingTimesheets"
                    ? "bg-red-500 text-white animate-pulse"
                    : item.badgeKey === "complianceAlerts"
                    ? "bg-orange-500 text-white"
                    : "bg-blue-500 text-white"
                )}>
                  {badgeCount > 99 ? "99+" : badgeCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User info + sign out */}
      <div className="border-t border-gray-200 p-3 lg:p-4">
        {session?.user?.name && (
          <p className="mb-2 truncate px-3 text-xs text-gray-500">
            Signed in as <span className="font-medium text-gray-700">{session.user.email}</span>
          </p>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 lg:py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 lg:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="relative rounded-lg p-1.5 text-gray-600 hover:bg-gray-100"
          >
            <Menu className="h-6 w-6" />
            {/* Red dot on hamburger when there are pending timesheets */}
            {counts.pendingTimesheets > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
            )}
          </button>
          <img
            src="/prl_logo.jpg"
            alt="PRL"
            width={32}
            height={32}
            className="rounded-full"
          />
          <span className="text-sm font-bold text-gray-900">PRL Site Solutions</span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          title="Sign out"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - mobile: slide-out drawer, desktop: fixed */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 flex h-screen w-72 lg:w-64 flex-col border-r border-gray-200 bg-white transition-transform duration-200 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {navContent}
      </aside>
    </>
  );
}
