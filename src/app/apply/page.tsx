"use client";

import { useState } from "react";

/* ---------- tiny helpers ---------- */
const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500";
const labelCls = "block text-sm font-medium text-gray-700 mb-1";
const sectionCls = "rounded-xl border border-gray-200 bg-white p-6";
const headingCls = "text-lg font-semibold text-gray-900 mb-4";

function YesNo({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <span className={labelCls}>
        {label}
        {required && " *"}
      </span>
      <div className="flex gap-4 mt-1">
        {["Yes", "No"].map((opt) => (
          <label key={opt} className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input
              type="radio"
              name={label}
              checked={value === opt}
              onChange={() => onChange(opt)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500"
            />
            {opt}
          </label>
        ))}
      </div>
    </div>
  );
}

/* ---------- form state type ---------- */
interface FormState {
  /* Section 1 */
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  address: string;
  city: string;
  postcode: string;
  nonBritishNational: string;
  requiresWorkPermit: string;
  niNumber: string;
  passportNumber: string;
  passportExpiry: string;
  visaNumber: string;
  visaExpiry: string;
  fullDrivingLicence: string;
  motoringConvictions: string;
  regularUseOf: string[];
  endorsementDetails: string;
  nextOfKin: string;
  /* Section 2 */
  bankName: string;
  nameOnAccount: string;
  accountInYourName: string;
  accountNumber: string;
  sortCode: string;
  /* Section 3 */
  positionsSought: string;
  salaryRequired: string;
  hoursPreferred: string[];
  daysPreferred: string[];
  locationsPreferred: string;
  requiredHours: string;
  relevantSkills: string;
  doNotContact: string;
  /* Section 5 */
  hasDbs: string;
  dbsNumber: string;
  dbsIssued: string;
  hasCriminalConviction: string;
  hasPreviousConvictions: string;
  hasSecurityClearance: string;
  clearanceLevel: string;
  clearanceDateGranted: string;
  clearanceDateExpiring: string;
  clearancePlaceOfWork: string;
  /* Section 6 */
  waiverDecision: string;
  waiverDay: string;
  waiverMonth: string;
  waiverYear: string;
  /* Section 7 */
  privacyAgreed: boolean;
  signature: string;
  /* Section 8 */
  references: string;
}

const INITIAL: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  country: "United Kingdom",
  address: "",
  city: "",
  postcode: "",
  nonBritishNational: "",
  requiresWorkPermit: "",
  niNumber: "",
  passportNumber: "",
  passportExpiry: "",
  visaNumber: "",
  visaExpiry: "",
  fullDrivingLicence: "",
  motoringConvictions: "",
  regularUseOf: [],
  endorsementDetails: "",
  nextOfKin: "",
  bankName: "",
  nameOnAccount: "",
  accountInYourName: "",
  accountNumber: "",
  sortCode: "",
  positionsSought: "",
  salaryRequired: "",
  hoursPreferred: [],
  daysPreferred: [],
  locationsPreferred: "",
  requiredHours: "",
  relevantSkills: "",
  doNotContact: "",
  hasDbs: "",
  dbsNumber: "",
  dbsIssued: "",
  hasCriminalConviction: "",
  hasPreviousConvictions: "",
  hasSecurityClearance: "",
  clearanceLevel: "",
  clearanceDateGranted: "",
  clearanceDateExpiring: "",
  clearancePlaceOfWork: "",
  waiverDecision: "",
  waiverDay: "",
  waiverMonth: "",
  waiverYear: "",
  privacyAgreed: false,
  signature: "",
  references: "",
};

const COUNTRIES = [
  "United Kingdom",
  "Ireland",
  "Poland",
  "Romania",
  "Lithuania",
  "Latvia",
  "Bulgaria",
  "Portugal",
  "Spain",
  "Italy",
  "France",
  "Germany",
  "Netherlands",
  "Czech Republic",
  "Hungary",
  "Slovakia",
  "Other",
];

const HOURS_OPTIONS = ["Days", "Evenings", "Nights", "Rotating Shifts"];
const DAYS_OPTIONS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const VEHICLE_OPTIONS = ["Car", "Bicycle", "Motorbike"];

export default function ApplyPage() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  /* helpers */
  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleArray(key: "hoursPreferred" | "daysPreferred" | "regularUseOf", item: string) {
    setForm((prev) => {
      const arr = prev[key] as string[];
      return {
        ...prev,
        [key]: arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item],
      };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const payload = {
        ...form,
        regularUseOf: form.regularUseOf.join(", "),
        hoursPreferred: form.hoursPreferred.join(", "),
        daysPreferred: form.daysPreferred.join(", "),
        waiverSignedDate: [form.waiverDay, form.waiverMonth, form.waiverYear]
          .filter(Boolean)
          .join("/"),
      };

      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Submission failed");
      }

      setSuccess(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  /* ---- success screen ---- */
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="rounded-xl border border-emerald-200 bg-white p-8 shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mb-4">
              <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Application Submitted!</h1>
            <p className="text-sm text-gray-600 mb-4">
              Thank you, {form.firstName}. Your application has been submitted to PRL Site Solutions for review.
            </p>
            <p className="text-xs text-gray-500">
              We&apos;ll be in touch shortly. If you have any questions, call us on{" "}
              <strong>0800 772 3959</strong> or email{" "}
              <strong>info@prlsitesolutions.co.uk</strong>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ---- main form ---- */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#005f8c] text-white">
        <div className="mx-auto max-w-3xl px-4 py-6 flex items-center gap-4">
          <img
            src="/prl_logo.jpg"
            alt="PRL"
            width={56}
            height={56}
            className="rounded-full border-2 border-white/30"
          />
          <div>
            <h1 className="text-xl font-bold">Application Form</h1>
            <p className="text-sm text-blue-100">PRL Site Solutions -- Recruitment Specialists</p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        {/* Intro */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-900">
            Please complete all sections below. Fields marked with <strong>*</strong> are required.
            Contact us on <strong>0800 772 3959</strong> or{" "}
            <strong>info@prlsitesolutions.co.uk</strong> with any queries.
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ===================== SECTION 1: Personal Details ===================== */}
        <div className={sectionCls}>
          <h2 className={headingCls}>Section 1: Personal Details</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>First Name *</label>
              <input
                type="text"
                required
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Last Name *</label>
              <input
                type="text"
                required
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Email *</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Phone *</label>
              <input
                type="tel"
                required
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Country/Region</label>
              <select
                value={form.country}
                onChange={(e) => set("country", e.target.value)}
                className={inputCls}
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Address</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Zip/Postal Code</label>
              <input
                type="text"
                value={form.postcode}
                onChange={(e) => set("postcode", e.target.value)}
                className={inputCls}
              />
            </div>

            <YesNo
              label="Are you a NON-British National?"
              value={form.nonBritishNational}
              onChange={(v) => set("nonBritishNational", v)}
              required
            />
            <YesNo
              label="Do you require a work permit?"
              value={form.requiresWorkPermit}
              onChange={(v) => set("requiresWorkPermit", v)}
              required
            />

            <div>
              <label className={labelCls}>NI Number</label>
              <input
                type="text"
                value={form.niNumber}
                onChange={(e) => set("niNumber", e.target.value)}
                placeholder="e.g. AB123456C"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Passport Number</label>
              <input
                type="text"
                value={form.passportNumber}
                onChange={(e) => set("passportNumber", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Passport Expiry</label>
              <input
                type="date"
                value={form.passportExpiry}
                onChange={(e) => set("passportExpiry", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Visa Number</label>
              <input
                type="text"
                value={form.visaNumber}
                onChange={(e) => set("visaNumber", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Visa Expiry</label>
              <input
                type="date"
                value={form.visaExpiry}
                onChange={(e) => set("visaExpiry", e.target.value)}
                className={inputCls}
              />
            </div>

            <YesNo
              label="Do you hold a full UK driving licence?"
              value={form.fullDrivingLicence}
              onChange={(v) => set("fullDrivingLicence", v)}
              required
            />
            <YesNo
              label="Do you have any motoring convictions?"
              value={form.motoringConvictions}
              onChange={(v) => set("motoringConvictions", v)}
              required
            />

            <div className="sm:col-span-2">
              <span className={labelCls}>Do you have regular use of:</span>
              <div className="flex flex-wrap gap-4 mt-1">
                {VEHICLE_OPTIONS.map((v) => (
                  <label key={v} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.regularUseOf.includes(v)}
                      onChange={() => toggleArray("regularUseOf", v)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    {v}
                  </label>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className={labelCls}>Give details of any endorsements</label>
              <textarea
                value={form.endorsementDetails}
                onChange={(e) => set("endorsementDetails", e.target.value)}
                rows={2}
                className={inputCls}
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelCls}>Next of Kin * (full details including contact number)</label>
              <input
                type="text"
                required
                value={form.nextOfKin}
                onChange={(e) => set("nextOfKin", e.target.value)}
                placeholder="Name, relationship, phone number"
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* ===================== SECTION 2: Bank Details ===================== */}
        <div className={sectionCls}>
          <h2 className={headingCls}>Section 2: Bank Details</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Bank Name</label>
              <input
                type="text"
                value={form.bankName}
                onChange={(e) => set("bankName", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Name on Account</label>
              <input
                type="text"
                value={form.nameOnAccount}
                onChange={(e) => set("nameOnAccount", e.target.value)}
                className={inputCls}
              />
            </div>
            <YesNo
              label="Is the Account in Your Name?"
              value={form.accountInYourName}
              onChange={(v) => set("accountInYourName", v)}
              required
            />
            <div>
              <label className={labelCls}>Account Number</label>
              <input
                type="text"
                value={form.accountNumber}
                onChange={(e) => set("accountNumber", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Sort Code</label>
              <input
                type="text"
                value={form.sortCode}
                onChange={(e) => set("sortCode", e.target.value)}
                placeholder="00-00-00"
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* ===================== SECTION 3: Work Requirements ===================== */}
        <div className={sectionCls}>
          <h2 className={headingCls}>Section 3: Work Requirements</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Positions Sought</label>
              <input
                type="text"
                value={form.positionsSought}
                onChange={(e) => set("positionsSought", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Salary/Rate Required</label>
              <input
                type="text"
                value={form.salaryRequired}
                onChange={(e) => set("salaryRequired", e.target.value)}
                className={inputCls}
              />
            </div>

            <div className="sm:col-span-2">
              <span className={labelCls}>Please indicate what hours would suit you best *</span>
              <div className="flex flex-wrap gap-4 mt-1">
                {HOURS_OPTIONS.map((h) => (
                  <label key={h} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.hoursPreferred.includes(h)}
                      onChange={() => toggleArray("hoursPreferred", h)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    {h}
                  </label>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2">
              <span className={labelCls}>Please indicate days that would suit you best</span>
              <div className="flex flex-wrap gap-4 mt-1">
                {DAYS_OPTIONS.map((d) => (
                  <label key={d} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.daysPreferred.includes(d)}
                      onChange={() => toggleArray("daysPreferred", d)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    {d}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className={labelCls}>Locations Preferred</label>
              <input
                type="text"
                value={form.locationsPreferred}
                onChange={(e) => set("locationsPreferred", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Required Hours</label>
              <input
                type="text"
                value={form.requiredHours}
                onChange={(e) => set("requiredHours", e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Relevant Skills</label>
              <textarea
                value={form.relevantSkills}
                onChange={(e) => set("relevantSkills", e.target.value)}
                rows={3}
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Organisations you DO NOT wish us to contact</label>
              <textarea
                value={form.doNotContact}
                onChange={(e) => set("doNotContact", e.target.value)}
                rows={2}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* ===================== SECTION 4: Documents ===================== */}
        <div className={sectionCls}>
          <h2 className={headingCls}>Section 4: Documents</h2>
          <p className="text-xs text-gray-500 mb-4">
            Please upload any relevant documents. Accepted formats: PDF, DOC, DOCX, JPG, PNG.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>CV</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-[#005f8c] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-[#004a6b] file:cursor-pointer"
              />
            </div>
            <div>
              <label className={labelCls}>Current Photo ID</label>
              <input
                type="file"
                accept="image/*"
                className="w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-[#005f8c] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-[#004a6b] file:cursor-pointer"
              />
            </div>
            <div>
              <label className={labelCls}>Passport / Visa</label>
              <input
                type="file"
                className="w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-[#005f8c] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-[#004a6b] file:cursor-pointer"
              />
            </div>
            <div>
              <label className={labelCls}>Other Supporting Docs</label>
              <input
                type="file"
                className="w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-[#005f8c] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-[#004a6b] file:cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* ===================== SECTION 5: Criminal Record & Security ===================== */}
        <div className={sectionCls}>
          <h2 className={headingCls}>Section 5: Criminal Record And Security Checks</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <YesNo
              label="Do you hold a DBS check within last 3 years?"
              value={form.hasDbs}
              onChange={(v) => set("hasDbs", v)}
            />
            <div>
              <label className={labelCls}>Enhanced DBS No</label>
              <input
                type="text"
                value={form.dbsNumber}
                onChange={(e) => set("dbsNumber", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>DBS Issued</label>
              <input
                type="date"
                value={form.dbsIssued}
                onChange={(e) => set("dbsIssued", e.target.value)}
                className={inputCls}
              />
            </div>
            <YesNo
              label="Have you been convicted of a criminal offence?"
              value={form.hasCriminalConviction}
              onChange={(v) => set("hasCriminalConviction", v)}
            />
            <YesNo
              label="Do you have previous convictions?"
              value={form.hasPreviousConvictions}
              onChange={(v) => set("hasPreviousConvictions", v)}
            />
            <YesNo
              label="Do you hold security clearance?"
              value={form.hasSecurityClearance}
              onChange={(v) => set("hasSecurityClearance", v)}
            />
            <div>
              <label className={labelCls}>Level of Clearance</label>
              <input
                type="text"
                value={form.clearanceLevel}
                onChange={(e) => set("clearanceLevel", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Date Granted</label>
              <input
                type="date"
                value={form.clearanceDateGranted}
                onChange={(e) => set("clearanceDateGranted", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Date Expiring</label>
              <input
                type="date"
                value={form.clearanceDateExpiring}
                onChange={(e) => set("clearanceDateExpiring", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Place of Work Granted</label>
              <input
                type="text"
                value={form.clearancePlaceOfWork}
                onChange={(e) => set("clearancePlaceOfWork", e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* ===================== SECTION 6: 48 Hour Waiver ===================== */}
        <div className={sectionCls}>
          <h2 className={headingCls}>Section 6: 48 Hour Waiver</h2>
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 mb-4 text-xs text-gray-700 leading-relaxed space-y-2">
            <p>
              <strong>Working Time Regulations</strong>
            </p>
            <p>
              The Working Time Regulations 1998 state that a worker&apos;s average working time,
              including overtime, shall not exceed 48 hours for each seven-day period averaged over a
              reference period of 17 weeks.
            </p>
            <p>
              However, you may agree with PRL Site Solutions to exclude this limit. If you do, you
              will not be required or expected to work more than 48 hours per week on average, but you
              may do so if you wish. You may cancel this agreement by giving PRL Site Solutions not
              less than seven days&apos; notice in writing.
            </p>
          </div>

          <div className="mb-4">
            <span className={labelCls}>48 Hour Waiver Proposal *</span>
            <div className="flex gap-4 mt-1">
              {["I agree", "I disagree"].map((opt) => (
                <label key={opt} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="waiverDecision"
                    checked={form.waiverDecision === opt}
                    onChange={() => set("waiverDecision", opt)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>

          <div>
            <span className={labelCls}>Signed by on the:</span>
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                placeholder="Day"
                value={form.waiverDay}
                onChange={(e) => set("waiverDay", e.target.value)}
                className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Month"
                value={form.waiverMonth}
                onChange={(e) => set("waiverMonth", e.target.value)}
                className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Year"
                value={form.waiverYear}
                onChange={(e) => set("waiverYear", e.target.value)}
                className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* ===================== SECTION 7: Data Protection & Declaration ===================== */}
        <div className={sectionCls}>
          <h2 className={headingCls}>Section 7: Data Protection &amp; Declaration</h2>

          <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 mb-4 text-xs text-gray-700 leading-relaxed space-y-2">
            <p>
              <strong>Data Protection</strong>
            </p>
            <p>
              PRL Site Solutions is committed to protecting your personal data. We collect and process
              your personal information in accordance with the UK General Data Protection Regulation
              (UK GDPR) and the Data Protection Act 2018. Your data will only be used for the purposes
              of recruitment, employment administration, and related legitimate business needs. We will
              not share your data with third parties unless required by law or with your explicit
              consent.
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 mb-4 text-xs text-gray-700 leading-relaxed space-y-2">
            <p>
              <strong>Declaration</strong>
            </p>
            <p>
              I declare that the information given on this form is correct and complete. I understand
              that any false statements or omissions may result in the withdrawal of any offer of
              employment or dismissal. I consent to PRL Site Solutions holding and processing my
              personal data for purposes connected with my application and any subsequent employment. I
              understand that providing false or misleading information is an offence and could result
              in my application being rejected or subsequent dismissal, and may amount to a criminal
              offence.
            </p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={form.privacyAgreed}
                onChange={(e) => set("privacyAgreed", e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs text-amber-800">
                I have read and agree to the company{" "}
                <a
                  href="/privacy"
                  className="underline text-blue-700 hover:text-blue-900"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  privacy policy
                </a>{" "}
                *
              </span>
            </label>
          </div>

          <div>
            <label className={labelCls}>Signature * (type your full name)</label>
            <input
              type="text"
              required
              value={form.signature}
              onChange={(e) => set("signature", e.target.value)}
              placeholder="Type your full name as your signature"
              className={inputCls}
            />
          </div>
        </div>

        {/* ===================== SECTION 8: References ===================== */}
        <div className={sectionCls}>
          <h2 className={headingCls}>Section 8: References</h2>
          <div>
            <label className={labelCls}>Reference Details</label>
            <textarea
              value={form.references}
              onChange={(e) => set("references", e.target.value)}
              rows={4}
              placeholder="Please provide details of your referees including name, company, position, contact number and email address."
              className={inputCls}
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || !form.firstName || !form.lastName || !form.email || !form.phone || !form.privacyAgreed || !form.signature}
          className="w-full rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? "Submitting..." : "Apply Now"}
        </button>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 pb-8">
          <p>PRL Site Solutions | 0800 772 3959 | info@prlsitesolutions.co.uk</p>
          <p className="mt-1">18 Beryl Rd, Birkenhead, Prenton CH43 9RT | Company Reg: 14358717</p>
        </div>
      </form>
    </div>
  );
}
