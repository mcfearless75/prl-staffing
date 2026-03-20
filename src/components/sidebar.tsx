"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
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
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Contractors", href: "/contractors", icon: Users },
  { name: "Companies", href: "/companies", icon: Building2 },
  { name: "Assignments", href: "/assignments", icon: ClipboardList },
  { name: "Timesheets", href: "/timesheets", icon: Clock },
  { name: "Compliance", href: "/compliance", icon: ShieldCheck },
  { name: "Rates", href: "/rates", icon: TrendingUp },
  { name: "Suppliers", href: "/suppliers", icon: Truck },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-20 items-center gap-3 border-b border-gray-200 px-4">
        <img
          src="/prl_logo.jpg"
          alt="PRL Site Solutions"
          width={48}
          height={48}
          className="rounded-full"
        />
        <div>
          <h1 className="text-sm font-bold text-gray-900 leading-tight">PRL Site Solutions</h1>
          <p className="text-xs text-gray-500">Recruitment Specialists</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-gray-200 p-4">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
