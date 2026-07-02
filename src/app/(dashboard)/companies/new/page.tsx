"use client";

import { PageHeader } from "@/components/page-header";
import { createCompany } from "../actions";
import Link from "next/link";
import { useState } from "react";

interface Suggestion {
  formatted: string; // e.g. "1 Test Street, Locality, Town, County"
}

function parseSuggestion(formatted: string): { address: string; city: string } {
  const parts = formatted.split(", ").map((p) => p.trim());
  // Last part is county, second-to-last is town
  const city = parts.length >= 2 ? parts[parts.length - 2] : parts[0] ?? "";
  // Street address = first part(s) up to (but not including) the last two parts
  const streetParts = parts.length > 2 ? parts.slice(0, parts.length - 2) : parts.slice(0, 1);
  return { address: streetParts.join(", "), city };
}

export default function NewCompanyPage() {
  const [postcode, setPostcode] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [looking, setLooking] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  async function lookupPostcode() {
    const pc = postcode.trim().toUpperCase();
    if (!pc) return;
    const token = process.env.NEXT_PUBLIC_GETADDRESS_TOKEN;
    if (!token) {
      setLookupError("Address lookup not configured");
      return;
    }
    setLooking(true);
    setLookupError("");
    setSuggestions([]);
    try {
      const res = await fetch(
        `https://api.getAddress.io/autocomplete/${encodeURIComponent(pc)}?api-key=${token}&all=true`
      );
      const json = await res.json();
      if (!res.ok) {
        setLookupError(json?.Message || json?.message || `Lookup failed (${res.status})`);
        return;
      }
      const results: Suggestion[] = (json.suggestions ?? []).map(
        (s: { address: string }) => ({ formatted: s.address })
      );
      if (results.length === 0) {
        setLookupError("No addresses found for this postcode");
        return;
      }
      setSuggestions(results);
      // Pre-fill city from first result
      setCity(parseSuggestion(results[0].formatted).city);
    } catch {
      setLookupError("Lookup failed — please try again");
    } finally {
      setLooking(false);
    }
  }

  function handleAddressSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const idx = parseInt(e.target.value, 10);
    if (isNaN(idx)) return;
    const parsed = parseSuggestion(suggestions[idx].formatted);
    setAddress(parsed.address);
    setCity(parsed.city);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Add Company" />

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <form action={createCompany} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">

            <div className="sm:col-span-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Enter company name"
              />
            </div>

            {/* Postcode with lookup */}
            <div>
              <label htmlFor="postcode" className="block text-sm font-medium text-gray-700">
                Postcode
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  id="postcode"
                  name="postcode"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); lookupPostcode(); } }}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g. CH47 0LB"
                />
                <button
                  type="button"
                  onClick={lookupPostcode}
                  disabled={looking || !postcode.trim()}
                  className="shrink-0 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors"
                >
                  {looking ? "..." : "Look up"}
                </button>
              </div>
              {lookupError && <p className="mt-1 text-xs text-red-500">{lookupError}</p>}
            </div>

            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                City / District
              </label>
              <input
                type="text"
                id="city"
                name="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Auto-filled from postcode"
              />
            </div>

            {/* Address picker dropdown — shown after lookup */}
            {suggestions.length > 0 && (
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Select Address
                </label>
                <select
                  onChange={handleAddressSelect}
                  defaultValue=""
                  className="mt-1 block w-full rounded-lg border border-blue-400 bg-blue-50 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="" disabled>— pick an address —</option>
                  {suggestions.map((s, i) => (
                    <option key={i} value={i}>{s.formatted}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="sm:col-span-2">
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                Address
              </label>
              <input
                type="text"
                id="address"
                name="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Street address"
              />
            </div>

            <div>
              <label htmlFor="contactName" className="block text-sm font-medium text-gray-700">
                Contact Name
              </label>
              <input
                type="text"
                id="contactName"
                name="contactName"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Enter contact name"
              />
            </div>

            <div>
              <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700">
                Contact Email
              </label>
              <input
                type="email"
                id="contactEmail"
                name="contactEmail"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Enter contact email"
              />
            </div>

            <div>
              <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700">
                Contact Phone
              </label>
              <input
                type="tel"
                id="contactPhone"
                name="contactPhone"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Enter contact phone"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
            <Link
              href="/companies"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              Create Company
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
