// Deciding what "delete" or "move" touches when a document was filed against
// the wrong contractor.
//
// An upload writes two rows that share one R2 object: a Document (the file) and
// a ComplianceRecord whose filePath is that Document's storageKey (the upload
// route creates or updates it). Removing only one of them leaves the other
// pointing at, or orphaned from, the file — and for ID scans that means a
// stranger's passport lingering on someone's profile. So both operations work
// on the pair, linked by storageKey === filePath.

export type RemovableDocument = { id: string; storageKey: string };
export type RemovableRecord = { id: string; status: string; filePath: string | null };

export type ItemTarget = { kind: "document"; id: string } | { kind: "record"; id: string };

export const REMOVAL_REASONS = ["Wrong person", "Duplicate", "Other"] as const;
export type RemovalReason = (typeof REMOVAL_REASONS)[number];

export type RemovalPlan = {
  deleteDocumentIds: string[];
  deleteRecordIds: string[];
  /** Records kept (someone verified or edited them) but whose file is going. */
  unlinkRecordIds: string[];
  /** R2 objects to remove once the rows are gone. */
  r2Keys: string[];
};

export type MovePlan = { documentIds: string[]; recordIds: string[] };

/**
 * A Pending record whose only file is being removed was almost certainly
 * auto-created by that upload, so it goes too. Anything a person has touched
 * (Verified, Expired, …) is kept with its file link cleared, so a human
 * decision isn't silently erased along with a misfiled scan.
 */
function isAutoCreated(r: RemovableRecord): boolean {
  return r.status === "Pending";
}

export function planRemoval(
  target: ItemTarget,
  records: RemovableRecord[],
  documents: RemovableDocument[]
): RemovalPlan | null {
  if (target.kind === "document") {
    const doc = documents.find((d) => d.id === target.id);
    if (!doc) return null;
    const linked = records.filter((r) => r.filePath === doc.storageKey);
    return {
      deleteDocumentIds: [doc.id],
      deleteRecordIds: linked.filter(isAutoCreated).map((r) => r.id),
      unlinkRecordIds: linked.filter((r) => !isAutoCreated(r)).map((r) => r.id),
      r2Keys: [doc.storageKey],
    };
  }

  const rec = records.find((r) => r.id === target.id);
  if (!rec) return null;
  const docs = rec.filePath ? documents.filter((d) => d.storageKey === rec.filePath) : [];
  // Another record pointing at the same file loses it too.
  const siblings = rec.filePath
    ? records.filter((r) => r.id !== rec.id && r.filePath === rec.filePath)
    : [];
  return {
    deleteDocumentIds: docs.map((d) => d.id),
    deleteRecordIds: [rec.id],
    unlinkRecordIds: docs.length > 0 ? siblings.map((r) => r.id) : [],
    r2Keys: docs.map((d) => d.storageKey),
  };
}

/** Everything that travels with the target to the right contractor. */
export function planMove(
  target: ItemTarget,
  records: RemovableRecord[],
  documents: RemovableDocument[]
): MovePlan | null {
  if (target.kind === "document") {
    const doc = documents.find((d) => d.id === target.id);
    if (!doc) return null;
    return {
      documentIds: [doc.id],
      recordIds: records.filter((r) => r.filePath === doc.storageKey).map((r) => r.id),
    };
  }

  const rec = records.find((r) => r.id === target.id);
  if (!rec) return null;
  if (!rec.filePath) return { documentIds: [], recordIds: [rec.id] };
  return {
    documentIds: documents.filter((d) => d.storageKey === rec.filePath).map((d) => d.id),
    recordIds: records.filter((r) => r.filePath === rec.filePath).map((r) => r.id),
  };
}

/** Normalise the reason from the form; free text only for "Other". */
export function parseRemovalReason(reason: unknown, detail: unknown): string | null {
  if (typeof reason !== "string" || !(REMOVAL_REASONS as readonly string[]).includes(reason)) return null;
  if (reason !== "Other") return reason;
  const text = typeof detail === "string" ? detail.trim().slice(0, 200) : "";
  return text ? `Other: ${text}` : null;
}
