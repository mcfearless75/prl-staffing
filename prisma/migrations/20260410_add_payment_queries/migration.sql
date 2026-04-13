CREATE TABLE IF NOT EXISTS "PaymentQuery" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "operativeName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT,
    "weekEnding" TEXT NOT NULL,
    "queryType" TEXT NOT NULL,
    "totalHoursClaimed" TEXT,
    "totalOvertimeClaimed" TEXT,
    "totalHoursPaid" TEXT,
    "hours" TEXT,
    "explanation" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Open',
    "assignedTo" TEXT,
    "assignedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolutionNotes" TEXT,
    "closedAt" TIMESTAMP(3),
    "closedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PaymentQuery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentQuery_ticketNumber_key" ON "PaymentQuery"("ticketNumber");
