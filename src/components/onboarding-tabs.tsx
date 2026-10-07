import Link from "next/link";

export type OnboardingTab = "agreements" | "new-starters" | "checklists";

const TABS: { key: OnboardingTab; label: string; href: string }[] = [
  { key: "agreements", label: "Agreements", href: "/onboarding/submissions" },
  { key: "new-starters", label: "New starters (placed)", href: "/new-starters" },
  { key: "checklists", label: "Starter checklists", href: "/new-starters?tab=checklists" },
];

/**
 * One Onboarding area (Erica, 2026-10-07: "new starters need to move to the
 * onboarding tab" — placed people belong in onboarding). The pages keep their
 * own URLs; this bar ties them together under the single sidebar item.
 */
export function OnboardingTabs({ active }: { active: OnboardingTab }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            t.key === active ? "bg-[#005f8c] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
