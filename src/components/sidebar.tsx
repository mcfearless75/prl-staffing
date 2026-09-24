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
  Phone,
  ChevronDown,
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
      { name: "Calls", href: "/calls", icon: Phone, badgeKey: "newCallEnquiries" as const },
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
//
// Assignments hidden the same way (2026-09-24): PRL want one place to manage
// a person's work, so assignments are reached from the subcontractor profile
// (Assignments tab, and "Current work" on Edit). /assignments still resolves.

type Counts = {
  complianceAlerts: number;
  draftInvoices: number;
  pendingOnboarding: number;
  pendingApplicants: number;
  openQueries: number;
  openGrievances: number;
  newStarters: number;
  newCallEnquiries: number;
};

const COLLAPSE_STORAGE_KEY = "prism-sidebar-collapsed-sections";

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session } = useSession();
  const [counts, setCounts] = useState<Counts>({ complianceAlerts: 0, draftInvoices: 0, pendingOnboarding: 0, pendingApplicants: 0, openQueries: 0, openGrievances: 0, newStarters: 0, newCallEnquiries: 0 });
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Restore collapsed sections from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(COLLAPSE_STORAGE_KEY);
      if (stored) setCollapsed(JSON.parse(stored));
    } catch {
      // ignore malformed/unavailable storage
    }
  }, []);

  // Always keep the section containing the active page expanded
  useEffect(() => {
    const activeSection = navigationSections.find((section) =>
      section.items.some(
        (item) => pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
      )
    );
    if (activeSection?.title) {
      setCollapsed((prev) => (prev[activeSection.title] ? { ...prev, [activeSection.title]: false } : prev));
    }
  }, [pathname]);

  function toggleSection(title: string) {
    setCollapsed((prev) => {
      const next = { ...prev, [title]: !prev[title] };
      try {
        localStorage.setItem(COLLAPSE_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore unavailable storage
      }
      return next;
    });
  }

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
      <div className="flex h-16 lg:h-20 items-center gap-3 border-b border-white/10 px-4">
        <img
          src="/prl-logo.png"
          alt="PRL Site Solutions"
          width={28}
          height={28}
          className="lg:w-8 lg:h-8"
        />
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-prism-paper leading-tight truncate">PRISM</h1>
          <p className="text-xs text-white/50 truncate">PRL Site Solutions</p>
        </div>
        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-prism-paper"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3 lg:p-4">
        {navigationSections.map((section) => {
          const isCollapsed = section.title ? !!collapsed[section.title] : false;
          return (
          <div key={section.title || "untitled"}>
            {section.title && (
              <button
                type="button"
                onClick={() => toggleSection(section.title)}
                aria-expanded={!isCollapsed}
                className="flex w-full items-center justify-between px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-white/40 first:pt-0 hover:text-white/70"
              >
                <span>{section.title}</span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 transition-transform duration-150",
                    isCollapsed && "-rotate-90"
                  )}
                />
              </button>
            )}
            <div className={cn("space-y-0.5", isCollapsed && "hidden")}>
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
                        ? "bg-white/10 text-prism-paper"
                        : "text-white/60 hover:bg-white/5 hover:text-prism-paper"
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    <span className="flex-1">{item.name}</span>
                    {badgeCount > 0 && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-prism-warn px-1.5 text-[10px] font-bold text-white">
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
          );
        })}
      </nav>

      {/* User info + sign out */}
      <div className="border-t border-white/10 p-3 lg:p-4">
        {session?.user?.name && (
          <p className="mb-2 truncate px-3 text-xs text-white/40">
            Signed in as <span className="font-medium text-white/70">{session.user.email}</span>
          </p>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 lg:py-2 text-sm font-medium text-white/60 hover:bg-white/5 hover:text-prism-paper transition-colors"
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
      <div className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-white/10 bg-prism-ink px-4 lg:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="relative rounded-lg p-1.5 text-white/60 hover:bg-white/10"
          >
            <Menu className="h-6 w-6" />
            {counts.complianceAlerts > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-prism-warn opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-prism-warn" />
              </span>
            )}
          </button>
          <img
            src="/prl-logo.png"
            alt="PRL"
            width={28}
            height={28}
          />
          <span className="text-sm font-bold text-prism-paper">PRISM</span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-prism-paper"
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
          "fixed top-0 left-0 z-50 flex h-screen w-72 lg:w-64 flex-col border-r border-white/10 bg-prism-ink transition-transform duration-200 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {navContent}
      </aside>
    </>
  );
}
