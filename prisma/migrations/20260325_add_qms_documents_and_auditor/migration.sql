-- CreateTable
CREATE TABLE "QmsDocument" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "folder" TEXT NOT NULL,
    "subfolder" TEXT,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "r2Key" TEXT,
    "uploadedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QmsDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditorUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "organisation" TEXT NOT NULL DEFAULT 'Nutral',
    "logoUrl" TEXT DEFAULT '/nutral-logo.svg',
    "role" TEXT NOT NULL DEFAULT 'auditor',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditorUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuditorUser_email_key" ON "AuditorUser"("email");
