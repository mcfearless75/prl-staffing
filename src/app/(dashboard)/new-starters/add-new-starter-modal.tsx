"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addNewStarter } from "./pipeline-actions";

const INPUT = "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500";
const LABEL = "block text-sm font-medium text-gray-700 mb-1";

type CompanyOption = { id: string; name: string; sites: { id: string; name: string }[] };

const EMPTY = {
  firstName: "", lastName: "", phone: "", email: "",
  companyId: "", siteId: "", role: "", startDate: "",
  payRate: "", chargeRate: "", rateBasis: "Hourly", inductionRequired: true,
};

/**
 * "+ Add new starter": a person with a job already agreed. Saving creates (or
 * reuses, by email) the contractor as a New Starter, records the placement and
 * sends the app invite — which says nothing about the job or pay.
 *
 * Saving asks first (OK / Cancel) because the invite email goes as soon as it
 * saves (Jenni, 08-10-26). It used to send, then say so in an OK-only pop-up,
 * too late to cancel. The outcome now shows next to the button.
 */
export function AddNewStarterButton({ companies, roles }: { companies: CompanyOption[]; roles: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const sites = companies.find((c) => c.id === form.companyId)?.sites ?? [];
  const set = (field: keyof typeof EMPTY, value: string | boolean) => setForm((f) => ({ ...f, [field]: value }));

  function openModal() {
    setForm(EMPTY);
    setError("");
    setNotice(null);
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const name = `${form.firstName.trim()} ${form.lastName.trim()}`;
    if (!confirm(`Add ${name} as a new starter and send the app invite to ${form.email.trim()}?\n\nThe invite email goes as soon as you press OK.`)) return;
    setSaving(true);
    try {
      let res = await addNewStarter(form);
      if (res.confirm) {
        if (!confirm(res.confirm)) return;
        res = await addNewStarter(form, true);
      }
      if (res.error) {
        setError(res.error);
        return;
      }
      setOpen(false);
      if (res.ok) setNotice(res.ok);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="rounded-lg bg-[#005f8c] px-4 py-2 text-sm font-medium text-white hover:bg-[#004d72]"
      >
        + Add new starter
      </button>
      {notice && <span className="ml-3 text-sm font-medium text-emerald-700">✓ {notice}</span>}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <form onSubmit={save} className="mx-4 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 bg-[#005f8c] px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Add new starter</h2>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 text-white/70 hover:text-white" aria-label="Close">
                ✕
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={LABEL} htmlFor="ns-first">First name *</label>
                  <input id="ns-first" required maxLength={100} value={form.firstName} onChange={(e) => set("firstName", e.target.value)} className={INPUT} />
                </div>
                <div>
                  <label className={LABEL} htmlFor="ns-last">Last name *</label>
                  <input id="ns-last" required maxLength={100} value={form.lastName} onChange={(e) => set("lastName", e.target.value)} className={INPUT} />
                </div>
                <div>
                  <label className={LABEL} htmlFor="ns-phone">Phone</label>
                  <input id="ns-phone" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} className={INPUT} />
                </div>
                <div>
                  <label className={LABEL} htmlFor="ns-email">Email *</label>
                  <input id="ns-email" type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} className={INPUT} />
                  <p className="mt-1 text-xs text-gray-500">The app invite goes here. An existing person with this email is reused.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={LABEL} htmlFor="ns-company">Company *</label>
                  <select
                    id="ns-company"
                    required
                    value={form.companyId}
                    onChange={(e) => setForm((f) => ({ ...f, companyId: e.target.value, siteId: "" }))}
                    className={INPUT}
                  >
                    <option value="">Choose a company…</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL} htmlFor="ns-site">Site</label>
                  <select id="ns-site" value={form.siteId} onChange={(e) => set("siteId", e.target.value)} disabled={sites.length === 0} className={INPUT}>
                    <option value="">{form.companyId && sites.length === 0 ? "No sites for this company" : "No particular site"}</option>
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL} htmlFor="ns-role">Role *</label>
                  <select id="ns-role" required value={form.role} onChange={(e) => set("role", e.target.value)} className={INPUT}>
                    <option value="">Choose a role…</option>
                    {roles.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL} htmlFor="ns-start">Start date *</label>
                  <input id="ns-start" type="date" required value={form.startDate} onChange={(e) => set("startDate", e.target.value)} className={INPUT} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className={LABEL} htmlFor="ns-pay">Pay rate (£) *</label>
                  <input id="ns-pay" inputMode="decimal" required placeholder="18.50" value={form.payRate} onChange={(e) => set("payRate", e.target.value)} className={INPUT} />
                </div>
                <div>
                  <label className={LABEL} htmlFor="ns-charge">Charge rate (£)</label>
                  <input id="ns-charge" inputMode="decimal" placeholder="Optional" value={form.chargeRate} onChange={(e) => set("chargeRate", e.target.value)} className={INPUT} />
                </div>
                <div>
                  <label className={LABEL} htmlFor="ns-basis">Rate basis *</label>
                  <select id="ns-basis" value={form.rateBasis} onChange={(e) => set("rateBasis", e.target.value)} className={INPUT}>
                    <option value="Hourly">Hourly</option>
                    <option value="Daily">Daily</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.inductionRequired}
                  onChange={(e) => set("inductionRequired", e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Induction required before they start
              </label>

              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4">
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="rounded-lg bg-[#005f8c] px-4 py-2 text-sm font-medium text-white hover:bg-[#004d72] disabled:opacity-50">
                {saving ? "Saving…" : "Add and send app invite"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
