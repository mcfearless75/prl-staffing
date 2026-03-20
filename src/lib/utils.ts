import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
    Active: "bg-emerald-100 text-emerald-700",
    Inactive: "bg-gray-100 text-gray-600",
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
    "Tier 1": "bg-blue-100 text-blue-700",
    "Tier 2": "bg-amber-100 text-amber-700",
    "Tier 3": "bg-gray-100 text-gray-600",
  };
  return colors[status] || "bg-gray-100 text-gray-600";
}
