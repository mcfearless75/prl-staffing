"use client";

const DEFAULT_CLASS =
  "print:hidden inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2";

export function PrintButton({
  label = "Print Report",
  className = DEFAULT_CLASS,
}: {
  label?: string;
  className?: string;
} = {}) {
  return (
    <button onClick={() => window.print()} className={className}>
      {label}
    </button>
  );
}
