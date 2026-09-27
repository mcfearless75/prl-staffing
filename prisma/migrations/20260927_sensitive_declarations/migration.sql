-- Health, drugs & alcohol and criminal-record answers. Encrypted payload only;
-- see prisma/schema.prisma SensitiveDeclaration.
CREATE TABLE "SensitiveDeclaration" (
    "id" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "declaredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SensitiveDeclaration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SensitiveDeclaration_contractorId_key" ON "SensitiveDeclaration"("contractorId");

ALTER TABLE "SensitiveDeclaration" ADD CONSTRAINT "SensitiveDeclaration_contractorId_fkey"
    FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Audit of views and erasures; no FK so it outlives the rows it describes.
CREATE TABLE "SensitiveAccessLog" (
    "id" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SensitiveAccessLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SensitiveAccessLog_contractorId_idx" ON "SensitiveAccessLog"("contractorId");
