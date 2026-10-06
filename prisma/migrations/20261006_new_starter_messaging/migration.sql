-- AlterTable
ALTER TABLE "User" ADD COLUMN     "jobTitle" TEXT,
ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "Contractor" ADD COLUMN     "waiverDecision" TEXT,
ADD COLUMN     "waiverSignature" TEXT,
ADD COLUMN     "waiverSignedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SupplyAgreement" ADD COLUMN     "contractorId" TEXT,
ADD COLUMN     "signToken" TEXT,
ADD COLUMN     "signedAt" TIMESTAMP(3),
ADD COLUMN     "signedIp" TEXT,
ADD COLUMN     "signedName" TEXT;

-- CreateTable
CREATE TABLE "ContractorReference" (
    "id" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "companyName" TEXT,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "jobRole" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorMessage" (
    "id" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "senderUserId" TEXT,
    "senderName" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractorMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewStarterPlacement" (
    "id" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "siteId" TEXT,
    "role" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "payRate" DOUBLE PRECISION,
    "chargeRate" DOUBLE PRECISION,
    "rateBasis" TEXT,
    "inductionRequired" BOOLEAN NOT NULL DEFAULT true,
    "inductionDoneAt" TIMESTAMP(3),
    "inductionSkipped" BOOLEAN NOT NULL DEFAULT false,
    "supplyAgreementId" TEXT,
    "assignmentId" TEXT,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewStarterPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContractorReference_contractorId_idx" ON "ContractorReference"("contractorId");

-- CreateIndex
CREATE INDEX "ContractorMessage_contractorId_createdAt_idx" ON "ContractorMessage"("contractorId", "createdAt");

-- CreateIndex
CREATE INDEX "ContractorMessage_direction_readAt_idx" ON "ContractorMessage"("direction", "readAt");

-- CreateIndex
CREATE INDEX "NewStarterPlacement_contractorId_idx" ON "NewStarterPlacement"("contractorId");

-- CreateIndex
CREATE INDEX "NewStarterPlacement_completedAt_cancelledAt_idx" ON "NewStarterPlacement"("completedAt", "cancelledAt");

-- CreateIndex
CREATE UNIQUE INDEX "SupplyAgreement_signToken_key" ON "SupplyAgreement"("signToken");

-- AddForeignKey
ALTER TABLE "ContractorReference" ADD CONSTRAINT "ContractorReference_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorMessage" ADD CONSTRAINT "ContractorMessage_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewStarterPlacement" ADD CONSTRAINT "NewStarterPlacement_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewStarterPlacement" ADD CONSTRAINT "NewStarterPlacement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewStarterPlacement" ADD CONSTRAINT "NewStarterPlacement_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

