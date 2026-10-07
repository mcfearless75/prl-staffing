"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { missingForSubmit, type WaiverState } from "@/lib/profile-flow";
import type { ReferenceInput } from "@/lib/contractor-references";
import { ProfileForm, type ProfileFormValues } from "./profile-form";
import { DeclarationsForm, type DeclarationAnswers } from "./declarations-form";
import { WaiverForm } from "./waiver-form";
import { ReferencesForm } from "./references-form";
import type { SectionHandle } from "./section-handle";

/**
 * The whole first-login profile as one flow, with one button at the very
 * bottom (Paul, 2026-10-07). The Submit button used to sit straight after the
 * emergency contact, so workers pressed it, thought they were done, and left
 * the health questions and waiver unanswered. Now "Submit and continue" checks
 * every section, saves them all, and takes them to upload their documents.
 */
export function ProfileFlow({
  contractorId,
  initial,
  submitted,
}: {
  contractorId: string;
  initial: ProfileFormValues;
  submitted: boolean;
}) {
  const router = useRouter();
  const profileRef = useRef<SectionHandle<ProfileFormValues>>(null);
  const declarationsRef = useRef<SectionHandle<DeclarationAnswers>>(null);
  const waiverRef = useRef<SectionHandle<WaiverState>>(null);
  const referencesRef = useRef<SectionHandle<ReferenceInput[]>>(null);
  const messageRef = useRef<HTMLDivElement>(null);

  const [busy, setBusy] = useState<"save" | "submit" | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const sections = () => [profileRef, declarationsRef, waiverRef, referencesRef].map((r) => r.current);

  function show() {
    setTimeout(() => messageRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
  }

  async function run(mode: "save" | "submit") {
    setMissing([]);
    setError("");
    setNotice("");
    const final = mode === "submit";

    if (final) {
      const stillNeeded = missingForSubmit({
        profile: profileRef.current?.values() ?? {},
        declarations: declarationsRef.current?.values() ?? null,
        waiver: waiverRef.current?.values() ?? null,
      });
      if (stillNeeded.length > 0) {
        setMissing(stillNeeded);
        show();
        return;
      }
    }

    setBusy(mode);
    let daBlocked = false;
    try {
      for (const section of sections()) {
        if (!section) continue;
        const result = await section.save(final);
        if (!result.ok) {
          setError(result.error);
          show();
          return;
        }
        if (result.daBlocked) daBlocked = true;
      }
    } finally {
      setBusy(null);
    }

    if (daBlocked) {
      // PRL: everyone must be able to take a D&A test — the office calls them first.
      setNotice("Your answers are saved. Please call us on 0800 772 3959 before going any further.");
      show();
      return;
    }
    if (final && !submitted) {
      router.push("/portal/documents?submitted=1");
      return;
    }
    setNotice(final ? "Saved." : "Saved — you can come back and finish later.");
    router.refresh();
    show();
  }

  return (
    <>
      {!submitted && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-800">
          Please answer every question marked <span className="text-red-500">*</span> on this page — your details,
          health &amp; declarations and the 48 Hour Waiver. Then press <strong>Submit and continue</strong> at the
          bottom to upload your documents. Can&apos;t finish now? Press <strong>Save and finish later</strong>.
        </div>
      )}

      <ProfileForm ref={profileRef} contractorId={contractorId} initial={initial} />
      <DeclarationsForm ref={declarationsRef} />
      <WaiverForm ref={waiverRef} />
      <ReferencesForm ref={referencesRef} />

      <div ref={messageRef}>
        {missing.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700" role="alert">
            <p className="font-medium">Still needed before you can continue:</p>
            <ul className="mt-1 list-disc pl-5">
              {missing.map((m) => <li key={m}>{m}</li>)}
            </ul>
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}
        {notice && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
            {notice}
          </div>
        )}
      </div>

      {submitted ? (
        <button
          type="button"
          onClick={() => run("submit")}
          disabled={!!busy}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 active:bg-blue-800"
        >
          {busy ? "Saving..." : "Save changes"}
        </button>
      ) : (
        <div className="space-y-2 pb-2">
          <button
            type="button"
            onClick={() => run("submit")}
            disabled={!!busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 active:bg-blue-800"
          >
            {busy === "submit" ? "Submitting..." : <>Submit and continue to documents <ArrowRight className="h-4 w-4" /></>}
          </button>
          <button
            type="button"
            onClick={() => run("save")}
            disabled={!!busy}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {busy === "save" ? "Saving..." : "Save and finish later"}
          </button>
        </div>
      )}
    </>
  );
}
