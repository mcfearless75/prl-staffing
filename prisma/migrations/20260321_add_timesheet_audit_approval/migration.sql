-- AlterTable: Add exception fields to Timesheet
ALTER TABLE "Timesheet" ADD COLUMN "isException" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Timesheet" ADD COLUMN "exceptionReason" TEXT;

-- CreateTable: TimesheetAuditLog
CREATE TABLE "TimesheetAuditLog" (
    "id" TEXT NOT NULL,
    "timesheetId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "field" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "userId" TEXT,
    "userName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimesheetAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ApprovalChain
CREATE TABLE "ApprovalChain" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ApprovalChain_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ApprovalStep
CREATE TABLE "ApprovalStep" (
    "id" TEXT NOT NULL,
    "approvalChainId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "approverRole" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApprovalStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TimesheetApproval
CREATE TABLE "TimesheetApproval" (
    "id" TEXT NOT NULL,
    "timesheetId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "stepLabel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "approvedBy" TEXT,
    "approverName" TEXT,
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimesheetApproval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: ApprovalChain unique per company
CREATE UNIQUE INDEX "ApprovalChain_companyId_key" ON "ApprovalChain"("companyId");

-- AddForeignKey
ALTER TABLE "TimesheetAuditLog" ADD CONSTRAINT "TimesheetAuditLog_timesheetId_fkey" FOREIGN KEY ("timesheetId") REFERENCES "Timesheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ApprovalChain" ADD CONSTRAINT "ApprovalChain_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_approvalChainId_fkey" FOREIGN KEY ("approvalChainId") REFERENCES "ApprovalChain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TimesheetApproval" ADD CONSTRAINT "TimesheetApproval_timesheetId_fkey" FOREIGN KEY ("timesheetId") REFERENCES "Timesheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
