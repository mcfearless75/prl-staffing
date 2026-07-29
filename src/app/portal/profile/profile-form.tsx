"use client";

import { useState } from "react";
import { Mail, Phone, MapPin, AlertTriangle, Calendar, Shield, Users } from "lucide-react";

export function ProfileForm({
  contractorId,
  phone,
  email,
  address,
  postcode,
  dateOfBirth,
  niNumber,
  nextOfKin,
  emergencyContactName,
  emergencyContactPhone,
  emergencyContactRelation,
}: {
  contractorId: string;
  phone: string;
  email: string;
  address: string;
  postcode: string;
  dateOfBirth: string;
  niNumber: string;
  nextOfKin: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
}) {
  const [formData, setFormData] = useState({
    phone,
    email,
    address,
    postcode,
    dateOfBirth,
    niNumber,
    nextOfKin,
    emergencyContactName,
    emergencyContactPhone,
    emergencyContactRelation,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const hasChanges =
    formData.phone !== phone ||
    formData.email !== email ||
    formData.address !== address ||
    formData.postcode !== postcode ||
    formData.dateOfBirth !== dateOfBirth ||
    formData.niNumber !== niNumber ||
    formData.nextOfKin !== nextOfKin ||
    formData.emergencyContactName !== emergencyContactName ||
    formData.emergencyContactPhone !== emergencyContactPhone ||
    formData.emergencyContactRelation !== emergencyContactRelation;

  async function handleSave() {
    setSaved(false);
    // There is no <form> around these inputs, so the required attribute never
    // fires on its own — this is what actually blocks the empty submit.
    if (!formData.email.trim()) {
      setError("Email address is required — it is how you sign in to the portal.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/portal/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractorId, ...formData }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <>
      {/* Contact Details */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Contact Details</h2>
          <p className="text-[10px] text-gray-400">You can update these yourself</p>
        </div>
        <div className="space-y-3 p-4">
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-medium text-gray-500 mb-1">
              <Mail className="h-3 w-3" /> Email
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={inputClass}
              placeholder="your@email.com"
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-medium text-gray-500 mb-1">
              <Phone className="h-3 w-3" /> Phone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className={inputClass}
              placeholder="07xxx xxxxxx"
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-medium text-gray-500 mb-1">
              <MapPin className="h-3 w-3" /> Address
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className={inputClass}
              placeholder="Street address"
            />
          </div>
          <div>
            <label className="text-[10px] font-medium text-gray-500 mb-1 block">Postcode</label>
            <input
              type="text"
              value={formData.postcode}
              onChange={(e) => setFormData({ ...formData, postcode: e.target.value.toUpperCase() })}
              className={`${inputClass} max-w-[140px]`}
              placeholder="XX1 1XX"
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-medium text-gray-500 mb-1">
              <Calendar className="h-3 w-3" /> Date of Birth
            </label>
            <input
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              className={`${inputClass} max-w-[200px]`}
              max={new Date().toISOString().split("T")[0]}
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-medium text-gray-500 mb-1">
              <Shield className="h-3 w-3" /> NI Number
            </label>
            <input
              type="text"
              value={formData.niNumber}
              onChange={(e) => setFormData({ ...formData, niNumber: e.target.value.toUpperCase() })}
              className={`${inputClass} max-w-[200px] font-mono`}
              placeholder="AB 12 34 56 C"
              maxLength={13}
            />
            <p className="text-[10px] text-gray-400 mt-1">Format: AB 12 34 56 C</p>
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-medium text-gray-500 mb-1">
              <Users className="h-3 w-3" /> Next of Kin
            </label>
            <input
              type="text"
              value={formData.nextOfKin}
              onChange={(e) => setFormData({ ...formData, nextOfKin: e.target.value })}
              className={inputClass}
              placeholder="Name, relationship, phone number"
            />
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="rounded-xl border border-red-200 bg-white">
        <div className="border-b border-red-200 bg-red-50 px-4 py-3 rounded-t-xl">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-red-800">
            <AlertTriangle className="h-4 w-4" /> Emergency Contact
          </h2>
          <p className="text-[10px] text-red-600">Required for site safety</p>
        </div>
        <div className="space-y-3 p-4">
          <div>
            <label className="text-[10px] font-medium text-gray-500 mb-1 block">Full Name</label>
            <input
              type="text"
              value={formData.emergencyContactName}
              onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
              className={inputClass}
              placeholder="Emergency contact name"
            />
          </div>
          <div>
            <label className="text-[10px] font-medium text-gray-500 mb-1 block">Phone Number</label>
            <input
              type="tel"
              value={formData.emergencyContactPhone}
              onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
              className={inputClass}
              placeholder="07xxx xxxxxx"
            />
          </div>
          <div>
            <label className="text-[10px] font-medium text-gray-500 mb-1 block">Relationship</label>
            <select
              value={formData.emergencyContactRelation}
              onChange={(e) => setFormData({ ...formData, emergencyContactRelation: e.target.value })}
              className={inputClass}
            >
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

      {/* Save Button */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {saved && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-700">
          Profile updated successfully
        </div>
      )}
      {hasChanges && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 active:bg-blue-800 transition-colors"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      )}
    </>
  );
}
