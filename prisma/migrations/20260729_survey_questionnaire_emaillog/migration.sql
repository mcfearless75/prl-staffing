-- The public /survey and /supplier-questionnaire forms wrote only an ActivityLog line —
-- responses had no real destination in PRISM. Give them one, plus a log of every
-- outbound email so a provider failure can no longer pass silently.
CREATE TABLE "CustomerSurvey" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "dateOfService" TEXT,
    "overallSatisfaction" INTEGER NOT NULL,
    "qualityOfWorkers" INTEGER,
    "communication" INTEGER,
    "compliance" INTEGER,
    "valueForMoney" INTEGER,
    "recommend" TEXT,
    "whatDidWell" TEXT,
    "whatToImprove" TEXT,
    "otherComments" TEXT,
    "status" TEXT NOT NULL DEFAULT 'New',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerSurvey_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomerSurvey_status_createdAt_idx" ON "CustomerSurvey"("status", "createdAt");

CREATE TABLE "SupplierQuestionnaire" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "tradingName" TEXT,
    "companyRegNo" TEXT,
    "vatNumber" TEXT,
    "registeredAddress" TEXT,
    "mainContactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "website" TEXT,
    "goodsServices" TEXT NOT NULL,
    "numberOfEmployees" TEXT,
    "yearsInBusiness" TEXT,
    "iso9001" TEXT,
    "otherCertifications" TEXT,
    "publicLiability" TEXT,
    "publicLiabilityAmount" TEXT,
    "employersLiability" TEXT,
    "employersLiabilityAmount" TEXT,
    "professionalIndemnity" TEXT,
    "professionalIndemnityAmount" TEXT,
    "healthSafetyPolicy" TEXT,
    "environmentalPolicy" TEXT,
    "equalityPolicy" TEXT,
    "ref1Company" TEXT,
    "ref1Contact" TEXT,
    "ref1Email" TEXT,
    "ref1Phone" TEXT,
    "ref2Company" TEXT,
    "ref2Contact" TEXT,
    "ref2Email" TEXT,
    "ref2Phone" TEXT,
    "additionalInfo" TEXT,
    "declaration" BOOLEAN NOT NULL DEFAULT false,
    "signature" TEXT,
    "submittedDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'New',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierQuestionnaire_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SupplierQuestionnaire_status_createdAt_idx" ON "SupplierQuestionnaire"("status", "createdAt");

CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "template" TEXT,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "providerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailLog_status_createdAt_idx" ON "EmailLog"("status", "createdAt");
