"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";

interface SurveyResponse {
  id: string;
  createdAt: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  dateOfService: string | null;
  overallSatisfaction: number;
  qualityOfWorkers: number;
  communication: number;
  compliance: number;
  valueForMoney: number;
  recommend: string;
  whatDidWell: string;
  whatToImprove: string;
  otherComments: string;
}

function Stars({ count }: { count: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          className={`h-4 w-4 ${s <= count ? "text-yellow-400 fill-yellow-400" : "text-gray-300 fill-gray-300"}`}
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1}
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </span>
  );
}

export default function CustomerFeedbackPage() {
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/qms-reports/customer-feedback")
      .then((res) => res.json())
      .then((data) => {
        setResponses(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const totalResponses = responses.length;
  const avgScore =
    totalResponses > 0
      ? (responses.reduce((sum, r) => sum + (r.overallSatisfaction || 0), 0) / totalResponses).toFixed(1)
      : "0.0";
  const yesCount = responses.filter((r) => r.recommend === "Yes").length;
  const recommendRate = totalResponses > 0 ? Math.round((yesCount / totalResponses) * 100) : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Customer Feedback" />
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Feedback"
        action={
          <Link
            href="/qms/reports"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to Reports
          </Link>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Average Score</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">{avgScore}</span>
            <span className="text-sm text-gray-500">/ 5</span>
          </div>
          <Stars count={Math.round(Number(avgScore))} />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Responses</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{totalResponses}</p>
          <p className="text-xs text-gray-500 mt-1">survey submissions</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Recommendation Rate</p>
          <p className="mt-1 text-3xl font-bold text-emerald-600">{recommendRate}%</p>
          <p className="text-xs text-gray-500 mt-1">would recommend PRL</p>
        </div>
      </div>

      {/* Responses Table */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">All Survey Responses</h2>
        </div>

        {responses.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-500">
            No survey responses yet. Share the survey link with your clients to start collecting feedback.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Company</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Contact</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Overall Score</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Recommend</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600"></th>
                </tr>
              </thead>
              <tbody>
                {responses.map((r) => (
                  <>
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{r.companyName}</td>
                      <td className="px-4 py-3 text-gray-600">{r.contactName}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(r.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3">
                        <Stars count={r.overallSatisfaction || 0} />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            r.recommend === "Yes"
                              ? "bg-emerald-100 text-emerald-700"
                              : r.recommend === "No"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {r.recommend || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800"
                        >
                          {expandedId === r.id ? "Hide" : "View"}
                        </button>
                      </td>
                    </tr>
                    {expandedId === r.id && (
                      <tr key={`${r.id}-details`} className="bg-gray-50">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Quality of Workers</p>
                              <Stars count={r.qualityOfWorkers || 0} />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Communication</p>
                              <Stars count={r.communication || 0} />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Compliance & Docs</p>
                              <Stars count={r.compliance || 0} />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Value for Money</p>
                              <Stars count={r.valueForMoney || 0} />
                            </div>
                            {r.dateOfService && (
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Service Date</p>
                                <p className="text-sm text-gray-900">{new Date(r.dateOfService).toLocaleDateString("en-GB")}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Email</p>
                              <p className="text-sm text-gray-900">{r.contactEmail}</p>
                            </div>
                          </div>
                          {(r.whatDidWell || r.whatToImprove || r.otherComments) && (
                            <div className="mt-4 space-y-3 border-t border-gray-200 pt-4">
                              {r.whatDidWell && (
                                <div>
                                  <p className="text-xs font-medium text-gray-500">What we did well</p>
                                  <p className="text-sm text-gray-900 mt-0.5">{r.whatDidWell}</p>
                                </div>
                              )}
                              {r.whatToImprove && (
                                <div>
                                  <p className="text-xs font-medium text-gray-500">What to improve</p>
                                  <p className="text-sm text-gray-900 mt-0.5">{r.whatToImprove}</p>
                                </div>
                              )}
                              {r.otherComments && (
                                <div>
                                  <p className="text-xs font-medium text-gray-500">Other comments</p>
                                  <p className="text-sm text-gray-900 mt-0.5">{r.otherComments}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
