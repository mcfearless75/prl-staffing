import { prisma } from "@/lib/db";
import { logAction } from "./engine";
import type { WorkflowResult } from "./engine";
import { getGraphConfig, fetchUnreadInboxMessages, markMessageAsRead } from "@/lib/email-graph";
import { isDsnCandidate, parseDsnText } from "./bounce-parse";

/**
 * Reads unread bounce notifications out of the infotech@ mailbox and flags
 * the matching contractor. Everything else in PRISM that sends mail
 * (compliance-chase, welcome-agent, etc.) only ever knows the send API
 * *accepted* the request — a hard bounce comes back later, asynchronously,
 * as a DSN in the inbox, and until this agent nothing read that inbox.
 *
 * Only acts on hard (5xx, permanent) bounces. Soft (4xx, temporary — mailbox
 * full, greylisting) bounces are marked read and otherwise ignored: they
 * aren't evidence the address is dead.
 *
 * Idempotent by construction rather than via alreadyActedToday: a processed
 * message is marked read, so the next run's unread-filter is the queue of
 * genuinely new work, not a re-scan.
 */
export const bounceCheckAgent = {
  name: "bounce-check",
  async run(): Promise<WorkflowResult> {
    const result: WorkflowResult = { workflow: "bounce-check", acted: 0, skipped: 0, failed: 0, log: [] };

    const graphConfig = getGraphConfig();
    if (!graphConfig) {
      result.log.push("Graph not configured — bounce detection needs the M365 mailbox, skipping.");
      return result;
    }

    let messages;
    try {
      messages = await fetchUnreadInboxMessages(graphConfig);
    } catch (err) {
      console.error("[bounce-check] Failed to fetch inbox:", err);
      await logAction("bounce-check", "fetch-inbox", "failed", "mailbox", String(err));
      result.failed = 1;
      result.log.push(`✗ Could not read the mailbox: ${String(err)}`);
      return result;
    }

    const candidates = messages.filter((m) => isDsnCandidate(m.subject, m.fromAddress));
    if (candidates.length === 0) {
      result.log.push("No bounce notifications in the inbox.");
      return result;
    }

    for (const message of candidates) {
      const parsed = parseDsnText(message.text);

      // Looks like a DSN but couldn't be parsed — leave it unread so a human
      // notices it in Outlook, rather than silently marking it handled.
      if (!parsed) {
        result.skipped++;
        result.log.push(`? Unparseable bounce: "${message.subject}"`);
        continue;
      }

      // Temporary failure — not evidence the address is dead. Clear it from
      // the queue without flagging anyone.
      if (parsed.severity === "soft") {
        await markMessageAsRead(graphConfig, message.id).catch((err) =>
          console.error("[bounce-check] Failed to mark soft-bounce message read:", err)
        );
        result.skipped++;
        continue;
      }

      const contractor = await prisma.contractor.findFirst({
        where: { email: { equals: parsed.recipient, mode: "insensitive" } },
        select: { id: true, firstName: true, lastName: true },
      });

      // Hard bounce for an address that isn't a contractor's — nothing to flag.
      if (!contractor) {
        await markMessageAsRead(graphConfig, message.id).catch((err) =>
          console.error("[bounce-check] Failed to mark unmatched-bounce message read:", err)
        );
        result.skipped++;
        continue;
      }

      try {
        await prisma.contractor.update({
          where: { id: contractor.id },
          data: {
            emailBounced: true,
            emailBouncedAt: new Date(),
            emailBounceReason: `${parsed.code}: ${message.subject}`.slice(0, 500),
          },
        });
        await markMessageAsRead(graphConfig, message.id);
        await logAction(
          "bounce-check",
          "email-bounced",
          "escalated",
          contractor.id,
          `${parsed.recipient} — ${parsed.code}`
        );
        result.acted++;
        result.log.push(
          `⚠ Flagged ${contractor.firstName} ${contractor.lastName} — email bounced (${parsed.code})`
        );
      } catch (err) {
        console.error(`[bounce-check] Failed to flag contractor ${contractor.id}:`, err);
        await logAction("bounce-check", "email-bounced", "failed", contractor.id, String(err));
        result.failed++;
        result.log.push(`✗ Failed to flag ${contractor.firstName} ${contractor.lastName}: ${String(err)}`);
      }
    }

    return result;
  },
};
