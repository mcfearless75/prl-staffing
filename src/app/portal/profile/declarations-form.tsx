"use client";

import { useEffect, useState } from "react";
import { HeartPulse } from "lucide-react";

type Answers = {
  hasMedicalCondition: string;
  medicalConditions: string;
  canTakeDaTest: string;
  hasUnspentConviction: string;
  declarationTrue: boolean;
};

const EMPTY: Answers = {
  hasMedicalCondition: "",
  medicalConditions: "",
  canTakeDaTest: "",
  hasUnspentConviction: "",
  declarationTrue: false,
};

function YesNo({ name, value, onChange }: { name: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="mt-2 flex gap-2" role="radiogroup">
      {["Yes", "No"].map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={value === o}
          aria-label={`${name}: ${o}`}
          onClick={() => onChange(o)}
          className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium ${
            value === o ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-300 bg-white text-gray-700"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

/**
 * Health & declarations — medical, drugs & alcohol and criminal record. Saved
 * separately from the profile, encrypted, and seen only by PRL admins.
 */
export function DeclarationsForm() {
  const [a, setA] = useState<Answers>(EMPTY);
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ complete: boolean; daBlocked: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/portal/declarations")
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) return setState("unavailable");
        setA({ ...EMPTY, ...(await res.json()) });
        setState("ready");
      })
      .catch(() => !cancelled && setState("unavailable"));
    return () => {
      cancelled = true;
    };
  }, []);

  const set = <K extends keyof Answers>(k: K) => (v: Answers[K]) => {
    setA((prev) => ({ ...prev, [k]: v }));
    setResult(null);
  };

  async function save() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/portal/declarations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(a),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || "Could not save. Please try again.");
      else setResult({ complete: data.complete, daBlocked: data.daBlocked });
    } catch {
      setError("Could not save. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (state === "unavailable") return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <HeartPulse className="h-4 w-4 text-gray-400" /> Health &amp; declarations
        </h2>
      </div>

      {state === "loading" ? (
        <p className="px-4 py-6 text-center text-sm text-gray-500">Loading…</p>
      ) : (
        <div className="space-y-5 p-4">
          <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
            We ask these so we can keep you and others safe on site and meet our clients&apos; requirements.
            Your answers are stored securely, can only be seen by a small number of PRL administrators,
            and are deleted 12 months after you stop working with us.
          </p>

          <div>
            <p className="text-sm font-medium text-gray-900">
              Medical <span className="text-red-500">*</span>
            </p>
            <p className="text-xs text-gray-500">Please disclose any current or past medical conditions.</p>
            <p className="mt-2 text-sm text-gray-700">Do you currently have any medical conditions?</p>
            <YesNo name="Medical conditions" value={a.hasMedicalCondition} onChange={set("hasMedicalCondition")} />
            {a.hasMedicalCondition === "Yes" && (
              <label className="mt-3 block text-sm text-gray-700">
                Please list the condition(s) <span className="text-red-500">*</span>
                <textarea
                  value={a.medicalConditions}
                  onChange={(e) => set("medicalConditions")(e.target.value)}
                  maxLength={1000}
                  rows={3}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </label>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-gray-900">
              Drugs and alcohol <span className="text-red-500">*</span>
            </p>
            <p className="mt-1 text-sm text-gray-700">Will you be able to take a drugs and alcohol test?</p>
            <YesNo name="Drugs and alcohol test" value={a.canTakeDaTest} onChange={set("canTakeDaTest")} />
          </div>

          <div>
            <p className="text-sm font-medium text-gray-900">
              Criminal record <span className="text-red-500">*</span>
            </p>
            <p className="mt-1 text-sm text-gray-700">Do you have any unspent criminal convictions?</p>
            <p className="text-xs text-gray-500">
              You don&apos;t need to tell us about convictions that are spent under the Rehabilitation of Offenders Act 1974.
            </p>
            <YesNo name="Unspent convictions" value={a.hasUnspentConviction} onChange={set("hasUnspentConviction")} />
          </div>

          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={a.declarationTrue}
              onChange={(e) => set("declarationTrue")(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              I declare that the information provided above is true and complete to the best of my knowledge.{" "}
              <span className="text-red-500">*</span>
            </span>
          </label>

          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          {result?.daBlocked && (
            <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Thanks for being honest. Everyone on our sites needs to be able to take a drugs and alcohol test, so
              please call us on <strong>0800 772 3959</strong> before going any further.
            </p>
          )}
          {result?.complete && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Saved. Thank you.</p>
          )}

          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? "Saving..." : "Save health & declarations"}
          </button>
        </div>
      )}
    </div>
  );
}
