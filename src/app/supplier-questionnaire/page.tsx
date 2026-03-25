"use client";

import { useState } from "react";

export default function SupplierQuestionnairePage() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Company Details
  const [companyName, setCompanyName] = useState("");
  const [tradingName, setTradingName] = useState("");
  const [companyRegNo, setCompanyRegNo] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [registeredAddress, setRegisteredAddress] = useState("");

  // Contact Details
  const [mainContactName, setMainContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [website, setWebsite] = useState("");

  // Business Info
  const [goodsServices, setGoodsServices] = useState("");
  const [numberOfEmployees, setNumberOfEmployees] = useState("");
  const [yearsInBusiness, setYearsInBusiness] = useState("");

  // Certifications
  const [iso9001, setIso9001] = useState("");
  const [otherCertifications, setOtherCertifications] = useState("");

  // Insurance
  const [publicLiability, setPublicLiability] = useState("");
  const [publicLiabilityAmount, setPublicLiabilityAmount] = useState("");
  const [employersLiability, setEmployersLiability] = useState("");
  const [employersLiabilityAmount, setEmployersLiabilityAmount] = useState("");
  const [professionalIndemnity, setProfessionalIndemnity] = useState("");
  const [professionalIndemnityAmount, setProfessionalIndemnityAmount] = useState("");

  // Policies
  const [healthSafetyPolicy, setHealthSafetyPolicy] = useState("");
  const [environmentalPolicy, setEnvironmentalPolicy] = useState("");
  const [equalityPolicy, setEqualityPolicy] = useState("");

  // References
  const [ref1Company, setRef1Company] = useState("");
  const [ref1Contact, setRef1Contact] = useState("");
  const [ref1Email, setRef1Email] = useState("");
  const [ref1Phone, setRef1Phone] = useState("");
  const [ref2Company, setRef2Company] = useState("");
  const [ref2Contact, setRef2Contact] = useState("");
  const [ref2Email, setRef2Email] = useState("");
  const [ref2Phone, setRef2Phone] = useState("");

  // Declaration
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [declaration, setDeclaration] = useState(false);
  const [signature, setSignature] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    if (!companyName || !mainContactName || !contactEmail || !goodsServices) {
      setError("Please fill in all required fields.");
      setSubmitting(false);
      return;
    }

    if (!declaration) {
      setError("Please confirm the declaration before submitting.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/supplier-questionnaire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName, tradingName, companyRegNo, vatNumber, registeredAddress,
          mainContactName, contactEmail, contactPhone, website,
          goodsServices, numberOfEmployees, yearsInBusiness,
          iso9001, otherCertifications,
          publicLiability, publicLiabilityAmount,
          employersLiability, employersLiabilityAmount,
          professionalIndemnity, professionalIndemnityAmount,
          healthSafetyPolicy, environmentalPolicy, equalityPolicy,
          references: [
            { company: ref1Company, contact: ref1Contact, email: ref1Email, phone: ref1Phone },
            { company: ref2Company, contact: ref2Contact, email: ref2Email, phone: ref2Phone },
          ],
          additionalInfo, declaration, signature,
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="rounded-xl border border-emerald-200 bg-white p-8 shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mb-4">
              <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Questionnaire Submitted!</h1>
            <p className="text-sm text-gray-600 mb-4">
              Thank you, {mainContactName}. Your supplier questionnaire has been submitted to PRL Site Solutions for review.
            </p>
            <p className="text-xs text-gray-500">
              We&apos;ll be in touch shortly. If you have any questions, call us on <strong>0800 772 3959</strong> or email <strong>info@prlsitesolutions.co.uk</strong>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const inputClass = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none";
  const selectClass = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#005f8c] text-white">
        <div className="mx-auto max-w-3xl px-4 py-6 flex items-center gap-4">
          <img src="/prl_logo.jpg" alt="PRL" width={56} height={56} className="rounded-full border-2 border-white/30" />
          <div>
            <h1 className="text-xl font-bold">Supplier Questionnaire</h1>
            <p className="text-sm text-blue-100">PRL Site Solutions — Recruitment Specialists</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-900">
            Please complete this questionnaire to register as a supplier with PRL Site Solutions. All fields marked with * are required.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Details */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Company Details</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                <input type="text" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trading Name (if different)</label>
                <input type="text" value={tradingName} onChange={(e) => setTradingName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Registration Number</label>
                <input type="text" value={companyRegNo} onChange={(e) => setCompanyRegNo(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">VAT Number</label>
                <input type="text" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} className={inputClass} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Registered Address</label>
                <textarea rows={2} value={registeredAddress} onChange={(e) => setRegisteredAddress(e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>

          {/* Contact Details */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Contact Details</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Main Contact Name *</label>
                <input type="text" required value={mainContactName} onChange={(e) => setMainContactName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email *</label>
                <input type="email" required value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                <input type="text" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} className={inputClass} placeholder="https://" />
              </div>
            </div>
          </div>

          {/* Business Information */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Business Information</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Type of Goods/Services Provided *</label>
                <textarea rows={3} required value={goodsServices} onChange={(e) => setGoodsServices(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number of Employees</label>
                <select value={numberOfEmployees} onChange={(e) => setNumberOfEmployees(e.target.value)} className={selectClass}>
                  <option value="">Select...</option>
                  <option value="1-10">1-10</option>
                  <option value="11-50">11-50</option>
                  <option value="51-200">51-200</option>
                  <option value="200+">200+</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Years in Business</label>
                <select value={yearsInBusiness} onChange={(e) => setYearsInBusiness(e.target.value)} className={selectClass}>
                  <option value="">Select...</option>
                  <option value="Less than 1 year">&lt;1</option>
                  <option value="1-5 years">1-5</option>
                  <option value="5-10 years">5-10</option>
                  <option value="10+ years">10+</option>
                </select>
              </div>
            </div>
          </div>

          {/* Certifications */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Certifications</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Do you hold ISO 9001 certification?</label>
                <div className="flex gap-4">
                  {["Yes", "No", "Working towards"].map((opt) => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="iso9001"
                        value={opt}
                        checked={iso9001 === opt}
                        onChange={(e) => setIso9001(e.target.value)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Do you hold any other certifications?</label>
                <textarea rows={2} value={otherCertifications} onChange={(e) => setOtherCertifications(e.target.value)} className={inputClass} placeholder="e.g. ISO 14001, ISO 45001, CHAS, SafeContractor..." />
              </div>
            </div>
          </div>

          {/* Insurance */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Insurance</h2>
            <div className="space-y-4">
              {/* Public Liability */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Do you have Public Liability insurance?</label>
                  <div className="flex gap-4">
                    {["Yes", "No"].map((opt) => (
                      <label key={opt} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="publicLiability" value={opt} checked={publicLiability === opt} onChange={(e) => setPublicLiability(e.target.value)} className="h-4 w-4 text-blue-600" />
                        <span className="text-sm text-gray-700">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {publicLiability === "Yes" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                    <input type="text" value={publicLiabilityAmount} onChange={(e) => setPublicLiabilityAmount(e.target.value)} className={inputClass} placeholder="e.g. £5,000,000" />
                  </div>
                )}
              </div>

              {/* Employers Liability */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Do you have Employers Liability insurance?</label>
                  <div className="flex gap-4">
                    {["Yes", "No"].map((opt) => (
                      <label key={opt} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="employersLiability" value={opt} checked={employersLiability === opt} onChange={(e) => setEmployersLiability(e.target.value)} className="h-4 w-4 text-blue-600" />
                        <span className="text-sm text-gray-700">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {employersLiability === "Yes" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                    <input type="text" value={employersLiabilityAmount} onChange={(e) => setEmployersLiabilityAmount(e.target.value)} className={inputClass} placeholder="e.g. £10,000,000" />
                  </div>
                )}
              </div>

              {/* Professional Indemnity */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Do you have Professional Indemnity insurance?</label>
                  <div className="flex gap-4">
                    {["Yes", "No"].map((opt) => (
                      <label key={opt} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="professionalIndemnity" value={opt} checked={professionalIndemnity === opt} onChange={(e) => setProfessionalIndemnity(e.target.value)} className="h-4 w-4 text-blue-600" />
                        <span className="text-sm text-gray-700">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {professionalIndemnity === "Yes" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                    <input type="text" value={professionalIndemnityAmount} onChange={(e) => setProfessionalIndemnityAmount(e.target.value)} className={inputClass} placeholder="e.g. £1,000,000" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Policies */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Policies</h2>
            <div className="space-y-4">
              {[
                { label: "Health & Safety policy in place?", name: "healthSafety", value: healthSafetyPolicy, setter: setHealthSafetyPolicy },
                { label: "Environmental policy in place?", name: "environmental", value: environmentalPolicy, setter: setEnvironmentalPolicy },
                { label: "Equality & Diversity policy in place?", name: "equality", value: equalityPolicy, setter: setEqualityPolicy },
              ].map((policy) => (
                <div key={policy.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{policy.label}</label>
                  <div className="flex gap-4">
                    {["Yes", "No"].map((opt) => (
                      <label key={opt} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name={policy.name} value={opt} checked={policy.value === opt} onChange={(e) => policy.setter(e.target.value)} className="h-4 w-4 text-blue-600" />
                        <span className="text-sm text-gray-700">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trade References */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Trade References</h2>
            <p className="text-xs text-gray-500 mb-4">Please provide 2 trade references.</p>

            <div className="space-y-6">
              {/* Reference 1 */}
              <div>
                <h3 className="text-sm font-medium text-gray-800 mb-3">Reference 1</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Company</label>
                    <input type="text" value={ref1Company} onChange={(e) => setRef1Company(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Contact Name</label>
                    <input type="text" value={ref1Contact} onChange={(e) => setRef1Contact(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Email</label>
                    <input type="email" value={ref1Email} onChange={(e) => setRef1Email(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Phone</label>
                    <input type="text" value={ref1Phone} onChange={(e) => setRef1Phone(e.target.value)} className={inputClass} />
                  </div>
                </div>
              </div>

              {/* Reference 2 */}
              <div>
                <h3 className="text-sm font-medium text-gray-800 mb-3">Reference 2</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Company</label>
                    <input type="text" value={ref2Company} onChange={(e) => setRef2Company(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Contact Name</label>
                    <input type="text" value={ref2Contact} onChange={(e) => setRef2Contact(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Email</label>
                    <input type="email" value={ref2Email} onChange={(e) => setRef2Email(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Phone</label>
                    <input type="text" value={ref2Phone} onChange={(e) => setRef2Phone(e.target.value)} className={inputClass} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Declaration */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">Declaration</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Any additional information</label>
                <textarea rows={3} value={additionalInfo} onChange={(e) => setAdditionalInfo(e.target.value)} className={inputClass} />
              </div>
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="declaration"
                  checked={declaration}
                  onChange={(e) => setDeclaration(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="declaration" className="text-sm text-gray-700 cursor-pointer">
                  I confirm the information provided is accurate and complete to the best of my knowledge. *
                </label>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Signature (type your full name)</label>
                  <input type="text" value={signature} onChange={(e) => setSignature(e.target.value)} className={inputClass} placeholder="Full name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input type="text" readOnly value={new Date().toLocaleDateString("en-GB")} className={`${inputClass} bg-gray-50`} />
                </div>
              </div>
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
            className="w-full rounded-lg bg-[#005f8c] px-6 py-3 text-sm font-semibold text-white hover:bg-[#004d73] disabled:opacity-50 transition-colors"
          >
            {submitting ? "Submitting..." : "Submit Questionnaire"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          PRL Site Solutions | 0800 772 3959 | info@prlsitesolutions.co.uk
        </p>
      </div>
    </div>
  );
}
