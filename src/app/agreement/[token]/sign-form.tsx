"use client";

import { useState } from "react";

const INPUT =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none";

/** Typed-name signature for a subcontractor agreement. Posts to /api/agreement/sign. */
export function AgreementSignForm({ token, personName }: { token: string; personName: string }) {
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [signedAt, setSignedAt] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim().includes(" ")) {
      setError("Type your full name (first and last) to sign.");
      return;
    }
    if (!agree) {
      setError("Tick the box to confirm you have read and agree.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/agreement/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, agree }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || "Something went wrong. Please try again.");
        return;
      }
      setSignedAt(data?.signedAt ?? new Date().toISOString());
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (signedAt) {
    const when = new Date(signedAt).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/London" });
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <h2 className="text-lg font-semibold text-emerald-800">Thank you — your agreement is signed</h2>
        <p className="mt-2 text-sm text-emerald-700">
          Signed on {when}. PRL Site Solutions have been told and will be in touch about your start.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="text-base font-semibold text-gray-900">Sign your agreement</h2>
      <div>
        <label htmlFor="sign-name" className="mb-1 block text-sm font-medium text-gray-700">
          Your full name
        </label>
        <input
          id="sign-name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={personName}
          maxLength={120}
          className={INPUT}
        />
        <p className="mt-1 text-xs text-gray-500">Typing your name here counts as your signature.</p>
      </div>
      <label className="flex items-start gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300"
        />
        <span>I have read and agree to this subcontractor agreement with PRL Site Solutions.</span>
      </label>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-[#005f8c] px-4 py-3 text-sm font-semibold text-white hover:bg-[#004d72] disabled:opacity-50"
      >
        {submitting ? "Signing..." : "Sign agreement"}
      </button>
    </form>
  );
}
