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
  ClipboardList,
  LogOut,
  Receipt,
  Brain,
  Menu,
  X,
  Activity,
  Shield,
  UserPlus,
  MessageSquare,
  AlertCircle,
  FileText,
  UserCheck,
  Send,
  Wrench,
  HelpCircle,
} from "lucide-react";

// Grouped so staff can jump to a labeled section instead of scanning one long
// flat list — same items, same hrefs, same badges, just sectioned.
const navigationSections = [
  {
    title: "Overview",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard, badgeKey: null },
      { name: "Intelligence", href: "/intelligence", icon: Brain, badgeKey: null },
    ],
  },
  {
    title: "Recruitment",
    items: [
      { name: "Campaign", href: "/campaign", icon: Send, badgeKey: null },
      { name: "Applicants", href: "/applicants", icon: UserCheck, badgeKey: "pendingApplicants" as const },
      { name: "New Starters", href: "/new-starters", icon: UserPlus, badgeKey: "newStarters" as const },
      { name: "Onboarding", href: "/onboarding/submissions", icon: UserPlus, badgeKey: "pendingOnboarding" as const },
    ],
  },
  {
    title: "Workforce",
    items: [
      { name: "Subcontractors", href: "/contractors", icon: Users, badgeKey: null },
      { name: "Clients", href: "/companies", icon: Building2, badgeKey: null },
      { name: "Assignments", href: "/assignments", icon: ClipboardList, badgeKey: null },
    ],
  },
  {
    title: "Finance",
    items: [
      { name: "Timesheets", href: "/timesheets", icon: Clock, badgeKey: null },
      { name: "Billing", href: "/billing", icon: Receipt, badgeKey: "draftInvoices" as const },
      { name: "Rates", href: "/rates", icon: TrendingUp, badgeKey: null },
      { name: "Pay Queries", href: "/payment-queries", icon: MessageSquare, badgeKey: "openQueries" as const },
    ],
  },
  {
    title: "Compliance",
    items: [
      { name: "Compliance", href: "/compliance", icon: ShieldCheck, badgeKey: "complianceAlerts" as const },
      { name: "QMS", href: "/qms", icon: Shield, badgeKey: null },
      { name: "Grievances", href: "/grievances", icon: AlertCircle, badgeKey: "openGrievances" as const },
    ],
  },
  {
    title: "Insights",
    items: [
      { name: "Reports", href: "/reports", icon: FileText, badgeKey: null },
      { name: "Job Roles", href: "/job-roles", icon: Wrench, badgeKey: null },
      { name: "Activity Log", href: "/activity", icon: Activity, badgeKey: null },
    ],
  },
  {
    title: "",
    items: [
      { name: "Help", href: "/help", icon: HelpCircle, badgeKey: null },
    ],
  },
];

// Suppliers, Expenses and Projects are built and functional but hidden from
// nav per client request (2026-07-27) — routes still resolve directly by URL.
//
// AI Assistant hidden the same way (2026-08-10): PRL don't expect to use it.
// /ai and /api/ai are untouched and still work by direct URL, so putting it
// back is a one-line change here.

type Counts = {
  complianceAlerts: number;
  draftInvoices: number;
  pendingOnboarding: number;
  pendingApplicants: number;
  openQueries: number;
  openGrievances: number;
  newStarters: number;
};

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session } = useSession();
  const [counts, setCounts] = useState<Counts>({ complianceAlerts: 0, draftInvoices: 0, pendingOnboarding: 0, pendingApplicants: 0, openQueries: 0, openGrievances: 0, newStarters: 0 });

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
      <nav className="flex-1 space-y-1 overflow-y-auto p-3 lg:p-4">
        {navigationSections.map((section) => (
          <div key={section.title || "untitled"}>
            {section.title && (
              <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 first:pt-0">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
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
                        item.badgeKey === "complianceAlerts"
                          ? "bg-orange-500 text-white"
                          : "bg-blue-500 text-white"
                      )}>
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
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
            {counts.complianceAlerts > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500" />
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
