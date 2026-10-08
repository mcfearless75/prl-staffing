"use client";

import { useImperativeHandle, useState, type Ref } from "react";
import { Mail, Phone, MapPin, AlertTriangle, Calendar, Shield, User } from "lucide-react";
import { NATIONALITY_OPTIONS, PRONOUN_OPTIONS, TITLE_OPTIONS } from "@/lib/profile-options";
import type { SectionHandle } from "./section-handle";

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

/** YYYY-MM-DD, 16 years before today: the latest date of birth that can start work. */
function sixteenYearsAgo(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 16);
  return d.toISOString().split("T")[0];
}

/**
 * The App Invite Form — personal, contact and emergency-contact details. Saved
 * by the single button at the bottom of the page (profile-flow.tsx): "finish
 * later" keeps whatever is filled in; "submit" needs every required field.
 */
export function ProfileForm({
  contractorId,
  initial,
  ref,
}: {
  contractorId: string;
  initial: ProfileFormValues;
  ref?: Ref<SectionHandle<ProfileFormValues>>;
}) {
  const [values, setValues] = useState<ProfileFormValues>(initial);
  const [baseline, setBaseline] = useState<ProfileFormValues>(initial);

  const set = (key: keyof ProfileFormValues) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  useImperativeHandle(ref, () => ({
    values: () => values,
    dirty: () => (Object.keys(values) as (keyof ProfileFormValues)[]).some((k) => values[k] !== baseline[k]),
    async save(final) {
      if (!values.email.trim()) {
        return { ok: false, error: "Email address is required — it is how you sign in to the portal." };
      }
      try {
        const res = await fetch("/api/portal/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contractorId, mode: final ? "submit" : "save", ...values }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return { ok: false, error: data.error || "Could not save your details." };
        setBaseline(values);
        return { ok: true };
      } catch {
        return { ok: false, error: "Could not save your details. Check your connection and try again." };
      }
    },
  }), [values, baseline, contractorId]);

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
  const labelClass = "flex items-center gap-1.5 text-[10px] font-medium text-gray-500 mb-1";
  const req = <span className="text-red-500">*</span>;

  return (
    <>
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
              // 16 is the youngest anyone can start, so the picker opens 16
              // years back instead of today (Jenni, 08-10-26).
              max={sixteenYearsAgo()}
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

    </>
  );
}
