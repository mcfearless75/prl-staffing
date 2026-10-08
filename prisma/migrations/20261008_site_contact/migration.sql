-- Site contact (Jenni, 2026-10-08): name, phone and email of the client's
-- contact at a site, filled into subcontractor agreements for that site.
-- Optional: existing sites simply have none until someone adds them.
ALTER TABLE "Site" ADD COLUMN "contactName" TEXT;
ALTER TABLE "Site" ADD COLUMN "contactPhone" TEXT;
ALTER TABLE "Site" ADD COLUMN "contactEmail" TEXT;
