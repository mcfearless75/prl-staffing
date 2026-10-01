-- Staff dismiss someone from Onboarding's "Ready for an agreement" list
-- (tests, people already working). Hides them from the list and the profile
-- prompt; nothing else changes. See src/lib/agreement-readiness.ts.
ALTER TABLE "Contractor" ADD COLUMN "agreementNotNeededAt" TIMESTAMP(3);
ALTER TABLE "Contractor" ADD COLUMN "agreementNotNeededBy" TEXT;
