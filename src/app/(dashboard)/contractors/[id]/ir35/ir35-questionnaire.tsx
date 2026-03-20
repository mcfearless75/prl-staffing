"use client";

import { useState, useTransition } from "react";
import { saveIR35Determination } from "./actions";
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";

type Question = {
  id: string;
  category: string;
  question: string;
  help: string;
  options: { label: string; value: string; weight: number }[];
};

const QUESTIONS: Question[] = [
  // Substitution
  {
    id: "substitution_right",
    category: "Right of Substitution",
    question:
      "Does the contractor have the right to send a substitute to do the work?",
    help: "A genuine right of substitution is a strong indicator of self-employment. The contractor should be able to send someone else in their place without the client's unreasonable refusal.",
    options: [
      { label: "Yes — unrestricted right", value: "yes_unrestricted", weight: 20 },
      { label: "Yes — but client must approve", value: "yes_approval", weight: 10 },
      { label: "No — must do the work personally", value: "no", weight: 0 },
    ],
  },
  {
    id: "substitution_exercised",
    category: "Right of Substitution",
    question:
      "Has the contractor ever actually sent a substitute or helper?",
    help: "If substitution has been exercised in practice, this strongly supports Outside IR35.",
    options: [
      { label: "Yes — has sent a substitute", value: "yes", weight: 15 },
      { label: "No — but the right exists", value: "no_right_exists", weight: 5 },
      { label: "No — and no right to do so", value: "no", weight: 0 },
    ],
  },
  // Control
  {
    id: "control_what",
    category: "Control",
    question:
      "Does the client decide what work the contractor does?",
    help: "If the client dictates the specific tasks rather than the end result, this indicates employment.",
    options: [
      { label: "No — contractor decides how to achieve the end result", value: "no", weight: 15 },
      { label: "Partially — client sets goals, contractor decides method", value: "partial", weight: 8 },
      { label: "Yes — client directs day-to-day tasks", value: "yes", weight: 0 },
    ],
  },
  {
    id: "control_how",
    category: "Control",
    question:
      "Does the client control how the work is done?",
    help: "If the contractor is free to use their own methods and expertise, this points to Outside IR35.",
    options: [
      { label: "No — contractor uses own methods/expertise", value: "no", weight: 15 },
      { label: "Some guidance but contractor has autonomy", value: "partial", weight: 8 },
      { label: "Yes — client dictates methods and processes", value: "yes", weight: 0 },
    ],
  },
  {
    id: "control_when",
    category: "Control",
    question:
      "Does the client control when and where the work is done?",
    help: "Flexibility over working hours and location suggests self-employment.",
    options: [
      { label: "No — contractor sets own schedule and location", value: "no", weight: 10 },
      { label: "Some flexibility but generally site-based/set hours", value: "partial", weight: 5 },
      { label: "Yes — fixed hours and location required", value: "yes", weight: 0 },
    ],
  },
  // Mutuality of Obligation
  {
    id: "moo_ongoing",
    category: "Mutuality of Obligation",
    question:
      "Is the client obliged to offer work, and the contractor obliged to accept it?",
    help: "If there's a mutual expectation of ongoing work beyond the current project, this indicates employment.",
    options: [
      { label: "No — project-by-project with no ongoing obligation", value: "no", weight: 15 },
      { label: "Partially — rolling contract but can be terminated", value: "partial", weight: 5 },
      { label: "Yes — ongoing expectation of work both ways", value: "yes", weight: 0 },
    ],
  },
  // Financial Risk
  {
    id: "financial_risk",
    category: "Financial Risk",
    question:
      "Does the contractor bear financial risk (e.g. fixing defective work at own cost, providing own equipment)?",
    help: "Self-employed individuals typically risk their own money. If they must fix mistakes unpaid or invest in their own tools/equipment, this indicates Outside IR35.",
    options: [
      { label: "Yes — significant financial risk (own tools, fix at own cost)", value: "yes", weight: 15 },
      { label: "Some — provides some equipment, limited risk", value: "partial", weight: 8 },
      { label: "No — client provides everything, paid regardless", value: "no", weight: 0 },
    ],
  },
  // Part and Parcel
  {
    id: "part_parcel",
    category: "Part and Parcel",
    question:
      "Is the contractor treated as part of the client's organisation?",
    help: "If the contractor has a staff badge, company email, attends staff meetings, or has line management responsibilities, this indicates Inside IR35.",
    options: [
      { label: "No — clearly separate from staff", value: "no", weight: 10 },
      { label: "Somewhat — uses client email/badge but not in org chart", value: "partial", weight: 3 },
      { label: "Yes — integrated into the team like an employee", value: "yes", weight: 0 },
    ],
  },
  // Business on Own Account
  {
    id: "business_own_account",
    category: "Business on Own Account",
    question:
      "Does the contractor operate as a genuine business (own website, multiple clients, business insurance)?",
    help: "Evidence of running a real business — marketing, multiple clients, business premises, professional indemnity insurance — strongly supports Outside IR35.",
    options: [
      { label: "Yes — clear business presence, multiple clients", value: "yes", weight: 15 },
      { label: "Somewhat — registered company but mainly one client", value: "partial", weight: 5 },
      { label: "No — works exclusively for this client", value: "no", weight: 0 },
    ],
  },
  // Contract Terms
  {
    id: "contract_terms",
    category: "Contract Terms",
    question:
      "Does the written contract reflect the actual working arrangement?",
    help: "HMRC looks at the reality, not just paperwork. But having a well-drafted contract that reflects the true arrangement helps.",
    options: [
      { label: "Yes — contract matches reality and supports self-employment", value: "yes", weight: 10 },
      { label: "Partially — some clauses don't reflect reality", value: "partial", weight: 3 },
      { label: "No — contract is generic or contradicts working practices", value: "no", weight: 0 },
    ],
  },
];

const CATEGORIES = [
  ...new Set(QUESTIONS.map((q) => q.category)),
];

function getDetermination(score: number): {
  status: string;
  color: string;
  description: string;
} {
  if (score >= 70) {
    return {
      status: "Outside",
      color: "text-emerald-700 bg-emerald-50 border-emerald-200",
      description:
        "Based on the answers provided, this engagement is likely Outside IR35. The contractor appears to be genuinely self-employed.",
    };
  }
  if (score >= 40) {
    return {
      status: "TBD",
      color: "text-amber-700 bg-amber-50 border-amber-200",
      description:
        "The determination is borderline. We recommend seeking specialist advice or using HMRC's CEST tool to confirm. Some factors point to employment, others to self-employment.",
    };
  }
  return {
    status: "Inside",
    color: "text-red-700 bg-red-50 border-red-200",
    description:
      "Based on the answers provided, this engagement is likely Inside IR35. The working practices suggest an employment relationship.",
  };
}

export function IR35Questionnaire({
  contractorId,
  contractorName,
  currentStatus,
}: {
  contractorId: string;
  contractorName: string;
  currentStatus: string | null;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResult, setShowResult] = useState(false);
  const [isPending, startTransition] = useTransition();

  const currentQuestion = QUESTIONS[currentStep];
  const totalQuestions = QUESTIONS.length;
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === totalQuestions;

  // Calculate score
  const score = QUESTIONS.reduce((total, q) => {
    const answer = answers[q.id];
    if (!answer) return total;
    const option = q.options.find((o) => o.value === answer);
    return total + (option?.weight ?? 0);
  }, 0);

  const maxScore = QUESTIONS.reduce(
    (total, q) => total + Math.max(...q.options.map((o) => o.weight)),
    0
  );
  const normalizedScore = Math.round((score / maxScore) * 100);
  const determination = getDetermination(normalizedScore);

  function selectAnswer(value: string) {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
  }

  function handleSave() {
    startTransition(async () => {
      await saveIR35Determination(
        contractorId,
        determination.status,
        Object.fromEntries(
          QUESTIONS.map((q) => [
            q.question,
            q.options.find((o) => o.value === answers[q.id])?.label ?? "—",
          ])
        ),
        normalizedScore
      );
    });
  }

  if (showResult) {
    return (
      <div className="space-y-6">
        {/* Result Card */}
        <div
          className={`rounded-xl border-2 p-6 ${determination.color}`}
        >
          <div className="flex items-center gap-3 mb-4">
            {determination.status === "Outside" ? (
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            ) : determination.status === "Inside" ? (
              <AlertTriangle className="h-8 w-8 text-red-600" />
            ) : (
              <HelpCircle className="h-8 w-8 text-amber-600" />
            )}
            <div>
              <h2 className="text-2xl font-bold">
                {determination.status} IR35
              </h2>
              <p className="text-sm opacity-80">
                Score: {normalizedScore}/100
              </p>
            </div>
          </div>
          <p className="text-sm leading-relaxed">{determination.description}</p>
        </div>

        {/* Score Breakdown */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Assessment Breakdown
          </h3>
          <div className="space-y-3">
            {CATEGORIES.map((cat) => {
              const catQuestions = QUESTIONS.filter(
                (q) => q.category === cat
              );
              const catScore = catQuestions.reduce((t, q) => {
                const a = answers[q.id];
                if (!a) return t;
                const opt = q.options.find((o) => o.value === a);
                return t + (opt?.weight ?? 0);
              }, 0);
              const catMax = catQuestions.reduce(
                (t, q) => t + Math.max(...q.options.map((o) => o.weight)),
                0
              );
              const catPct = catMax > 0 ? Math.round((catScore / catMax) * 100) : 0;

              return (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {cat}
                    </span>
                    <span className="text-xs text-gray-500">
                      {catScore}/{catMax}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-100">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        catPct >= 70
                          ? "bg-emerald-500"
                          : catPct >= 40
                            ? "bg-amber-500"
                            : "bg-red-500"
                      }`}
                      style={{ width: `${catPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Answer Summary */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Your Answers
          </h3>
          <div className="space-y-3">
            {QUESTIONS.map((q) => {
              const selected = q.options.find(
                (o) => o.value === answers[q.id]
              );
              return (
                <div key={q.id} className="text-sm">
                  <p className="font-medium text-gray-700">{q.question}</p>
                  <p className="text-gray-500 mt-0.5">
                    → {selected?.label ?? "—"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              setShowResult(false);
              setCurrentStep(0);
            }}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Review Answers
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isPending
              ? "Saving..."
              : `Save as "${determination.status} IR35"`}
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center">
          This tool provides guidance only and does not constitute legal advice.
          For complex cases, consult a qualified IR35 specialist or use HMRC&apos;s
          official CEST tool.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">
          Question {currentStep + 1} of {totalQuestions}
        </span>
        <span className="text-sm font-medium text-gray-700">
          {answeredCount}/{totalQuestions} answered
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100">
        <div
          className="h-2 rounded-full bg-blue-500 transition-all"
          style={{
            width: `${((currentStep + 1) / totalQuestions) * 100}%`,
          }}
        />
      </div>

      {/* Category Label */}
      <div className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
        {currentQuestion.category}
      </div>

      {/* Question */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          {currentQuestion.question}
        </h2>
        <p className="text-sm text-gray-500 mb-6">{currentQuestion.help}</p>

        <div className="space-y-3">
          {currentQuestion.options.map((option) => (
            <button
              key={option.value}
              onClick={() => selectAnswer(option.value)}
              className={`w-full rounded-lg border-2 px-4 py-3 text-left text-sm font-medium transition-all ${
                answers[currentQuestion.id] === option.value
                  ? "border-blue-500 bg-blue-50 text-blue-900"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
          disabled={currentStep === 0}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>

        <div className="flex gap-1.5">
          {QUESTIONS.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className={`h-2.5 w-2.5 rounded-full transition-all ${
                i === currentStep
                  ? "bg-blue-500 scale-125"
                  : answers[QUESTIONS[i].id]
                    ? "bg-blue-300"
                    : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        {currentStep < totalQuestions - 1 ? (
          <button
            onClick={() =>
              setCurrentStep((s) => Math.min(totalQuestions - 1, s + 1))
            }
            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={() => setShowResult(true)}
            disabled={!allAnswered}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            View Result
          </button>
        )}
      </div>

      {/* Quick jump when not all answered */}
      {currentStep === totalQuestions - 1 && !allAnswered && (
        <p className="text-center text-sm text-amber-600">
          Please answer all questions before viewing the result.
          {QUESTIONS.map((q, i) =>
            !answers[q.id] ? (
              <button
                key={q.id}
                onClick={() => setCurrentStep(i)}
                className="ml-1 underline"
              >
                Q{i + 1}
              </button>
            ) : null
          )}
        </p>
      )}
    </div>
  );
}
