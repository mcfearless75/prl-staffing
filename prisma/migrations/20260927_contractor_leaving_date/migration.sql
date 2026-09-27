-- The date a contractor leaves PRL. Once it has passed, the daily workflow
-- run makes them Inactive (src/lib/workflows/leaving-date.ts). Optional.
ALTER TABLE "Contractor" ADD COLUMN "leavingDate" TIMESTAMP(3);
