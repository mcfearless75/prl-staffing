-- Add magic-link token to AuditorUser
ALTER TABLE "AuditorUser" ADD COLUMN "loginToken" TEXT;
CREATE UNIQUE INDEX "AuditorUser_loginToken_key" ON "AuditorUser"("loginToken");
