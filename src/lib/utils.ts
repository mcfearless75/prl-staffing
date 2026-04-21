import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Mask sensitive data - shows only last N characters
 * "AB123456C" → "•••••••6C"
 */
export function maskSensitive(value: string | null | undefined, showLast: number = 2): string {
  if (!value) return "-";
  if (value.length <= showLast) return "•".repeat(value.length);
  return "•".repeat(value.length - showLast) + value.slice(-showLast);
}

/**
 * Mask NI number - "AB123456C" → "••••••56C"
 */
export function maskNI(value: string | null | undefined): string {
  return maskSensitive(value, 3);
}

/**
 * Mask UTR number - "1234567890" → "•••••••890"
 */
export function maskUTR(value: string | null | undefined): string {
  return maskSensitive(value, 3);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    Applied: "bg-purple-100 text-purple-700",
    New: "bg-indigo-100 text-indigo-700",
    Active: "bg-emerald-100 text-emerald-700",
    "On Site": "bg-blue-100 text-blue-700",
    Benched: "bg-amber-100 text-amber-700",
    "Pending Docs": "bg-orange-100 text-orange-700",
    Suspended: "bg-red-100 text-red-700",
    Inactive: "bg-gray-100 text-gray-600",
    Left: "bg-rose-100 text-rose-700",
    "On Hold": "bg-amber-100 text-amber-700",
    Placed: "bg-blue-100 text-blue-700",
    Ending: "bg-orange-100 text-orange-700",
    Completed: "bg-gray-100 text-gray-600",
    Draft: "bg-gray-100 text-gray-600",
    Submitted: "bg-blue-100 text-blue-700",
    Approved: "bg-emerald-100 text-emerald-700",
    Rejected: "bg-red-100 text-red-700",
    Verified: "bg-emerald-100 text-emerald-700",
    Pending: "bg-gray-100 text-gray-600",
    Expiring: "bg-amber-100 text-amber-700",
    Expired: "bg-red-100 text-red-700",
    "Non-Compliant": "bg-red-100 text-red-700",
    Open: "bg-amber-100 text-amber-700",
    "In Progress": "bg-blue-100 text-blue-700",
    "Awaiting Verification": "bg-purple-100 text-purple-700",
    Closed: "bg-emerald-100 text-emerald-700",
    Overdue: "bg-red-100 text-red-700",
    Minor: "bg-yellow-100 text-yellow-700",
    Major: "bg-orange-100 text-orange-700",
    Critical: "bg-red-100 text-red-700",
    "Tier 1": "bg-blue-100 text-blue-700",
    "Tier 2": "bg-amber-100 text-amber-700",
    "Tier 3": "bg-gray-100 text-gray-600",
    Planned: "bg-gray-100 text-gray-600",
    Cancelled: "bg-gray-100 text-gray-600",
    Mitigated: "bg-emerald-100 text-emerald-700",
    Accepted: "bg-blue-100 text-blue-700",
    Scheduled: "bg-purple-100 text-purple-700",
    Proposed: "bg-gray-100 text-gray-600",
    High: "bg-red-100 text-red-700",
    Medium: "bg-amber-100 text-amber-700",
    Low: "bg-emerald-100 text-emerald-700",
  };
  return colors[status] || "bg-gray-100 text-gray-600";
}
