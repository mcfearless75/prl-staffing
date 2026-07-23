-- ComplianceRecord: explicit "No expiry" flag, distinct from expiryDate being
-- null because it was never entered.
ALTER TABLE "ComplianceRecord" ADD COLUMN     "indefiniteExpiry" BOOLEAN NOT NULL DEFAULT false;
