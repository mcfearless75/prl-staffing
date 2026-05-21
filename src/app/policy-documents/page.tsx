import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const CATEGORY_ORDER = [
  "Compliance & Ethics",
  "Data & Privacy",
  "Health & Safety",
  "Business Operations",
  "Accreditations",
];

const CATEGORY_ICON: Record<string, string> = {
  "Compliance & Ethics": "⚖️",
  "Data & Privacy": "🔒",
  "Health & Safety": "🦺",
  "Business Operations": "🏢",
  "Accreditations": "🏅",
};

const FILE_BADGE: Record<string, { label: string; cls: string }> = {
  pdf:  { label: "PDF",  cls: "bg-red-100 text-red-700" },
  docx: { label: "DOCX", cls: "bg-blue-100 text-blue-700" },
  xlsx: { label: "XLSX", cls: "bg-green-100 text-green-700" },
};

export default async function PolicyDocumentsPage() {
  const policies = await prisma.policy.findMany({
    where: { isPublic: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  // Group by category
  const grouped: Record<string, typeof policies> = {};
  for (const p of policies) {
    if (!grouped[p.category]) grouped[p.category] = [];
    grouped[p.category].push(p);
  }

  const categories = CATEGORY_ORDER.filter((c) => grouped[c]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#005f8c] text-white">
        <div className="mx-auto max-w-3xl px-4 py-6 flex items-center gap-3">
          <img src="/prl_logo.jpg" alt="PRL" className="h-12 w-12 rounded-full" />
          <div>
            <h1 className="text-lg font-bold">PRL Site Solutions</h1>
            <p className="text-xs text-blue-200">Recruitment Specialists</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Company Policies</h2>
        <p className="text-sm text-gray-500 mb-8">
          The following policies apply to all workers and contractors engaged through PRL Site Solutions.
          Click any document to open or download it.
        </p>

        {policies.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-12 text-center">
            <p className="text-sm text-gray-400">No documents published yet.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {categories.map((category) => (
              <div key={category}>
                <h3 className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">
                  <span>{CATEGORY_ICON[category]}</span>
                  {category}
                </h3>
                <div className="space-y-2">
                  {grouped[category].map((policy) => {
                    const badge = FILE_BADGE[policy.fileType] || { label: policy.fileType.toUpperCase(), cls: "bg-gray-100 text-gray-600" };
                    return (
                      <a
                        key={policy.id}
                        href={`/api/policies/${policy.id}/download`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 hover:border-blue-300 hover:bg-blue-50/30 transition-all group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <svg className="w-5 h-5 text-gray-400 shrink-0 group-hover:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{policy.name}</p>
                            {(policy.description || policy.version) && (
                              <p className="text-xs text-gray-500 truncate">
                                {[policy.description, policy.version ? `v${policy.version}` : null].filter(Boolean).join(" · ")}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-4">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.cls}`}>
                            {badge.label}
                          </span>
                          <svg className="w-4 h-4 text-gray-300 group-hover:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 text-center text-xs text-gray-400 pb-8">
          <p>PRL Site Solutions | 0800 772 3959 | info@prlsitesolutions.co.uk</p>
          <p className="mt-1">259 Wallasey Village, Wallasey, Wirral, Merseyside CH45 3LR</p>
        </div>
      </div>
    </div>
  );
}
