"use client";

import { Download } from "lucide-react";

export function ChaseExportButton() {
  return (
    <a
      href="/api/admin/compliance-no-records-export"
      download="compliance-no-records.csv"
      className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
    >
      <Download className="h-4 w-4" />
      Export No-Records List
    </a>
  );
}
