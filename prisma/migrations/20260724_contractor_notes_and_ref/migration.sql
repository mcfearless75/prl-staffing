-- CreateTable: ContractorNote (append-only staff notes thread — NOT the Contractor.notes onboarding JSON blob)
CREATE TABLE "ContractorNote" (
    "id" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "authorId" TEXT,
    "authorName" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorNote_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ContractorNote" ADD CONSTRAINT "ContractorNote_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Contractor — add nullable human-readable reference column
ALTER TABLE "Contractor" ADD COLUMN "ref" TEXT;

-- Backfill: deterministic ref assignment ordered by createdAt then id, e.g. C00001
UPDATE "Contractor" c
SET "ref" = 'C' || LPAD(sub.rn::text, 5, '0')
FROM (
    SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, "id" ASC) AS rn
    FROM "Contractor"
) sub
WHERE c."id" = sub."id";

-- CreateIndex
CREATE UNIQUE INDEX "Contractor_ref_key" ON "Contractor"("ref");
