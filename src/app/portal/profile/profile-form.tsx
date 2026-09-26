"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Phone, MapPin, AlertTriangle, Calendar, Shield, User } from "lucide-react";
import { NATIONALITY_OPTIONS, PRONOUN_OPTIONS, TITLE_OPTIONS } from "@/lib/profile-options";

export type ProfileFormValues = {
  title: string;
  firstName: string;
  lastName: string;
  knownAs: string;
  pronouns: string;
  nationality: string;
  phone: string;
  email: string;
  address: string;
  postcode: string;
  dateOfBirth: string;
  niNumber: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
};

/**
 * The App Invite Form. "Save and finish later" keeps whatever is filled in;
 * "Submit" needs every required field and then moves the worker on to their
 * documents. After submitting they can still update details here.
 */
export function ProfileForm({
  contractorId,
  initial,
  submitted,
}: {
  contractorId: string;
  initial: ProfileFormValues;
  submitted: boolean;
}) {
  const router = useRouter();
  const [values, setValues] = useState<ProfileFormValues>(initial);
  const [busy, setBusy] = useState<"save" | "submit" | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [missing, setMissing] = useState<string[]>([]);

  const set = (key: keyof ProfileFormValues) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  const hasChanges = (Object.keys(values) as (keyof ProfileFormValues)[]).some((k) => values[k] !== initial[k]);

  async function send(mode: "save" | "submit") {
    setSaved(false);
    setMissing([]);
    // There is no <form> around these inputs, so the required attribute never
    // fires on its own — this is what actually blocks the empty submit.
    if (!values.email.trim()) {
      setError("Email address is required — it is how you sign in to the portal.");
      return;
    }
    setBusy(mode);
    setError("");
    try {
      const res = await fetch("/api/portal/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractorId, mode, ...values }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (Array.isArray(data.missing)) setMissing(data.missing);
        throw new Error(data.error || "Failed to save");
      }
      if (mode === "submit" && !submitted) {
        router.push("/portal/documents?submitted=1");
        return;
      }
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(null);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
  const labelClass = "flex items-center gap-1.5 text-[10px] font-medium text-gray-500 mb-1";
  const req = <span className="text-red-500">*</span>;

  return (
    <>
      {!submitted && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-800">
          Fill in every question marked <span className="text-red-500">*</span>, then press <strong>Submit</strong>.
          Can&apos;t finish now? Press <strong>Save and finish later</strong> — nothing is lost.
        </div>
      )}

      {/* About you */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
            <User className="h-4 w-4" /> About you
          </h2>
          <p className="text-[10px] text-gray-400">Check your name is spelled exactly as on your passport or ID</p>
        </div>
        <div className="space-y-3 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Title {req}</label>
              <select value={values.title} onChange={set("title")} className={inputClass}>
                <option value="">Select</option>
                {TITLE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Pronouns {req}</label>
              <select value={values.pronouns} onChange={set("pronouns")} className={inputClass}>
                <option value="">Select</option>
                {PRONOUN_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>First name {req}</label>
            <input type="text" value={values.firstName} onChange={set("firstName")} className={inputClass} autoComplete="given-name" />
          </div>
          <div>
            <label className={labelClass}>Last name {req}</label>
            <input type="text" value={values.lastName} onChange={set("lastName")} className={inputClass} autoComplete="family-name" />
          </div>
          <div>
            <label className={labelClass}>Known as <span className="font-normal text-gray-400">(if you go by another name)</span></label>
            <input type="text" value={values.knownAs} onChange={set("knownAs")} maxLength={60} className={inputClass} placeholder="e.g. Bob" />
          </div>
          <div>
            <label className={labelClass}>Nationality {req}</label>
            <select value={values.nationality} onChange={set("nationality")} className={inputClass}>
              <option value="">Select nationality</option>
              {NATIONALITY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Contact Details */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Contact details</h2>
        </div>
        <div className="space-y-3 p-4">
          <div>
            <label className={labelClass}><Mail className="h-3 w-3" /> Email {req}</label>
            <input type="email" required value={values.email} onChange={set("email")} className={inputClass} placeholder="your@email.com" />
          </div>
          <div>
            <label className={labelClass}><Phone className="h-3 w-3" /> Phone {req}</label>
            <input type="tel" value={values.phone} onChange={set("phone")} className={inputClass} placeholder="07xxx xxxxxx" />
          </div>
          <div>
            <label className={labelClass}><MapPin className="h-3 w-3" /> Address {req}</label>
            <input type="text" value={values.address} onChange={set("address")} className={inputClass} placeholder="Street address" />
          </div>
          <div>
            <label className={labelClass}>Postcode {req}</label>
            <input
              type="text"
              value={values.postcode}
              onChange={(e) => setValues((v) => ({ ...v, postcode: e.target.value.toUpperCase() }))}
              className={`${inputClass} max-w-[140px]`}
              placeholder="XX1 1XX"
            />
          </div>
          <div>
            <label className={labelClass}><Calendar className="h-3 w-3" /> Date of birth {req}</label>
            <input
              type="date"
              value={values.dateOfBirth}
              onChange={set("dateOfBirth")}
              className={`${inputClass} max-w-[200px]`}
              max={new Date().toISOString().split("T")[0]}
            />
          </div>
          <div>
            <label className={labelClass}><Shield className="h-3 w-3" /> NI number {req}</label>
            <input
              type="text"
              value={values.niNumber}
              onChange={(e) => setValues((v) => ({ ...v, niNumber: e.target.value.toUpperCase() }))}
              className={`${inputClass} max-w-[200px] font-mono`}
              placeholder="AB 12 34 56 C"
              maxLength={13}
            />
            <p className="text-[10px] text-gray-400 mt-1">Format: AB 12 34 56 C</p>
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="rounded-xl border border-red-200 bg-white">
        <div className="border-b border-red-200 bg-red-50 px-4 py-3 rounded-t-xl">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-red-800">
            <AlertTriangle className="h-4 w-4" /> Emergency contact
          </h2>
          <p className="text-[10px] text-red-600">Required for site safety</p>
        </div>
        <div className="space-y-3 p-4">
          <div>
            <label className={labelClass}>Full name {req}</label>
            <input type="text" value={values.emergencyContactName} onChange={set("emergencyContactName")} className={inputClass} placeholder="Emergency contact name" />
          </div>
          <div>
            <label className={labelClass}>Phone number {req}</label>
            <input type="tel" value={values.emergencyContactPhone} onChange={set("emergencyContactPhone")} className={inputClass} placeholder="07xxx xxxxxx" />
          </div>
          <div>
            <label className={labelClass}>Relationship {req}</label>
            <select value={values.emergencyContactRelation} onChange={set("emergencyContactRelation")} className={inputClass}>
              <option value="">Select relationship</option>
              <option value="Spouse/Partner">Spouse/Partner</option>
              <option value="Parent">Parent</option>
              <option value="Sibling">Sibling</option>
              <option value="Child">Child</option>
              <option value="Friend">Friend</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
          {missing.length > 0 ? (
            <>
              <p className="font-medium">Still needed before you can submit:</p>
              <ul className="mt-1 list-disc pl-5">
                {missing.map((m) => <li key={m}>{m}</li>)}
              </ul>
            </>
          ) : (
            error
          )}
        </div>
      )}
      {saved && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-700">
          {submitted ? "Profile updated" : "Saved — you can come back and finish later"}
        </div>
      )}

      {submitted ? (
        hasChanges && (
          <button
            onClick={() => send("save")}
            disabled={!!busy}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 active:bg-blue-800 transition-colors"
          >
            {busy ? "Saving..." : "Save changes"}
          </button>
        )
      ) : (
        <div className="grid grid-cols-2 gap-3 pb-2">
          <button
            onClick={() => send("save")}
            disabled={!!busy}
            className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {busy === "save" ? "Saving..." : "Save and finish later"}
          </button>
          <button
            onClick={() => send("submit")}
            disabled={!!busy}
            className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 active:bg-blue-800"
          >
            {busy === "submit" ? "Submitting..." : "Submit"}
          </button>
        </div>
      )}
    </>
  );
}
