"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ShieldCheck } from "lucide-react";
import { RTW_ROUTES, rtwProgress, type RtwRoute } from "@/lib/rtw-route";
import { ComplianceUploader } from "../compliance/compliance-uploader";

/**
 * "Do you have a UK or Irish passport?" and the documents each answer needs.
 * Answers and uploads are kept between visits, so a worker waiting on a share
 * code can leave and come back.
 *
 * Jenni, 08-10-26: the saved share code showed only its last 3 characters and
 * couldn't be changed, so a worker who'd mistyped it, or whose code had
 * expired, was stuck. It's their own code, so it now shows in full, with a
 * "Change" button.
 */
export function RtwSection({
  contractorId,
  route: savedRoute,
  shareCode,
  satisfiedTypes,
}: {
  contractorId: string;
  route: RtwRoute | null;
  /** The worker's own share code, formatted "W12 345 67X", if one is on file. */
  shareCode: string | null;
  satisfiedTypes: string[];
}) {
  const router = useRouter();
  const [route, setRoute] = useState<RtwRoute | null>(savedRoute);
  const [hasUkPassport, setHasUkPassport] = useState<boolean | null>(
    savedRoute ? savedRoute === "uk-irish-passport" : null
  );
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [changingCode, setChangingCode] = useState(false);

  const satisfied = new Set(satisfiedTypes);
  const progress = rtwProgress(route, satisfied, !!shareCode);

  async function save(next: RtwRoute, shareCode?: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/portal/rtw", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rtwRoute: next, shareCode: shareCode ?? "", keepShareCode: shareCode === undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save");
      setRoute(next);
      setCode("");
      setChangingCode(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  const choice = (label: string, active: boolean, onClick: () => void) => (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
        active ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
          <ShieldCheck className="h-4 w-4" /> Right to Work
        </h2>
        {progress.complete && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Done</span>
        )}
      </div>

      <div className="space-y-4 p-4">
        <div>
          <p className="mb-2 text-sm text-gray-800">Do you have a UK or Irish passport?</p>
          <div className="grid grid-cols-2 gap-2">
            {choice("Yes", hasUkPassport === true, () => {
              setHasUkPassport(true);
              save("uk-irish-passport");
            })}
            {choice("No", hasUkPassport === false, () => {
              setHasUkPassport(false);
              if (route === "uk-irish-passport") setRoute(null);
            })}
          </div>
        </div>

        {hasUkPassport === false && (
          <div>
            <p className="mb-2 text-sm text-gray-800">Which can you provide?</p>
            <div className="grid gap-2">
              {choice(RTW_ROUTES["passport-share-code"].label, route === "passport-share-code", () => save("passport-share-code"))}
              {choice(RTW_ROUTES["birth-cert-ni"].label, route === "birth-cert-ni", () => save("birth-cert-ni"))}
            </div>
          </div>
        )}

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

        {route && (
          <div className="space-y-3">
            {RTW_ROUTES[route].docs.map((d) =>
              satisfied.has(d.type) ? (
                <p key={d.type} className="flex items-center gap-1.5 text-sm text-emerald-700">
                  <Check className="h-4 w-4" /> {d.label} uploaded
                </p>
              ) : (
                <div key={d.type} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-sm font-medium text-gray-900">{d.label}</p>
                  {d.hint && <p className="mb-2 text-[11px] text-gray-500">{d.hint}</p>}
                  <ComplianceUploader contractorId={contractorId} docType={d.type} label={d.label} isResubmit={false} />
                </div>
              )
            )}

            {RTW_ROUTES[route].needsShareCode &&
              (shareCode && !changingCode ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-sm text-emerald-700">
                    <Check className="h-4 w-4" /> Share code saved: <span className="font-mono font-semibold">{shareCode}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setChangingCode(true)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-sm font-medium text-gray-900">{changingCode ? "New share code" : "Share code"}</p>
                  <p className="mb-2 text-[11px] text-gray-500">
                    Get it from GOV.UK &ldquo;Prove your right to work&rdquo;. It looks like W12 345 67X.
                    {changingCode && " Share codes expire, so if yours has, get a new one and enter it here."}
                  </p>
                  <div className="flex gap-2">
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      maxLength={13}
                      placeholder="W12 345 67X"
                      className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      disabled={busy || !code.trim()}
                      onClick={() => save(route, code)}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                  {changingCode && (
                    <button
                      type="button"
                      onClick={() => {
                        setChangingCode(false);
                        setCode("");
                        setError("");
                      }}
                      className="mt-2 text-xs text-gray-500 underline"
                    >
                      Cancel, keep {shareCode}
                    </button>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
