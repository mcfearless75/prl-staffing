-- AlterTable: Contractor — cached geocode for coverage map
ALTER TABLE "Contractor" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "geocodedAt" TIMESTAMP(3);

-- AlterTable: Site — cached geocode for coverage map
ALTER TABLE "Site" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "geocodedAt" TIMESTAMP(3);
