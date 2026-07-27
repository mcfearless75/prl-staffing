"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { HELP_CONTENT } from "@/lib/help-content";
import { Search, Lightbulb, HelpCircle } from "lucide-react";

export default function HelpPage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return HELP_CONTENT;
    return HELP_CONTENT.map((section) => ({
      ...section,
      topics: section.topics.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.summary.toLowerCase().includes(q) ||
          t.tips?.some((tip) => tip.toLowerCase().includes(q))
      ),
    })).filter((section) => section.topics.length > 0);
  }, [query]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="PRISM Help Guide"
        description="What every page does and how to use it — search or browse by section."
      />

      <div className="relative max-w-lg">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={'Search help topics — e.g. "Sage", "AWR", "compliance score"...'}
          className="w-full rounded-lg border-2 border-gray-300 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-gray-500">No help topics match &quot;{query}&quot;.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {filtered.map((section) => (
            <div key={section.section}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
                {section.section}
              </h2>
              <div className="space-y-3">
                {section.topics.map((topic) => (
                  <div key={topic.slug} id={topic.slug} className="rounded-xl border border-gray-200 bg-white p-5 scroll-mt-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50">
                        <HelpCircle className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-semibold text-gray-900">{topic.title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-gray-600">{topic.summary}</p>
                        {topic.tips && topic.tips.length > 0 && (
                          <div className="mt-4 space-y-2">
                            {topic.tips.map((tip, i) => (
                              <div
                                key={i}
                                className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
                              >
                                <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                                <span>{tip}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
