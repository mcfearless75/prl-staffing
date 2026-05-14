"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
} from "recharts";

export type WorkforceSlice = {
  name: string;
  value: number;
  color: string;
};

export type TypeCoverageBar = {
  type: string;
  contractors: number;
  verified: number;
  notVerified: number;
  percentage: number;
};

interface Props {
  workforce: WorkforceSlice[];
  typeCoverage: TypeCoverageBar[];
  totalContractors: number;
}

function CustomDonutLabel({
  cx,
  cy,
  total,
  compliant,
}: {
  cx: number;
  cy: number;
  total: number;
  compliant: number;
}) {
  return (
    <g>
      <text x={cx} y={cy - 10} textAnchor="middle" className="fill-gray-900" style={{ fontSize: 28, fontWeight: 700 }}>
        {compliant}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" className="fill-gray-400" style={{ fontSize: 12 }}>
        of {total} compliant
      </text>
    </g>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomBarTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as TypeCoverageBar;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-lg text-sm">
      <p className="font-semibold text-gray-900 mb-1">{d.type}</p>
      <p className="text-emerald-600">{d.verified} verified</p>
      <p className="text-gray-400">{d.notVerified} not verified</p>
      <p className="text-gray-700 font-medium mt-1">{d.contractors} contractors total</p>
      <p className="text-blue-600 font-bold">{d.percentage}% verified</p>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomDonutTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-2 shadow-lg text-sm">
      <span className="font-semibold" style={{ color: item.payload.color }}>{item.name}</span>
      <span className="ml-2 text-gray-700 font-bold">{item.value}</span>
    </div>
  );
}

export function ComplianceCharts({ workforce, typeCoverage, totalContractors }: Props) {
  const compliantCount = workforce.find((w) => w.name === "Fully Compliant")?.value ?? 0;
  const nonEmpty = workforce.filter((w) => w.value > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* Donut — Workforce Status Breakdown */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Workforce Compliance Status</h3>
        <p className="text-xs text-gray-400 mb-4">All {totalContractors} contractors</p>
        <div className="flex items-center gap-6">
          <div className="h-56 w-56 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={nonEmpty}
                  cx="50%"
                  cy="50%"
                  innerRadius={68}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {nonEmpty.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomDonutTooltip />} />
                <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 28, fontWeight: 700, fill: "#111827" }}>
                  {compliantCount}
                </text>
                <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 11, fill: "#9ca3af" }}>
                  of {totalContractors}
                </text>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2.5 flex-1 min-w-0">
            {workforce.map((item) => (
              <div key={item.name} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-gray-600 truncate">{item.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-gray-900">{item.value}</span>
                  <span className="text-[10px] text-gray-400 w-8 text-right">
                    {totalContractors > 0 ? Math.round((item.value / totalContractors) * 100) : 0}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Horizontal Bar — Document Type Coverage */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Document Coverage by Type</h3>
        <p className="text-xs text-gray-400 mb-4">Contractors with verified documents</p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={typeCoverage}
              layout="vertical"
              margin={{ top: 0, right: 48, left: 8, bottom: 0 }}
              barSize={14}
            >
              <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                type="number"
                domain={[0, totalContractors]}
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="type"
                width={90}
                tick={{ fontSize: 11, fill: "#374151" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "#f9fafb" }} />
              <Bar dataKey="notVerified" stackId="a" fill="#fee2e2" radius={[0, 0, 0, 0]} />
              <Bar dataKey="verified" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]}>
                <LabelList
                  dataKey="percentage"
                  position="right"
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any) => `${v}%`}
                  style={{ fontSize: 10, fill: "#6b7280", fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-4 rounded-sm bg-emerald-500 inline-block" />
            <span className="text-xs text-gray-500">Verified</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-4 rounded-sm bg-red-100 inline-block" />
            <span className="text-xs text-gray-500">Not yet verified</span>
          </div>
        </div>
      </div>
    </div>
  );
}
