-- On/off switch per scheduled workflow (Paul, 2026-10-02: "clicking a button
-- or switch to turn auto on and off"). No row means off, so the compliance
-- chase stays paused until someone switches it on from /workflows.
CREATE TABLE "WorkflowSetting" (
    "workflow" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowSetting_pkey" PRIMARY KEY ("workflow")
);
