/**
 * The profile Activity tab's feed: staff/worker actions (ActivityLog) merged
 * with what automation did to the person (WorkflowLog — reminders, welcome
 * email, auto-Inactive), newest first. Pure, so the merge and wording are
 * tested without a database.
 */

export type FeedRow = {
  id: string;
  action: string;
  details: string | null;
  userName: string | null;
  userEmail: string | null;
  createdAt: Date;
  automatic: boolean;
};

type ActivityLike = {
  id: string; action: string; details: string | null;
  userName: string | null; userEmail: string | null; createdAt: Date;
};
type WorkflowLike = {
  id: string; workflow: string; action: string; outcome: string; detail: string | null; createdAt: Date;
};

const WORKFLOW_LABELS: Record<string, string> = {
  "compliance-chase": "Automatic document reminder emailed",
  "welcome-agent": "Welcome email sent",
  "leaving-date": "Made Inactive — leaving date passed",
  "stale-applicant": "Office alerted: application waiting",
  "unsubmitted-uploads": "Office alerted: uploads not submitted",
  "bounce-check": "Email bounce detected",
  "declaration-retention": "Health & declarations erased (retention)",
};

/** Only what actually happened: skips and manual sends (already in ActivityLog) are left out. */
export function workflowRowsForFeed(rows: WorkflowLike[]): FeedRow[] {
  return rows
    .filter((w) => w.outcome === "sent" || w.outcome === "escalated" || w.outcome === "failed")
    .filter((w) => !(w.detail ?? "").startsWith("manual by"))
    .map((w) => ({
      id: `wf-${w.id}`,
      action: `${WORKFLOW_LABELS[w.workflow] ?? w.workflow}${w.outcome === "failed" ? " — FAILED" : ""}`,
      details: w.detail,
      userName: "PRISM (automatic)",
      userEmail: null,
      createdAt: w.createdAt,
      automatic: true,
    }));
}

export function mergeFeed(activity: ActivityLike[], workflow: WorkflowLike[], limit: number): FeedRow[] {
  const people: FeedRow[] = activity.map((a) => ({ ...a, automatic: false }));
  return [...people, ...workflowRowsForFeed(workflow)]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);
}

/**
 * A details string as readable text. Older entries hold JSON objects; show
 * their simple values as "key: value" pairs rather than raw braces.
 */
export function readableDetails(details: string | null): string | null {
  if (!details?.trim()) return null;
  const t = details.trim();
  if (!t.startsWith("{")) return t;
  try {
    const obj = JSON.parse(t) as Record<string, unknown>;
    const parts = Object.entries(obj)
      .filter(([, v]) => v !== null && v !== undefined && v !== "" && typeof v !== "object")
      .map(([k, v]) => `${k}: ${String(v)}`);
    return parts.length ? parts.join(" · ") : null;
  } catch {
    return t;
  }
}
