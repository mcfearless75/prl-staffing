-- Right-to-work fields have been collected by /apply since launch, but the route
-- only ever wrote them into the Contractor.notes JSON blob. Nothing parsed that
-- blob back out, so passport and visa numbers -- and critically their expiry
-- dates -- were stored and shown to nobody, and were invisible to the compliance
-- expiry alerting that should have been watching them.
--
-- Promoted to real columns so they are queryable and can drive alerts. All are
-- nullable and purely additive, so this is safe on a live database. notes keeps
-- the full raw blob as the audit trail: a date that fails to parse during
-- backfill is degraded to NULL, never lost.
ALTER TABLE "Contractor" ADD COLUMN "nonBritishNational" TEXT;
ALTER TABLE "Contractor" ADD COLUMN "requiresWorkPermit" TEXT;
ALTER TABLE "Contractor" ADD COLUMN "passportNumber"     TEXT;
ALTER TABLE "Contractor" ADD COLUMN "passportExpiry"     TIMESTAMP(3);
ALTER TABLE "Contractor" ADD COLUMN "visaNumber"         TEXT;
ALTER TABLE "Contractor" ADD COLUMN "visaExpiry"         TIMESTAMP(3);

-- Expiry lookups drive the compliance chase queries, which filter on a date
-- window across the whole contractor table.
CREATE INDEX "Contractor_passportExpiry_idx" ON "Contractor"("passportExpiry");
CREATE INDEX "Contractor_visaExpiry_idx" ON "Contractor"("visaExpiry");
