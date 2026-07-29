-- Public /new-starter form previously wrote only an ActivityLog line — submissions
-- had no real destination in PRISM. Give them one.
CREATE TABLE "NewStarterSubmission" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "gender" TEXT,
    "dob" TEXT,
    "country" TEXT,
    "address" TEXT,
    "city" TEXT,
    "postcode" TEXT,
    "niNumber" TEXT,
    "employmentStartDate" TEXT NOT NULL,
    "employeeStatement" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewStarterSubmission_pkey" PRIMARY KEY ("id")
);
