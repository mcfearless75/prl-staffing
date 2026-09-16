"use client";

import { useState } from "react";
import { PublicFormShell } from "@/components/public-form-shell";

export default function NewStarterPage() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [country, setCountry] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [niNumber, setNiNumber] = useState("");
  const [employmentStartDate, setEmploymentStartDate] = useState("");
  const [employeeStatement, setEmployeeStatement] = useState("");
  const [declarationConfirmed, setDeclarationConfirmed] = useState(false);
  const [signature, setSignature] = useState("");

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none";
  const selectClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    if (!firstName || !lastName || !email || !phone || !gender || !dob || !employmentStartDate) {
      setError("Please fill in all required fields.");
      setSubmitting(false);
      return;
    }

    if (!employeeStatement) {
      setError("Please select an Employee Statement (A, B, or C).");
      setSubmitting(false);
      return;
    }

    if (!declarationConfirmed) {
      setError("Please confirm the declaration before submitting.");
      setSubmitting(false);
      return;
    }

    if (!signature) {
      setError("Please provide your signature.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/new-starter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone,
          gender,
          dob,
          country,
          address,
          city,
          postcode,
          niNumber,
          employmentStartDate,
          employeeStatement,
          declarationConfirmed,
          signature,
          submittedDate: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Submission failed");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

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
            <h1 className="text-xl font-bold text-prism-ink mb-2">Starter Checklist Submitted!</h1>
            <p className="text-sm text-gray-600 mb-4">
              Thank you, {firstName}. Your new starter checklist has been submitted to PRL Site Solutions.
            </p>
            <p className="text-xs text-gray-500">
              We&apos;ll be in touch shortly. If you have any questions, call us on <strong>0800 772 3959</strong> or email <strong>info@prlsitesolutions.co.uk</strong>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PublicFormShell title="New Starter Checklist" subtitle="PRL Recruitment — Starter Checklist">
      <div className="mx-auto max-w-3xl px-4 py-6">
        {/* Instructions for employers */}
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-1">Instructions for employers</h3>
          <p className="text-xs text-blue-800">
            This Starter Checklist can be used to gather information about your new employee. You can use this
            information to help set up a new employee on your payroll if the employee does not have a P45 from
            a previous employer. You should ask your employee to complete this form and return it to you. You
            should keep this completed checklist in your payroll records. It must not be sent to HMRC. You will
            need your employee&apos;s details when you operate your Full Payment Submission (FPS) payroll for
            that employee.
          </p>
        </div>

        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-sm font-semibold text-amber-900 mb-1">Instructions for employees</h3>
          <p className="text-xs text-amber-800">
            As a new employee your employer needs the information on this form before your first payday to tell
            HMRC about you and help them use the correct tax code. Your employer will need to see your passport
            or birth certificate and may also need to see your driving licence. Fill in this form then give it to your
            employer. Do not send it to HMRC.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Details */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Personal Details</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Are you male or female? *</label>
                <select required value={gender} onChange={(e) => setGender(e.target.value)} className={selectClass}>
                  <option value="">Select...</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
                <input type="date" required value={dob} onChange={(e) => setDob(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country / Region</label>
                <select value={country} onChange={(e) => setCountry(e.target.value)} className={selectClass}>
                  <option value="">Select...</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Ireland">Ireland</option>
                  <option value="Poland">Poland</option>
                  <option value="Romania">Romania</option>
                  <option value="Portugal">Portugal</option>
                  <option value="Lithuania">Lithuania</option>
                  <option value="Latvia">Latvia</option>
                  <option value="Bulgaria">Bulgaria</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">NI Number</label>
                <input type="text" value={niNumber} onChange={(e) => setNiNumber(e.target.value)} placeholder="e.g. AB123456C" className={inputClass} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zip / Postal Code</label>
                <input type="text" value={postcode} onChange={(e) => setPostcode(e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>

          {/* Employment Start Date */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Employment Details</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employment Start Date *</label>
              <input type="date" required value={employmentStartDate} onChange={(e) => setEmploymentStartDate(e.target.value)} className={`${inputClass} max-w-xs`} />
            </div>
          </div>

          {/* Employee Statement */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Employee Statement</h2>
            <p className="text-xs text-gray-500 mb-4">Choose the statement that applies to you, either A, B or C, and tick the appropriate box.</p>

            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="employeeStatement"
                  value="A"
                  checked={employeeStatement === "A"}
                  onChange={(e) => setEmployeeStatement(e.target.value)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-semibold text-gray-900">Statement A</span>
                  <p className="text-xs text-gray-600 mt-1">
                    Do not choose this statement if you receive a State, Works or Private Pension.
                    Choose this statement if the following applies. This is my first job since 6 April,
                    and since 6 April, I&apos;ve not received payments from any of the following:
                    Jobseeker&apos;s Allowance, Employment and Support Allowance, Incapacity Benefit.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="employeeStatement"
                  value="B"
                  checked={employeeStatement === "B"}
                  onChange={(e) => setEmployeeStatement(e.target.value)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-semibold text-gray-900">Statement B</span>
                  <p className="text-xs text-gray-600 mt-1">
                    Do not choose this statement if you receive a State, Works or Private Pension.
                    Choose this statement if the following applies. Since 6 April I have had another
                    job but I do not have a P45. And/or since the 6 April I have received payments
                    from any of the following: Jobseeker&apos;s Allowance, Employment and Support
                    Allowance, Incapacity Benefit.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="employeeStatement"
                  value="C"
                  checked={employeeStatement === "C"}
                  onChange={(e) => setEmployeeStatement(e.target.value)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-semibold text-gray-900">Statement C</span>
                  <p className="text-xs text-gray-600 mt-1">
                    Choose this statement if: you have another job and/or you receive a State,
                    Works or Private Pension.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Declaration */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Declaration</h2>

            <div className="flex items-start gap-3 mb-4">
              <input
                type="checkbox"
                id="declaration"
                checked={declarationConfirmed}
                onChange={(e) => setDeclarationConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="declaration" className="text-sm text-gray-700 cursor-pointer">
                I confirm that the information I&apos;ve given on this form is correct. *
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Signature (type your full name) *</label>
              <input type="text" value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Full name" className={inputClass} />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-prism-ink px-6 py-3 text-sm font-semibold text-prism-paper hover:bg-prism-ink/90 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Submitting..." : "Submit Starter Checklist"}
          </button>
        </form>

        <p className="text-center text-xs text-prism-ink-muted mt-6 pb-8">
          PRL Site Solutions | 0800 772 3959 | info@prlsitesolutions.co.uk
        </p>
      </div>
    </PublicFormShell>
  );
}
