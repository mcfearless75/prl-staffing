export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Plus } from "lucide-react";
import { deleteApprovalChain } from "./actions";

export default async function ApprovalChainsPage() {
  const chains = await prisma.approvalChain.findMany({
    include: {
      company: true,
      steps: { orderBy: { stepOrder: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approval Chains"
        description="Configure multi-step approval workflows per company. Timesheets follow these chains when submitted."
        action={
          <Link
            href="/timesheets/approval-chains/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Chain
          </Link>
        }
      />

      {chains.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
            <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 0 0 2.25-2.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v2.25A2.25 2.25 0 0 0 6 10.5Zm0 9.75h2.25A2.25 2.25 0 0 0 10.5 18v-2.25a2.25 2.25 0 0 0-2.25-2.25H6a2.25 2.25 0 0 0-2.25 2.25V18A2.25 2.25 0 0 0 6 20.25Zm9.75-9.75H18a2.25 2.25 0 0 0 2.25-2.25V6A2.25 2.25 0 0 0 18 3.75h-2.25A2.25 2.25 0 0 0 13.5 6v2.25a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">
            No approval chains configured.{" "}
            <Link href="/timesheets/approval-chains/new" className="text-blue-600 hover:underline">
              Create your first chain
            </Link>
          </p>
          <p className="mt-2 text-xs text-gray-400">
            Without a chain, timesheets use simple single-step approval.
            Standard timesheets (≤40h, no overtime) are auto-approved.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {chains.map((chain) => {
            const deleteAction = deleteApprovalChain.bind(null, chain.id);
            return (
              <div key={chain.id} className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{chain.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {chain.company ? chain.company.name : "Default (all companies)"}
                    </p>
                  </div>
                  <form action={deleteAction}>
                    <button
                      type="submit"
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </form>
                </div>

                {/* Steps visualization */}
                <div className="flex items-center gap-3">
                  {chain.steps.map((step, index) => (
                    <div key={step.id} className="flex items-center gap-3">
                      <div className="flex flex-col items-center">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                          {step.stepOrder}
                        </div>
                        <p className="mt-1 text-[11px] font-medium text-gray-600 text-center max-w-[80px]">
                          {step.label}
                        </p>
                        <p className="text-[10px] text-gray-400">{step.approverRole}</p>
                      </div>
                      {index < chain.steps.length - 1 && (
                        <div className="h-0.5 w-8 bg-blue-200 -mt-6" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">How Approval Chains Work</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <span className="text-emerald-500 mt-0.5">✓</span>
            <span><strong>Auto-approve:</strong> Standard timesheets (≤40h, no overtime, no exceptions) are automatically approved</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-500 mt-0.5">→</span>
            <span><strong>Chain approval:</strong> Timesheets with overtime or exceptions follow the configured approval chain step by step</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-500 mt-0.5">!</span>
            <span><strong>Exceptions:</strong> Bank holiday hours, excessive hours (60h+), and zero-hour submissions are always flagged for manual review</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
