import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import Link from "next/link";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  className?: string;
  href?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendUp,
  className,
  href,
}: StatCardProps) {
  const content = (
    <>
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-prism-canvas">
          <Icon className="h-5 w-5 text-prism-ink" />
        </div>
        {trend && (
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              trendUp
                ? "bg-prism-ok/10 text-prism-ok"
                : "bg-prism-bad/10 text-prism-bad"
            )}
          >
            {trend}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-prism-ink">{value}</p>
        <p className="text-sm text-prism-ink-muted">{subtitle || title}</p>
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          "block rounded-lg border border-prism-line bg-prism-paper p-6 shadow-[0_1px_2px_rgb(27_36_48_/_6%)] transition-colors hover:border-prism-ink/30 cursor-pointer",
          className
        )}
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-prism-line bg-prism-paper p-6 shadow-[0_1px_2px_rgb(27_36_48_/_6%)]",
        className
      )}
    >
      {content}
    </div>
  );
}
