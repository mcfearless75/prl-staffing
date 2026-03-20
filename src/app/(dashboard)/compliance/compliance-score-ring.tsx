export function ComplianceScoreRing({ score }: { score: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  let strokeColor: string;
  let bgColor: string;
  let textColor: string;

  if (score >= 80) {
    strokeColor = "stroke-emerald-500";
    bgColor = "stroke-emerald-100";
    textColor = "text-emerald-700";
  } else if (score >= 60) {
    strokeColor = "stroke-amber-500";
    bgColor = "stroke-amber-100";
    textColor = "text-amber-700";
  } else {
    strokeColor = "stroke-red-500";
    bgColor = "stroke-red-100";
    textColor = "text-red-700";
  }

  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          className={bgColor}
          strokeWidth="6"
        />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          className={strokeColor}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-sm font-bold ${textColor}`}>{score}%</span>
      </div>
    </div>
  );
}
