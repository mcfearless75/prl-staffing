-- Team alerts are stored as one copy per staff member. Link the copies so that
-- when one person opens an alert it shows as read for everyone, with who
-- opened it (Jenni, 2026-10-08).
ALTER TABLE "Notification" ADD COLUMN "groupId" TEXT;
ALTER TABLE "Notification" ADD COLUMN "readBy" TEXT;
CREATE INDEX "Notification_groupId_idx" ON "Notification"("groupId");

-- Link the copies of alerts already sent: staff copies created by one insert
-- share their title, body, link and timestamp. Only groups of two or more are
-- linked, so a personal alert (an @mention) stays personal.
WITH keyed AS (
  SELECT id,
         md5("title" || '|' || "body" || '|' || coalesce("url", '') || '|' || date_trunc('second', "sentAt")::text) AS k
  FROM "Notification"
  WHERE "recipientType" = 'user'
),
shared AS (
  SELECT k FROM keyed GROUP BY k HAVING count(*) > 1
)
UPDATE "Notification" n
SET "groupId" = keyed.k
FROM keyed
WHERE n.id = keyed.id AND keyed.k IN (SELECT k FROM shared);

-- An alert someone has already opened is read for everyone.
UPDATE "Notification"
SET "isRead" = true
WHERE "groupId" IN (SELECT DISTINCT "groupId" FROM "Notification" WHERE "groupId" IS NOT NULL AND "isRead" = true)
  AND "isRead" = false;
