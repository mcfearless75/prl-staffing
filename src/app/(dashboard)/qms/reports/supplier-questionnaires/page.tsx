"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";

interface SupplierResponse {
  id: string;
  createdAt: string;
  companyName: string;
  tradingName: string | null;
  companyRegNo: string | null;
  vatNumber: string | null;
  registeredAddress: string | null;
  mainContactName: string;
  contactEmail: string;
  contactPhone: string | null;
  website: string | null;
  goodsServices: string;
  numberOfEmployees: string | null;
  yearsInBusiness: string | null;
  iso9001: string | null;
  otherCertifications: string | null;
  publicLiability: string | null;
  publicLiabilityAmount: string | null;
  employersLiability: string | null;
  employersLiabilityAmount: string | null;
  professionalIndemnity: string | null;
  professionalIndemnityAmount: string | null;
  healthSafetyPolicy: string | null;
  environmentalPolicy: string | null;
  equalityPolicy: string | null;
  ref1Company: string | null;
  ref1Contact: string | null;
  ref1Email: string | null;
  ref1Phone: string | null;
  ref2Company: string | null;
  ref2Contact: string | null;
  ref2Email: string | null;
  ref2Phone: string | null;
  additionalInfo: string | null;
  signature: string | null;
  submittedDate: string | null;
  status: string;
}

function tradeReferences(r: SupplierResponse) {
  return [
    { company: r.ref1Company, contact: r.ref1Contact, email: r.ref1Email, phone: r.ref1Phone },
    { company: r.ref2Company, contact: r.ref2Contact, email: r.ref2Email, phone: r.ref2Phone },
  ].filter((ref) => ref.company);
}

function Badge({ value }: { value: string | null }) {
  if (value === "Yes") return <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700">Yes</span>;
  if (value === "No") return <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700">No</span>;
  if (value === "Working towards") return <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700">Working towards</span>;
  return <span className="text-xs text-gray-400">-</span>;
}

export default function SupplierQuestionnairesPage() {
  const [responses, setResponses] = useState<SupplierResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/qms-reports/supplier-questionnaires")
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setFetchError(data.error || `Server error ${res.status}`);
          return;
        }
        const data = await res.json();
        setResponses(data);
        setFetchError(null);
      })
      .catch((err) => setFetchError(err instanceof Error ? err.message : "Failed to load questionnaires"))
      .finally(() => setLoading(false));
  }, []);

  const hasInsurance = (r: SupplierResponse) => {
    const count = [r.publicLiability, r.employersLiability, r.professionalIndemnity].filter((v) => v === "Yes").length;
    if (count === 3) return "Full";
    if (count > 0) return "Partial";
    return "None";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Supplier Questionnaires" />
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier Questionnaires"
        action={
          <Link
            href="/qms/reports"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to Reports
          </Link>
        }
      />

      {/* Error banner */}
      {fetchError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          ⚠️ Could not load questionnaires: {fetchError}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Submissions</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{responses.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">ISO 9001 Certified</p>
          <p className="mt-1 text-3xl font-bold text-emerald-600">
            {responses.filter((r) => r.iso9001 === "Yes").length}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Full Insurance</p>
          <p className="mt-1 text-3xl font-bold text-blue-600">
            {responses.filter((r) => hasInsurance(r) === "Full").length}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">All Supplier Questionnaires</h2>
        </div>

        {responses.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-500">
            No supplier questionnaires submitted yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Company</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Contact</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">ISO 9001</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Insurance</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600"></th>
                </tr>
              </thead>
              <tbody>
                {responses.map((r) => (
                  <>
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{r.companyName}</td>
                      <td className="px-4 py-3 text-gray-600">{r.mainContactName}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(r.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3"><Badge value={r.iso9001} /></td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            hasInsurance(r) === "Full"
                              ? "bg-emerald-100 text-emerald-700"
                              : hasInsurance(r) === "Partial"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {hasInsurance(r)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            r.status === "Approved"
                              ? "bg-emerald-100 text-emerald-700"
                              : r.status === "Rejected"
                              ? "bg-red-100 text-red-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {r.status || "New"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800"
                        >
                          {expandedId === r.id ? "Hide" : "View"}
                        </button>
                      </td>
                    </tr>
                    {expandedId === r.id && (
                      <tr key={`${r.id}-details`} className="bg-gray-50">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            {/* Company Details */}
                            <div>
                              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Company Details</h3>
                              <div className="space-y-1 text-sm">
                                {r.tradingName && <p><span className="text-gray-500">Trading as:</span> {r.tradingName}</p>}
                                {r.companyRegNo && <p><span className="text-gray-500">Reg No:</span> {r.companyRegNo}</p>}
                                {r.vatNumber && <p><span className="text-gray-500">VAT:</span> {r.vatNumber}</p>}
                                {r.registeredAddress && <p><span className="text-gray-500">Address:</span> {r.registeredAddress}</p>}
                                <p><span className="text-gray-500">Email:</span> {r.contactEmail}</p>
                                {r.contactPhone && <p><span className="text-gray-500">Phone:</span> {r.contactPhone}</p>}
                                {r.website && <p><span className="text-gray-500">Website:</span> {r.website}</p>}
                              </div>
                            </div>

                            {/* Business Info */}
                            <div>
                              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Business Information</h3>
                              <div className="space-y-1 text-sm">
                                <p><span className="text-gray-500">Goods/Services:</span> {r.goodsServices}</p>
                                {r.numberOfEmployees && <p><span className="text-gray-500">Employees:</span> {r.numberOfEmployees}</p>}
                                {r.yearsInBusiness && <p><span className="text-gray-500">Years in Business:</span> {r.yearsInBusiness}</p>}
                              </div>
                            </div>

                            {/* Certifications & Insurance */}
                            <div>
                              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Certifications & Insurance</h3>
                              <div className="space-y-1 text-sm">
                                <p><span className="text-gray-500">ISO 9001:</span> <Badge value={r.iso9001} /></p>
                                {r.otherCertifications && <p><span className="text-gray-500">Other:</span> {r.otherCertifications}</p>}
                                <p><span className="text-gray-500">Public Liability:</span> <Badge value={r.publicLiability} /> {r.publicLiabilityAmount && `(${r.publicLiabilityAmount})`}</p>
                                <p><span className="text-gray-500">Employers Liability:</span> <Badge value={r.employersLiability} /> {r.employersLiabilityAmount && `(${r.employersLiabilityAmount})`}</p>
                                <p><span className="text-gray-500">Professional Indemnity:</span> <Badge value={r.professionalIndemnity} /> {r.professionalIndemnityAmount && `(${r.professionalIndemnityAmount})`}</p>
                              </div>
                            </div>

                            {/* Policies */}
                            <div>
                              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Policies</h3>
                              <div className="space-y-1 text-sm">
                                <p><span className="text-gray-500">Health & Safety:</span> <Badge value={r.healthSafetyPolicy} /></p>
                                <p><span className="text-gray-500">Environmental:</span> <Badge value={r.environmentalPolicy} /></p>
                                <p><span className="text-gray-500">Equality & Diversity:</span> <Badge value={r.equalityPolicy} /></p>
                              </div>
                            </div>
                          </div>

                          {/* References */}
                          {tradeReferences(r).length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Trade References</h3>
                              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {tradeReferences(r).map((ref, i) => (
                                  <div key={i} className="rounded-lg border border-gray-200 bg-white p-3">
                                    <p className="text-sm font-medium text-gray-900">{ref.company}</p>
                                    {ref.contact && <p className="text-xs text-gray-600">{ref.contact}</p>}
                                    {ref.email && <p className="text-xs text-gray-500">{ref.email}</p>}
                                    {ref.phone && <p className="text-xs text-gray-500">{ref.phone}</p>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {r.additionalInfo && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Additional Information</h3>
                              <p className="text-sm text-gray-700">{r.additionalInfo}</p>
                            </div>
                          )}

                          {r.signature && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <p className="text-xs text-gray-500">Signed by: <span className="font-medium text-gray-700">{r.signature}</span> on {r.submittedDate ? new Date(r.submittedDate).toLocaleDateString("en-GB") : "-"}</p>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
