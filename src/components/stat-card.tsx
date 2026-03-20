import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendUp,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 bg-white p-6",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
          <Icon className="h-5 w-5 text-blue-600" />
        </div>
        {trend && (
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              trendUp
                ? "bg-emerald-50 text-emerald-600"
                : "bg-red-50 text-red-600"
            )}
          >
            {trend}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{subtitle || title}</p>
      </div>
    </div>
  );
}
