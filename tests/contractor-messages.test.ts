import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MESSAGE_FROM_WORKER,
  MESSAGE_MAX_LENGTH,
  MESSAGE_TO_WORKER,
  REPLY_ALERT_QUIET_MINUTES,
  checkInMessageBody,
  countUnread,
  messageSnippet,
  replyAlertEmail,
  resolveWorkerEmail,
  shouldSendReplyAlert,
  sortThread,
  summariseConversations,
  validateMessageBody,
  workerNotificationEmail,
} from "@/lib/contractor-messages";

const at = (iso: string) => new Date(iso);
const msg = (id: string, direction: string, iso: string, readAt: Date | null = null) => ({
  id,
  direction,
  createdAt: at(iso),
  readAt,
});

test("body is trimmed, empty is rejected, the limit counts after trimming", () => {
  assert.deepEqual(validateMessageBody("  hello  "), { ok: true, body: "hello" });
  assert.equal(validateMessageBody("   \n\t ").ok, false);
  assert.equal(validateMessageBody(null).ok, false);
  assert.equal(validateMessageBody(42).ok, false);
  assert.equal(validateMessageBody("x".repeat(MESSAGE_MAX_LENGTH)).ok, true);
  assert.equal(validateMessageBody(`  ${"x".repeat(MESSAGE_MAX_LENGTH)}  `).ok, true);
  assert.equal(validateMessageBody("x".repeat(MESSAGE_MAX_LENGTH + 1)).ok, false);
});

test("thread reads oldest to newest, stable on identical timestamps, without mutating the input", () => {
  const input = [
    msg("c", MESSAGE_TO_WORKER, "2026-10-06T10:00:00Z"),
    msg("b", MESSAGE_FROM_WORKER, "2026-10-06T09:00:00Z"),
    msg("a", MESSAGE_TO_WORKER, "2026-10-06T10:00:00Z"),
  ];
  const before = input.map((m) => m.id);
  assert.deepEqual(sortThread(input).map((m) => m.id), ["b", "a", "c"]);
  assert.deepEqual(input.map((m) => m.id), before);
});

test("unread counts only what the viewer RECEIVED and has not read", () => {
  const read = at("2026-10-06T12:00:00Z");
  const thread = [
    msg("1", MESSAGE_TO_WORKER, "2026-10-06T09:00:00Z"),
    msg("2", MESSAGE_TO_WORKER, "2026-10-06T09:01:00Z", read),
    msg("3", MESSAGE_FROM_WORKER, "2026-10-06T09:02:00Z"),
    msg("4", MESSAGE_FROM_WORKER, "2026-10-06T09:03:00Z"),
    msg("5", MESSAGE_FROM_WORKER, "2026-10-06T09:04:00Z", read),
  ];
  assert.equal(countUnread(thread, "worker"), 1);
  assert.equal(countUnread(thread, "staff"), 2);
  // Invariant: every unread message is unread for exactly one side.
  const unreadTotal = thread.filter((m) => m.readAt === null).length;
  assert.equal(countUnread(thread, "worker") + countUnread(thread, "staff"), unreadTotal);
});

test("reply alert: first one goes, then quiet for the window, then allowed again", () => {
  const now = at("2026-10-06T12:00:00Z");
  const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000);
  assert.equal(shouldSendReplyAlert(null, now), true);
  assert.equal(shouldSendReplyAlert(minutesAgo(0), now), false);
  assert.equal(shouldSendReplyAlert(minutesAgo(REPLY_ALERT_QUIET_MINUTES - 1), now), false);
  assert.equal(shouldSendReplyAlert(minutesAgo(REPLY_ALERT_QUIET_MINUTES), now), true);
  assert.equal(shouldSendReplyAlert(minutesAgo(REPLY_ALERT_QUIET_MINUTES + 60), now), true);
  assert.equal(REPLY_ALERT_QUIET_MINUTES, 15);
});

test("conversations: anyone with unread replies first, then most recent first", () => {
  const rows = [
    { contractorId: "old-unread", name: "A", lastBody: "x", lastDirection: MESSAGE_FROM_WORKER, lastAt: at("2026-10-01T09:00:00Z") },
    { contractorId: "new-read", name: "B", lastBody: "y", lastDirection: MESSAGE_TO_WORKER, lastAt: at("2026-10-06T09:00:00Z") },
    { contractorId: "mid-read", name: "C", lastBody: "z", lastDirection: MESSAGE_TO_WORKER, lastAt: at("2026-10-04T09:00:00Z") },
    { contractorId: "new-unread", name: "D", lastBody: "w", lastDirection: MESSAGE_FROM_WORKER, lastAt: at("2026-10-05T09:00:00Z") },
  ];
  const out = summariseConversations(rows, new Map([["old-unread", 1], ["new-unread", 3]]));
  assert.deepEqual(out.map((c) => c.contractorId), ["new-unread", "old-unread", "new-read", "mid-read"]);
  assert.deepEqual(out.map((c) => c.unread), [3, 1, 0, 0]);
});

test("snippet flattens whitespace and cuts long text with an ellipsis", () => {
  assert.equal(messageSnippet("  hi\n\nthere  "), "hi there");
  const long = "word ".repeat(40);
  const s = messageSnippet(long, 30);
  assert.ok(s.endsWith("…"));
  assert.ok(s.length <= 31);
});

test("worker email: login email first, then contractor email, never a placeholder", () => {
  assert.equal(resolveWorkerEmail("login@x.com", "record@x.com"), "login@x.com");
  assert.equal(resolveWorkerEmail(null, "record@x.com"), "record@x.com");
  assert.equal(resolveWorkerEmail("  ", "record@x.com"), "record@x.com");
  assert.equal(resolveWorkerEmail("a.b@prl-placeholder.co.uk", "record@x.com"), "record@x.com");
  assert.equal(resolveWorkerEmail(null, "a.b@prl-placeholder.co.uk"), null);
  assert.equal(resolveWorkerEmail(undefined, undefined), null);
});

test("check-in text names the person and site, with a fallback for no site", () => {
  const body = checkInMessageBody("Joe", "Hinkley Point C");
  assert.match(body, /^Hi Joe, /);
  assert.match(body, /at Hinkley Point C today/);
  assert.match(body, /0800 772 3959/);
  assert.match(checkInMessageBody("Joe", "  "), /at your site today/);
});

test("notification emails never carry the message, and escape what they do carry", () => {
  const worker = workerNotificationEmail("https://example.test/portal/messages");
  assert.match(worker.html, /log in to the PRISM app to read it/i);
  assert.match(worker.html, /https:\/\/example\.test\/portal\/messages/);

  const alert = replyAlertEmail(`<script>alert(1)</script> O'Neil`, "https://example.test/contractors/1?tab=Messages&x=1");
  assert.equal(alert.subject, `<script>alert(1)</script> O'Neil replied in PRISM`);
  assert.ok(!alert.html.includes("<script>"));
  assert.match(alert.html, /&lt;script&gt;/);
  assert.match(alert.html, /O&#39;Neil/);
  assert.match(alert.html, /tab=Messages&amp;x=1/);
});
