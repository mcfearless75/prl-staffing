-- CreateTable: JobRole
CREATE TABLE "JobRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobRole_name_key" ON "JobRole"("name");

-- CreateTable: ContractorJobRole
CREATE TABLE "ContractorJobRole" (
    "id" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "jobRoleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractorJobRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContractorJobRole_contractorId_jobRoleId_key" ON "ContractorJobRole"("contractorId", "jobRoleId");

-- AddForeignKey
ALTER TABLE "ContractorJobRole" ADD CONSTRAINT "ContractorJobRole_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorJobRole" ADD CONSTRAINT "ContractorJobRole_jobRoleId_fkey" FOREIGN KEY ("jobRoleId") REFERENCES "JobRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed: 39 PRL job roles (explicit deterministic ids — this DB has no gen_random_uuid/pgcrypto
-- and JobRole.id has no DB-side default, ids are normally app-side cuids). ON CONFLICT on the
-- unique "name" column makes this insert idempotent across repeated/re-run deploys.
INSERT INTO "JobRole" ("id", "name", "active", "sortOrder", "createdAt", "updatedAt") VALUES
    ('seed_jobrole_01', '360 Machine Operator', true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_jobrole_02', '360 Machine Supervisor', true, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_jobrole_03', 'Banksperson', true, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_jobrole_04', 'Bookkeeper', true, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_jobrole_05', 'Civils Foreman', true, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_jobrole_06', 'Cladder', true, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_jobrole_07', 'Cleaner', true, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_jobrole_08', 'Electrical Improver', true, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_jobrole_09', 'Electrical Supervisor', true, 9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_jobrole_10', 'Electrician', true, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_jobrole_11', 'Firewatch Operative', true, 11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_jobrole_12', 'Foreman', true, 12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_jobrole_13', 'Gantry Crane Operator', true, 13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_jobrole_14', 'Gantry Supervisor', true, 14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_jobrole_15', 'Groundworker', true, 15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_jobrole_16', 'Groundworks Supervisor', true, 16, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_jobrole_17', 'H&S Advisor', true, 17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_jobrole_18', 'Hoist Driver', true, 18, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_jobrole_19', 'Joiner', true, 19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_jobrole_20', 'Labourer', true, 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_jobrole_21', 'Lift Operator', true, 21, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_jobrole_22', 'MEWP Operator', true, 22, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_jobrole_23', 'Painter', true, 23, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_jobrole_24', 'Pipefitter', true, 24, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_jobrole_25', 'Piping Engineer', true, 25, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_jobrole_26', 'Plater Fabricator', true, 26, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_jobrole_27', 'QAQL Electrician', true, 27, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_jobrole_28', 'Rigger', true, 28, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_jobrole_29', 'Rope Access', true, 29, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_jobrole_30', 'Setting Out Engineer', true, 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_jobrole_31', 'Site Manager', true, 31, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_jobrole_32', 'Site Supervisor', true, 32, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_jobrole_33', 'Slinger/Signaller', true, 33, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_jobrole_34', 'Spider Crane Operator', true, 34, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_jobrole_35', 'Telehandler Driver', true, 35, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_jobrole_36', 'Topman', true, 36, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_jobrole_37', 'Traffic Marshall', true, 37, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_jobrole_38', 'Warehouse Operative', true, 38, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('seed_jobrole_39', 'Welder', true, 39, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;
