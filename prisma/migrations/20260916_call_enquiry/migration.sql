-- Stores overflow/after-hours call enquiries captured by the Retell AI voice
-- agent behind the 0800 number's Tamar phonedivert hunt groups. Written by
-- POST /api/calls/retell-webhook once Retell's post-call analysis completes.
CREATE TABLE "CallEnquiry" (
    "id" TEXT NOT NULL,
    "retellCallId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "callerName" TEXT,
    "callerPhone" TEXT,
    "contractorIdHint" TEXT,
    "reason" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "transcript" TEXT NOT NULL,
    "urgent" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'New',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actionedBy" TEXT,
    "actionedAt" TIMESTAMP(3),

    CONSTRAINT "CallEnquiry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CallEnquiry_retellCallId_key" ON "CallEnquiry"("retellCallId");

CREATE INDEX "CallEnquiry_status_receivedAt_idx" ON "CallEnquiry"("status", "receivedAt");

CREATE INDEX "CallEnquiry_category_idx" ON "CallEnquiry"("category");
