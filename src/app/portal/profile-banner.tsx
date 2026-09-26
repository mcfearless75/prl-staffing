import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { categoryForType } from "@/lib/compliance-types";
import { RTW_SATISFIED_STATUSES, normaliseShareCode, parseRtwRoute, rtwProgress } from "@/lib/rtw-route";
import { loadChecklistTypes } from "./documents/compliance-checklist";

/**
 * "Please complete your profile" on the portal home (Paul, 2026-09-26: everyone,
 * gently — nothing is locked). Shows until details are submitted AND Right to
 * Work is complete; cards are listed for guidance but don't keep it open,
 * since expiring cards are a normal, ongoing state.
 */
export async function ProfileBanner({ contractorId }: { contractorId: string }) {
  const [c, records, checklist] = await Promise.all([
    prisma.contractor.findUnique({
      where: { id: contractorId },
      select: { profileSubmittedAt: true, rtwRoute: true, shareCode: true },
    }),
    prisma.complianceRecord.findMany({
      where: { contractorId, status: { in: [...RTW_SATISFIED_STATUSES] } },
      select: { type: true },
    }),
    loadChecklistTypes(contractorId),
  ]);
  if (!c) return null;

  const satisfied = new Set(records.map((r) => r.type));
  const detailsDone = !!c.profileSubmittedAt;
  const rtwDone = rtwProgress(parseRtwRoute(c.rtwRoute), satisfied, !!normaliseShareCode(c.shareCode)).complete;
  if (detailsDone && rtwDone) return null;

  // Right to Work has its own step above, so the cards step skips that category.
  const cardsDone = checklist
    .filter((t) => t.isMandatory && categoryForType(t.type) !== "Right to Work")
    .every((t) => satisfied.has(t.type));

  const steps = [
    { label: "Your details", done: detailsDone, href: "/portal/profile" },
    { label: "Right to Work", done: rtwDone, href: "/portal/documents" },
    { label: "Cards and certificates", done: cardsDone, href: "/portal/documents" },
  ];
  const next = steps.find((s) => !s.done) ?? steps[0];

  return (
    <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
      <p className="text-sm font-semibold text-blue-900">Please complete your profile</p>
      <p className="mt-0.5 text-xs text-blue-700">PRL needs these before you can be placed on site.</p>
      <ul className="mt-3 space-y-1.5">
        {steps.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-sm">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full ${
                s.done ? "bg-emerald-500 text-white" : "border-2 border-blue-300 bg-white"
              }`}
            >
              {s.done && <Check className="h-3 w-3" />}
            </span>
            <span className={s.done ? "text-gray-500 line-through" : "text-gray-900"}>{s.label}</span>
          </li>
        ))}
      </ul>
      <Link
        href={next.href}
        className="mt-3 flex items-center justify-center gap-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
      >
        Continue <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
