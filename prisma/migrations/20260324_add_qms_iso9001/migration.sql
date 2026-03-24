-- QMS: Non-Conformance / CAPA
CREATE TABLE "NonConformance" (
    "id" TEXT NOT NULL,
    "ncrNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'Minor',
    "source" TEXT NOT NULL,
    "raisedBy" TEXT NOT NULL,
    "raisedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedTo" TEXT,
    "rootCause" TEXT,
    "correctiveAction" TEXT,
    "preventiveAction" TEXT,
    "evidenceOfClosure" TEXT,
    "targetDate" TIMESTAMP(3),
    "closedDate" TIMESTAMP(3),
    "closedBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Open',
    "verifiedBy" TEXT,
    "verifiedDate" TIMESTAMP(3),
    "effectivenessReview" TEXT,
    "effectivenessDate" TIMESTAMP(3),
    "filePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NonConformance_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NonConformance_ncrNumber_key" ON "NonConformance"("ncrNumber");

-- QMS: Internal Audits
CREATE TABLE "InternalAudit" (
    "id" TEXT NOT NULL,
    "auditNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scope" TEXT,
    "auditDate" TIMESTAMP(3) NOT NULL,
    "leadAuditor" TEXT NOT NULL,
    "auditTeam" TEXT,
    "isoClause" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Planned',
    "overallResult" TEXT,
    "summary" TEXT,
    "completedDate" TIMESTAMP(3),
    "nextAuditDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InternalAudit_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InternalAudit_auditNumber_key" ON "InternalAudit"("auditNumber");

CREATE TABLE "AuditFinding" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "findingNumber" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "isoClause" TEXT,
    "description" TEXT NOT NULL,
    "evidence" TEXT,
    "correctiveAction" TEXT,
    "assignedTo" TEXT,
    "targetDate" TIMESTAMP(3),
    "closedDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AuditFinding_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "AuditFinding" ADD CONSTRAINT "AuditFinding_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "InternalAudit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- QMS: Management Reviews
CREATE TABLE "ManagementReview" (
    "id" TEXT NOT NULL,
    "reviewNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reviewDate" TIMESTAMP(3) NOT NULL,
    "chairperson" TEXT NOT NULL,
    "attendees" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Scheduled',
    "kpiSummary" TEXT,
    "ncrSummary" TEXT,
    "auditSummary" TEXT,
    "riskSummary" TEXT,
    "minutes" TEXT,
    "decisions" TEXT,
    "actions" TEXT,
    "resourceNeeds" TEXT,
    "improvements" TEXT,
    "nextReviewDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ManagementReview_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ManagementReview_reviewNumber_key" ON "ManagementReview"("reviewNumber");

-- QMS: Risk Register
CREATE TABLE "Risk" (
    "id" TEXT NOT NULL,
    "riskNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "likelihood" INTEGER NOT NULL DEFAULT 3,
    "impact" INTEGER NOT NULL DEFAULT 3,
    "riskScore" INTEGER NOT NULL DEFAULT 9,
    "riskLevel" TEXT NOT NULL DEFAULT 'Medium',
    "owner" TEXT NOT NULL,
    "existingControls" TEXT,
    "additionalActions" TEXT,
    "targetDate" TIMESTAMP(3),
    "reviewDate" TIMESTAMP(3),
    "lastReviewedBy" TEXT,
    "lastReviewedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'Active',
    "residualLikelihood" INTEGER,
    "residualImpact" INTEGER,
    "residualScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Risk_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Risk_riskNumber_key" ON "Risk"("riskNumber");

-- QMS: Quality Policy Acknowledgement
CREATE TABLE "PolicyAcknowledgement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL DEFAULT '1.0',
    "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PolicyAcknowledgement_pkey" PRIMARY KEY ("id")
);

-- QMS: Continual Improvement Log
CREATE TABLE "ImprovementItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "submittedBy" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "category" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'Medium',
    "assignedTo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Proposed',
    "outcome" TEXT,
    "completedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ImprovementItem_pkey" PRIMARY KEY ("id")
);
