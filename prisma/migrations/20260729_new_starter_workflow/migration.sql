-- New starter checklists were a read-only dead end. Give them a review workflow:
-- New -> Processed (converted to a Subcontractor record) or Rejected.
ALTER TABLE "NewStarterSubmission"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'New',
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "contractorId" TEXT,
  ADD COLUMN "processedAt" TIMESTAMP(3),
  ADD COLUMN "processedBy" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
