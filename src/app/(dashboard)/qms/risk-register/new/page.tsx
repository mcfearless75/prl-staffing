"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { createRisk } from "../actions";

function calculateLevel(score: number): string {
  if (score >= 16) return "Critical";
  if (score >= 10) return "High";
  if (score >= 5) return "Medium";
  return "Low";
}

function getLevelColor(level: string) {
  switch (level) {
    case "Critical": return "bg-red-100 text-red-700 border-red-300";
    case "High": return "bg-orange-100 text-orange-700 border-orange-300";
    case "Medium": return "bg-yellow-100 text-yellow-700 border-yellow-300";
    case "Low": return "bg-green-100 text-green-700 border-green-300";
    default: return "bg-gray-100 text-gray-600 border-gray-300";
  }
}

const likelihoodLabels: Record<number, string> = {
  1: "Rare",
  2: "Unlikely",
  3: "Possible",
  4: "Likely",
  5: "Almost Certain",
};

const impactLabels: Record<number, string> = {
  1: "Negligible",
  2: "Minor",
  3: "Moderate",
  4: "Major",
  5: "Catastrophic",
};

export default function NewRiskPage() {
  const [likelihood, setLikelihood] = useState(3);
  const [impact, setImpact] = useState(3);

  const score = likelihood * impact;
  const level = calculateLevel(score);

  return (
    <div className="space-y-6">
      <PageHeader title="Add Risk" />

      <form action={createRisk} className="space-y-6">
        {/* Risk Details */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Risk Details</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. Loss of key personnel"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                required
                rows={3}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Describe the risk in detail..."
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                id="category"
                name="category"
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Operational">Operational</option>
                <option value="Financial">Financial</option>
                <option value="Compliance">Compliance</option>
                <option value="Reputational">Reputational</option>
                <option value="H&S">H&amp;S</option>
                <option value="IT/Data">IT/Data</option>
              </select>
            </div>

            <div>
              <label htmlFor="owner" className="block text-sm font-medium text-gray-700 mb-1">
                Owner <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="owner"
                name="owner"
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. Operations Director"
              />
            </div>
          </div>
        </div>

        {/* Risk Assessment */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Risk Assessment</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <label htmlFor="likelihood" className="block text-sm font-medium text-gray-700 mb-1">
                Likelihood (1-5) <span className="text-red-500">*</span>
              </label>
              <select
                id="likelihood"
                name="likelihood"
                value={likelihood}
                onChange={(e) => setLikelihood(parseInt(e.target.value))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {[1, 2, 3, 4, 5].map((v) => (
                  <option key={v} value={v}>
                    {v} — {likelihoodLabels[v]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="impact" className="block text-sm font-medium text-gray-700 mb-1">
                Impact (1-5) <span className="text-red-500">*</span>
              </label>
              <select
                id="impact"
                name="impact"
                value={impact}
                onChange={(e) => setImpact(parseInt(e.target.value))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {[1, 2, 3, 4, 5].map((v) => (
                  <option key={v} value={v}>
                    {v} — {impactLabels[v]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Calculated Score
              </label>
              <div className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${getLevelColor(level)}`}>
                <span className="text-lg font-bold">{score}</span>
                <span className="text-sm font-medium">{level}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Controls & Actions */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Controls &amp; Actions</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="existingControls" className="block text-sm font-medium text-gray-700 mb-1">
                Existing Controls
              </label>
              <textarea
                id="existingControls"
                name="existingControls"
                rows={3}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Current controls in place to mitigate this risk..."
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="additionalActions" className="block text-sm font-medium text-gray-700 mb-1">
                Additional Actions Required
              </label>
              <textarea
                id="additionalActions"
                name="additionalActions"
                rows={3}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Further actions needed to reduce risk..."
              />
            </div>

            <div>
              <label htmlFor="targetDate" className="block text-sm font-medium text-gray-700 mb-1">
                Target Date
              </label>
              <input
                type="date"
                id="targetDate"
                name="targetDate"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="reviewDate" className="block text-sm font-medium text-gray-700 mb-1">
                Review Date
              </label>
              <input
                type="date"
                id="reviewDate"
                name="reviewDate"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue="Active"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Active">Active</option>
                <option value="Mitigated">Mitigated</option>
                <option value="Closed">Closed</option>
                <option value="Accepted">Accepted</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            Create Risk
          </button>
          <a
            href="/qms/risk-register"
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
