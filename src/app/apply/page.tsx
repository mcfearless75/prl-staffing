"use client";

import { useEffect, useState } from "react";
import { RolePicker } from "@/components/role-picker";
import { PublicFormShell } from "@/components/public-form-shell";

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
  nokName: string;
  nokRelationship: string;
  nokPhone: string;
  /* Section 2 */
  bankName: string;
  nameOnAccount: string;
  accountInYourName: string;
  accountNumber: string;
  sortCode: string;
  /* Section 3 */
  positionsSought: string;
  positionsSoughtOther: string;
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
  nokName: "",
  nokRelationship: "",
  nokPhone: "",
  bankName: "",
  nameOnAccount: "",
  accountInYourName: "",
  accountNumber: "",
  sortCode: "",
  positionsSought: "",
  positionsSoughtOther: "",
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

  // Live job roles for the picker. If this fetch fails the field degrades to a
  // free-text box rather than blocking the application — losing a tidy role name
  // is far cheaper than losing the applicant.
  const [jobRoles, setJobRoles] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [rolesError, setRolesError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/job-roles")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        if (cancelled) return;
        const roles = Array.isArray(d?.roles) ? d.roles : [];
        if (roles.length === 0) setRolesError(true);
        setJobRoles(roles);
      })
      .catch(() => {
        if (!cancelled) setRolesError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
        emergencyContactName: form.nokName,
        emergencyContactRelation: form.nokRelationship,
        emergencyContactPhone: form.nokPhone,
        // Canonical ids, so the roles can be linked properly rather than
        // matched on a typed string.
        jobRoleIds: selectedRoleIds,
        // Human-readable version kept for the application record and for anyone
        // reading it without resolving ids. Falls back to whatever was typed if
        // the picker degraded to free text.
        positionsSought:
          [
            ...jobRoles.filter((r) => selectedRoleIds.includes(r.id)).map((r) => r.name),
            form.positionsSoughtOther.trim(),
          ]
            .filter(Boolean)
            .join(", ") || form.positionsSought,
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
      <div className="min-h-screen bg-prism-canvas flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="rounded-lg border border-prism-line bg-prism-paper p-8 shadow-[0_1px_2px_rgb(27_36_48_/_6%)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-prism-ok/10 mb-4">
              <svg className="h-8 w-8 text-prism-ok" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-prism-ink mb-2">Application Submitted!</h1>
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
    <PublicFormShell title="Application Form">
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

            {/* Next of Kin — 3 separate required fields */}
            <div className="sm:col-span-2">
              <p className="text-sm font-semibold text-gray-800 mb-3 border-t border-gray-200 pt-4">
                Next of Kin / Emergency Contact *
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className={labelCls}>Full Name *</label>
                  <input
                    type="text"
                    required
                    value={form.nokName}
                    onChange={(e) => set("nokName", e.target.value)}
                    placeholder="e.g. Victoria Smith"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Relationship *</label>
                  <input
                    type="text"
                    required
                    value={form.nokRelationship}
                    onChange={(e) => set("nokRelationship", e.target.value)}
                    placeholder="e.g. Parent, Spouse, Partner"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Contact Number *</label>
                  <input
                    type="tel"
                    required
                    value={form.nokPhone}
                    onChange={(e) => set("nokPhone", e.target.value)}
                    placeholder="e.g. 07700 900000"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===================== SECTION 2: Work Requirements ===================== */}
        <div className={sectionCls}>
          <h2 className={headingCls}>Section 3: Work Requirements</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Roles come from the JobRole table via /api/job-roles, so this
                list tracks PRISM automatically as roles are added, renamed or
                deactivated. This was previously a free-text box, which is how
                the same trade ended up recorded as "360 Operator", "360
                Excavator Operator" and so on. */}
            <div className="sm:col-span-2">
              <label className={labelCls}>Positions Sought</label>
              {rolesError ? (
                <input
                  type="text"
                  value={form.positionsSought}
                  onChange={(e) => set("positionsSought", e.target.value)}
                  placeholder="Type the role(s) you are applying for"
                  className={inputCls}
                />
              ) : jobRoles.length === 0 ? (
                <p className="text-sm text-gray-500">Loading roles…</p>
              ) : (
                <RolePicker
                  options={jobRoles}
                  selectedIds={selectedRoleIds}
                  name="jobRoleIds"
                  onSelectionChange={setSelectedRoleIds}
                />
              )}
              {rolesError && (
                <p className="mt-1 text-xs text-amber-700">
                  Could not load the role list — please type the role(s) instead.
                </p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>
                Other role (if it is not in the list above)
              </label>
              <input
                type="text"
                value={form.positionsSoughtOther}
                onChange={(e) => set("positionsSoughtOther", e.target.value)}
                placeholder="e.g. Scaffolder — tell us and we will add it"
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

        {/* ===================== SECTION 4: Documents =====================
            This section previously offered four file inputs (CV, Photo ID,
            Passport/Visa, Other) above the text "Please upload any relevant
            documents". None of them worked: they had no onChange handler, were
            never bound to state, and this page sends JSON with no FormData
            anywhere. Applicants attached files, saw a success message, and the
            files were discarded silently.

            Rather than add an unauthenticated public upload endpoint, documents
            are collected through the existing portal compliance upload once the
            application is accepted and the applicant has a login. Removing the
            inputs removes a promise the form could not keep. */}
        <div className={sectionCls}>
          <h2 className={headingCls}>Section 4: Documents</h2>
          <p className="text-sm text-gray-600">
            You do not need to attach anything now. Once your application has been
            reviewed we will email you a secure link to your PRL portal, where you
            can upload your CV, photo ID, passport or visa, and any certificates.
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Uploading there keeps your documents encrypted and lets you replace them
            when they expire, so you only ever send them once.
          </p>
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
          disabled={submitting || !form.firstName || !form.lastName || !form.email || !form.phone || !form.nokName || !form.nokRelationship || !form.nokPhone || !form.privacyAgreed || !form.signature}
          className="w-full rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? "Submitting..." : "Apply Now"}
        </button>

        {/* Footer */}
        <div className="text-center text-xs text-prism-ink-muted pb-8">
          <p>PRL Site Solutions | 0800 772 3959 | info@prlsitesolutions.co.uk</p>
          <p className="mt-1">259 Wallasey Village, Wallasey, Wirral, Merseyside CH45 3LR | Company Reg: 14358717</p>
        </div>
      </form>
    </PublicFormShell>
  );
}
