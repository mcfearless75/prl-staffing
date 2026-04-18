-- Add profileCompletionSentAt to Contractor
ALTER TABLE "Contractor" ADD COLUMN IF NOT EXISTS "profileCompletionSentAt" TIMESTAMP(3);
