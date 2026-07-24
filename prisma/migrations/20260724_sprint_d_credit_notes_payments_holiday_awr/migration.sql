-- AlterTable: Contractor — employment type (PAYE, CIS, PSC)
ALTER TABLE "Contractor" ADD COLUMN     "employmentType" TEXT;

-- AlterTable: Assignment — AWR comparator fields
ALTER TABLE "Assignment" ADD COLUMN     "comparatorRate" DOUBLE PRECISION,
ADD COLUMN     "awrExempt" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "awrStartDate" TIMESTAMP(3);

-- AlterTable: TimesheetEntry — absence reason (supports new "Absent" status value)
ALTER TABLE "TimesheetEntry" ADD COLUMN     "absenceReason" TEXT;

-- CreateTable: CreditNote
CREATE TABLE "CreditNote" (
    "id" TEXT NOT NULL,
    "creditNoteNumber" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "assignmentId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "vatAmount" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "processedAt" TIMESTAMP(3),
    "processedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreditNote_creditNoteNumber_key" ON "CreditNote"("creditNoteNumber");

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: InvoicePayment
CREATE TABLE "InvoicePayment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "receivedDate" TIMESTAMP(3) NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'BACS',
    "reference" TEXT,
    "importBatch" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoicePayment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "InvoicePayment" ADD CONSTRAINT "InvoicePayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: HolidayLedger
CREATE TABLE "HolidayLedger" (
    "id" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "timesheetId" TEXT,
    "type" TEXT NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION,
    "weekStarting" TIMESTAMP(3),
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HolidayLedger_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "HolidayLedger" ADD CONSTRAINT "HolidayLedger_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: HolidayRequest
CREATE TABLE "HolidayRequest" (
    "id" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "hoursRequested" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HolidayRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "HolidayRequest" ADD CONSTRAINT "HolidayRequest_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: ChaseLog
CREATE TABLE "ChaseLog" (
    "id" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "weekStarting" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentBy" TEXT,

    CONSTRAINT "ChaseLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ChaseLog" ADD CONSTRAINT "ChaseLog_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
