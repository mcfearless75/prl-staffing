-- App Invite Form (worker portal profile). All optional; nothing is backfilled.
ALTER TABLE "Contractor"
  ADD COLUMN "title" TEXT,
  ADD COLUMN "pronouns" TEXT,
  ADD COLUMN "nationality" TEXT,
  ADD COLUMN "profileSubmittedAt" TIMESTAMP(3),
  ADD COLUMN "nameChangedAt" TIMESTAMP(3),
  ADD COLUMN "nameChangedFrom" TEXT,
  ADD COLUMN "rtwRoute" TEXT,
  ADD COLUMN "shareCode" TEXT;
