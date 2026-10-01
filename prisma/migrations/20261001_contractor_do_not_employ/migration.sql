-- "Do not employ" flag (PRL, 2026-10-01): staff tick it with a reason, e.g.
-- after an incident on site. Shown red on the profile; blocks new placements
-- and stops automation making the person Active again.
ALTER TABLE "Contractor" ADD COLUMN "doNotEmploy" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Contractor" ADD COLUMN "doNotEmployReason" TEXT;
ALTER TABLE "Contractor" ADD COLUMN "doNotEmployAt" TIMESTAMP(3);
ALTER TABLE "Contractor" ADD COLUMN "doNotEmployBy" TEXT;
