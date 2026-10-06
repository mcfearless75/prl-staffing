"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Paperclip, X } from "lucide-react";
import { COMPLIANCE_TYPE_GROUPS } from "@/lib/compliance-types";
import {
  reapplyRecordAfterUpload,
  type CreateForUploadResult,
} from "@/app/(dashboard)/compliance/actions";

// Mirrors the limits enforced by POST /api/documents (route files can only
// export handlers, so the constants can't be imported from there). Checked
// here first so an obviously-bad file is caught before the record is created.
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ACCEPTED = ".pdf,.jpg,.jpeg,.png,.heic,.heif,.webp,.doc,.docx";

interface ComplianceFormProps {
  record?: any;
  contractors: Array<{ id: string; firstName: string; lastName: string }>;
  action: (formData: FormData) => Promise<void>;
  defaultContractorId?: string;
  backUrl?: string;
  /**
   * Create only. When set, the form offers an optional file. With a file
   * attached, saving creates the record via this action, uploads the file
   * through POST /api/documents, then navigates. Without a file, `action`
   * runs exactly as before.
   */
  createForUpload?: (formData: FormData) => Promise<CreateForUploadResult>;
}

function toDateInputValue(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toISOString().split("T")[0];
}

function fileProblem(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) return "That file is over 10MB. Please attach a smaller copy.";
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return "File type not allowed. Use PDF, images, or Word documents.";
  }
  return null;
}

export function ComplianceForm({
  record,
  contractors,
  action,
  defaultContractorId,
  backUrl,
  createForUpload,
}: ComplianceFormProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const canAttach = Boolean(createForUpload) && !record;

  function clearFile() {
    setFile(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  // Only intercepts when a file is attached; otherwise the form's server
  // action runs untouched.
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!canAttach || !file || !createForUpload) return;
    e.preventDefault();
    if (busy) return;

    const problem = fileProblem(file);
    if (problem) {
      setError(problem);
      return;
    }

    const formData = new FormData(e.currentTarget);
    setError(null);
    setBusy("Saving record…");

    let created: CreateForUploadResult;
    try {
      created = await createForUpload(formData);
    } catch {
      created = { ok: false, error: "Something went wrong saving the record. Please try again." };
    }
    if (!created.ok) {
      setError(created.error);
      setBusy(null);
      return;
    }

    // The record now exists. From here on never leave the user on this form
    // (re-submitting would create a duplicate): any failure lands on the
    // record's edit page, which has the uploader, with a message saying why.
    const editUrl = (msg: string) =>
      `/compliance/${created.id}/edit?uploadError=${encodeURIComponent(msg)}`;

    setBusy("Uploading file…");
    let documentId: string | null = null;
    try {
      const upload = new FormData();
      upload.append("file", file);
      upload.append("type", created.type);
      upload.append("contractorId", created.contractorId);
      // Attach to THIS record, not an older one of the same type (renewals).
      upload.append("complianceRecordId", created.id);
      const res = await fetch("/api/documents", { method: "POST", body: upload });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed");
      documentId = data.document?.id ?? null;
    } catch (uploadErr) {
      const reason = uploadErr instanceof Error ? uploadErr.message : "Upload failed";
      router.push(
        editUrl(`The record was saved, but the file did not upload (${reason}). Please upload it below.`)
      );
      return;
    }

    const reapplied = documentId
      ? await reapplyRecordAfterUpload(created.id, documentId, {
          status: String(formData.get("status") ?? "Pending"),
          notes: String(formData.get("notes") ?? ""),
          documentName: String(formData.get("documentName") ?? ""),
        }).catch(() => ({ ok: false }))
      : { ok: false };
    if (!reapplied.ok) {
      router.push(
        editUrl(
          "The record was saved and the file uploaded, but the status and notes may have been reset to Pending. Please check them below."
        )
      );
      return;
    }

    router.push(created.redirectTo);
    router.refresh();
  }

  return (
    <form action={action} onSubmit={handleSubmit}>
      <div className="rounded-xl border bg-white p-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Contractor */}
          <div>
            <label
              htmlFor="contractorId"
              className="block text-sm font-medium text-gray-700"
            >
              Contractor
            </label>
            <select
              id="contractorId"
              name="contractorId"
              required
              defaultValue={record?.contractorId ?? defaultContractorId ?? ""}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select a contractor</option>
              {contractors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div>
            <label
              htmlFor="type"
              className="block text-sm font-medium text-gray-700"
            >
              Type
            </label>
            <select
              id="type"
              name="type"
              required
              defaultValue={record?.type ?? ""}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select type</option>
              {COMPLIANCE_TYPE_GROUPS.map((group) => (
                <optgroup key={group.category} label={group.category}>
                  {group.types.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Document Name */}
          <div>
            <label
              htmlFor="documentName"
              className="block text-sm font-medium text-gray-700"
            >
              Document Name
            </label>
            <input
              type="text"
              id="documentName"
              name="documentName"
              defaultValue={record?.documentName ?? ""}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Reference Number */}
          <div>
            <label
              htmlFor="reference"
              className="block text-sm font-medium text-gray-700"
            >
              Reference Number
            </label>
            <input
              type="text"
              id="reference"
              name="reference"
              defaultValue={record?.reference ?? ""}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Issue Date */}
          <div>
            <label
              htmlFor="issueDate"
              className="block text-sm font-medium text-gray-700"
            >
              Issue Date
            </label>
            <input
              type="date"
              id="issueDate"
              name="issueDate"
              defaultValue={toDateInputValue(record?.issueDate)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Expiry Date */}
          <div>
            <label
              htmlFor="expiryDate"
              className="block text-sm font-medium text-gray-700"
            >
              Expiry Date
            </label>
            <input
              type="date"
              id="expiryDate"
              name="expiryDate"
              defaultValue={toDateInputValue(record?.expiryDate)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Status */}
          <div>
            <label
              htmlFor="status"
              className="block text-sm font-medium text-gray-700"
            >
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={record?.status ?? "Pending"}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="Verified">Verified</option>
              <option value="Pending">Pending</option>
              <option value="Expiring">Expiring</option>
              <option value="Expired">Expired</option>
              <option value="Non-Compliant">Non-Compliant</option>
            </select>
          </div>

          {/* Notes - full width */}
          <div className="md:col-span-2">
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-gray-700"
            >
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              defaultValue={record?.notes ?? ""}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Optional attachment - create only (the edit page has its own uploader) */}
          {canAttach && (
            <div className="md:col-span-2">
              <label htmlFor="attachment" className="block text-sm font-medium text-gray-700">
                Document file <span className="font-normal text-gray-400">(optional)</span>
              </label>
              {/* No `name`: the file goes to /api/documents, never through the server action. */}
              <input
                ref={fileRef}
                id="attachment"
                type="file"
                accept={ACCEPTED}
                onChange={(e) => {
                  const picked = e.target.files?.[0] ?? null;
                  setFile(picked);
                  setError(picked ? fileProblem(picked) : null);
                }}
                className="mt-1 block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
              />
              {file ? (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-600">
                  <Paperclip className="h-3.5 w-3.5" />
                  {file.name} ·{" "}
                  {file.size > 1048576
                    ? `${(file.size / 1048576).toFixed(1)}MB`
                    : `${(file.size / 1024).toFixed(0)}KB`}
                  <button
                    type="button"
                    onClick={clearFile}
                    className="ml-1 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    title="Remove file"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </p>
              ) : (
                <p className="mt-1 text-xs text-gray-500">
                  PDF, image or Word document, up to 10MB. Uploaded when you save the record.
                </p>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <Link
            href={backUrl ?? "/compliance"}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={Boolean(busy)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ?? (file && canAttach ? "Save Record & Upload" : "Save Record")}
          </button>
        </div>
      </div>
    </form>
  );
}
