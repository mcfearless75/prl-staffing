import { cn, getStatusColor } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: string;
  className?: string;
}

export function Badge({ children, variant, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variant ? getStatusColor(variant) : "bg-gray-100 text-gray-600",
        className
      )}
    >
      {children}
    </span>
  );
}
