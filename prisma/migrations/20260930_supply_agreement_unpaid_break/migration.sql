-- Unpaid break per shift on a staff-sent Subcontractor Agreement
-- (src/lib/unpaid-break.ts). Optional: older agreements and the public
-- /onboarding form have none.
ALTER TABLE "SupplyAgreement" ADD COLUMN "unpaidBreak" TEXT;
