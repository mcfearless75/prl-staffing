import Link from "next/link";
import { TAB_LABELS, type TabLabel } from "./types";

export function TabNav({
  contractorId,
  activeTab,
  compsCertsCount,
  activityCount,
  notesCount,
}: {
  contractorId: string;
  activeTab: TabLabel;
  compsCertsCount?: number;
  activityCount?: number;
  notesCount?: number;
}) {
  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex flex-wrap gap-x-6" aria-label="Contractor detail tabs">
        {TAB_LABELS.map((label) => {
          const isActive = label === activeTab;
          const badgeCount =
            label === "Comps & Certs"
              ? compsCertsCount
              : label === "Activity"
                ? activityCount
                : label === "Notes"
                  ? notesCount
                  : undefined;
          return (
            <Link
              key={label}
              href={`/contractors/${contractorId}?tab=${encodeURIComponent(label)}`}
              className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              {label}
              {badgeCount !== undefined && (
                <span className="ml-1.5 text-xs text-gray-400">({badgeCount})</span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
