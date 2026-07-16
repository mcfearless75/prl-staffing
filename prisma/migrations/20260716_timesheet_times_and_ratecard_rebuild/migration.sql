-- TimesheetEntry: per-day start/finish clock times (hours derived from these when both set)
ALTER TABLE "TimesheetEntry" ADD COLUMN     "startTime" TEXT,
ADD COLUMN     "finishTime" TEXT;

-- RateCard rebuild: rename existing columns (preserves data) + add PRL Console fields
ALTER TABLE "RateCard" RENAME COLUMN "role" TO "trade";
ALTER TABLE "RateCard" RENAME COLUMN "location" TO "region";
ALTER TABLE "RateCard" RENAME COLUMN "payRate" TO "pay";
ALTER TABLE "RateCard" RENAME COLUMN "chargeRate" TO "charge";

ALTER TABLE "RateCard" ADD COLUMN     "sector" TEXT,
ADD COLUMN     "project" TEXT,
ADD COLUMN     "employmentType" TEXT NOT NULL DEFAULT 'PAYE',
ADD COLUMN     "rateType" TEXT NOT NULL DEFAULT 'Time',
ADD COLUMN     "rateBasis" TEXT NOT NULL DEFAULT 'Hourly',
ADD COLUMN     "agencyMarkup" DOUBLE PRECISION;

ALTER TABLE "RateCard" ALTER COLUMN "effectiveFrom" SET DEFAULT CURRENT_TIMESTAMP;
