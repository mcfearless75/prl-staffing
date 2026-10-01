-- The contractor profile's Activity tab filters by (entityType, entityId) and
-- orders by createdAt. ActivityLog had no index at all, so every profile view
-- scanned the whole table — and it grows with every action now logged.
CREATE INDEX "ActivityLog_entityType_entityId_createdAt_idx" ON "ActivityLog"("entityType", "entityId", "createdAt");
