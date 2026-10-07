import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { sendPushToContractor } from "@/lib/push";
import { notifyAllStaff } from "@/lib/staff-notify";
import {
  MESSAGE_FROM_WORKER,
  MESSAGE_TO_WORKER,
  messagePreview,
  REPLY_ALERT_TO,
  replyAlertEmail,
  resolveWorkerEmail,
  shouldSendReplyAlert,
  sortThread,
  workerNotificationEmail,
} from "@/lib/contractor-messages";

const REPLY_ALERT_ACTION = "Staff told of message reply";

function appUrl(): string {
  return process.env.NEXTAUTH_URL || "https://www.prismworkforce.online";
}

/**
 * Worker replies nobody in the office has opened yet — the sidebar badge.
 * Any staff member opening that worker's Messages tab clears theirs: the
 * office shares one inbox, like admin@.
 */
export async function countUnreadWorkerReplies(): Promise<number> {
  return prisma.contractorMessage.count({ where: { direction: MESSAGE_FROM_WORKER, readAt: null } });
}

/** Unread PRL messages for one worker — the portal home badge. */
export async function countUnreadForWorker(contractorId: string): Promise<number> {
  return prisma.contractorMessage.count({ where: { contractorId, direction: MESSAGE_TO_WORKER, readAt: null } });
}

export interface ThreadMessageView {
  id: string;
  direction: string;
  body: string;
  senderName: string;
  senderJobTitle: string | null;
  senderPhone: string | null;
  readAt: Date | null;
  createdAt: Date;
}

/**
 * The whole thread, oldest first, with each staff sender's CURRENT job title
 * and phone from their User record — so the worker knows who to call, and a
 * changed number shows on old messages too.
 */
export async function loadThread(contractorId: string): Promise<ThreadMessageView[]> {
  const rows = await prisma.contractorMessage.findMany({
    where: { contractorId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  const userIds = [...new Set(rows.map((r) => r.senderUserId).filter((x): x is string => !!x))];
  const users = userIds.length
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, jobTitle: true, phone: true } })
    : [];
  const byId = new Map(users.map((u) => [u.id, u]));
  return sortThread(rows).map((r) => {
    const u = r.senderUserId ? byId.get(r.senderUserId) : undefined;
    return {
      id: r.id,
      direction: r.direction,
      body: r.body,
      senderName: r.senderName,
      senderJobTitle: u?.jobTitle?.trim() || null,
      senderPhone: u?.phone?.trim() || null,
      readAt: r.readAt,
      createdAt: r.createdAt,
    };
  });
}

/** Mark everything the viewer has received in this thread as read. */
export async function markThreadRead(contractorId: string, viewer: "staff" | "worker"): Promise<void> {
  await prisma.contractorMessage.updateMany({
    where: {
      contractorId,
      direction: viewer === "staff" ? MESSAGE_FROM_WORKER : MESSAGE_TO_WORKER,
      readAt: null,
    },
    data: { readAt: new Date() },
  });
}

export type SendToWorkerResult =
  | { ok: true; emailedTo: string | null; hasAppLogin: boolean }
  | { ok: false; error: string };

/**
 * Store a staff → worker message, then tell the worker by email + push that
 * there is something to read. The message itself is saved first and is never
 * rolled back because a notification failed.
 */
export async function sendMessageToWorker(input: {
  contractorId: string;
  body: string;
  senderUserId: string | null;
  senderName: string;
}): Promise<SendToWorkerResult> {
  const contractor = await prisma.contractor.findUnique({
    where: { id: input.contractorId },
    select: { id: true, email: true, contractorLogin: { select: { email: true } } },
  });
  if (!contractor) return { ok: false, error: "Contractor not found." };

  await prisma.contractorMessage.create({
    data: {
      contractorId: contractor.id,
      direction: MESSAGE_TO_WORKER,
      body: input.body,
      senderUserId: input.senderUserId,
      senderName: input.senderName,
    },
  });

  const messagesUrl = `${appUrl()}/portal/messages`;
  const to = resolveWorkerEmail(contractor.contractorLogin?.email, contractor.email);
  let emailedTo: string | null = null;
  if (to) {
    const { subject, html } = workerNotificationEmail(messagesUrl, input.body);
    const result = await sendEmail({ to, subject, html, template: "worker-message-notification" });
    if (result.success) emailedTo = to;
  }

  try {
    await sendPushToContractor(
      contractor.id,
      "New message from PRL",
      "You have a new message from PRL Site Solutions — open PRISM to read it.",
      "/portal/messages"
    );
  } catch (err) {
    console.error("[contractor-messages] push failed:", err instanceof Error ? err.message : err);
  }

  return { ok: true, emailedTo, hasAppLogin: !!contractor.contractorLogin };
}

/**
 * Store a worker → PRL reply and email the office, at most once per worker per
 * REPLY_ALERT_QUIET_MINUTES (same ActivityLog-backed approach as
 * upload-notification.ts, so it survives restarts and multiple instances).
 */
export async function recordWorkerReply(contractorId: string, body: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const contractor = await prisma.contractor.findUnique({
    where: { id: contractorId },
    select: { firstName: true, lastName: true },
  });
  if (!contractor) return { ok: false, error: "We couldn't find your record. Please call PRL." };
  const name = `${contractor.firstName} ${contractor.lastName}`.trim();

  await prisma.contractorMessage.create({
    data: { contractorId, direction: MESSAGE_FROM_WORKER, body, senderUserId: null, senderName: name },
  });

  // Every reply goes on the staff bell / Notifications page (not throttled like the email).
  await notifyAllStaff({
    title: `${name} replied`,
    body: messagePreview(body),
    url: `/contractors/${contractorId}?tab=Messages`,
  });

  try {
    const last = await prisma.activityLog.findFirst({
      where: { entityType: "Contractor", entityId: contractorId, action: REPLY_ALERT_ACTION },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    if (shouldSendReplyAlert(last?.createdAt ?? null)) {
      const link = `${appUrl()}/contractors/${contractorId}?tab=Messages`;
      const { subject, html } = replyAlertEmail(name, link);
      const result = await sendEmail({ to: REPLY_ALERT_TO, subject, html, template: "worker-message-reply-alert" });
      if (result.success) {
        await prisma.activityLog.create({
          data: {
            userName: "System",
            action: REPLY_ALERT_ACTION,
            entityType: "Contractor",
            entityId: contractorId,
            details: `Emailed ${REPLY_ALERT_TO}`,
          },
        });
      }
    }
  } catch (err) {
    // Never lose the worker's reply because the office alert didn't go.
    console.error("[contractor-messages] reply alert failed:", err instanceof Error ? err.message : err);
  }

  return { ok: true };
}
