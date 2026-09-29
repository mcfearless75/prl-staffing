-- Session monitor (/sessions, infotech@ only): one row per continuous period
-- of use, fed by a client heartbeat and closed on sign-out.
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "userType" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "method" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserSession_tokenId_idx" ON "UserSession"("tokenId");
CREATE INDEX "UserSession_lastSeenAt_idx" ON "UserSession"("lastSeenAt");
CREATE INDEX "UserSession_email_idx" ON "UserSession"("email");
