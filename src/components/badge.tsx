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

/**
 * Status families → PRISM tone tokens (see PRISM-CLAUDE-UI-BRIEF.md). Every
 * status string should render through StatusBadge instead of an ad-hoc
 * bg-*-600 class, so the same status reads the same colour everywhere.
 */
type StatusTone = "ok" | "info" | "warn" | "bad" | "muted";

const STATUS_TONE: Record<string, StatusTone> = {
  // Live / good
  Active: "ok",
  Verified: "ok",
  Approved: "ok",
  Paid: "ok",
  New: "ok",
  Mitigated: "ok",
  Closed: "ok",
  // Wait
  Submitted: "info",
  Pending: "info",
  Draft: "info",
  Reconciling: "info",
  Placed: "info",
  "In Progress": "info",
  Accepted: "info",
  Scheduled: "info",
  "On Site": "info",
  "Tier 1": "info",
  Applied: "info",
  "Awaiting Verification": "info",
  // Attention
  Ending: "warn",
  Expiring: "warn",
  "On Hold": "warn",
  Exception: "warn",
  Open: "warn",
  Benched: "warn",
  "Pending Docs": "warn",
  Minor: "warn",
  Major: "warn",
  Medium: "warn",
  "Tier 2": "warn",
  Holiday: "warn",
  // Stop
  Expired: "bad",
  Rejected: "bad",
  Left: "bad",
  Suspended: "bad",
  "Non-Compliant": "bad",
  Overdue: "bad",
  Critical: "bad",
  High: "bad",
  // Neutral
  Inactive: "muted",
  Completed: "muted",
  Cancelled: "muted",
  Planned: "muted",
  Proposed: "muted",
  "Tier 3": "muted",
  Low: "muted",
};

const TONE_CLASSES: Record<StatusTone, string> = {
  ok: "bg-prism-ok/10 text-prism-ok",
  info: "bg-prism-info/10 text-prism-info",
  warn: "bg-prism-warn/10 text-prism-warn",
  bad: "bg-prism-bad/10 text-prism-bad",
  muted: "bg-prism-line/60 text-prism-ink-muted",
};

export function getStatusTone(value: string): StatusTone {
  return STATUS_TONE[value] ?? "muted";
}

export function StatusBadge({ value, className }: { value: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONE_CLASSES[getStatusTone(value)],
        className
      )}
    >
      {value}
    </span>
  );
}
