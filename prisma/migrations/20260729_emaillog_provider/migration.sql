-- Records which transport sent each email, so the Resend -> Microsoft 365 Graph
-- switchover is visible in the log rather than having to be inferred.
ALTER TABLE "EmailLog" ADD COLUMN "provider" TEXT;
