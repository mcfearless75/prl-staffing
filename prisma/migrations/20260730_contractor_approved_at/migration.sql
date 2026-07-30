-- welcomeAgent decided who had been "newly approved" by reading Contractor
-- .updatedAt, which Prisma bumps on ANY write to the row. On 2026-07-30 a
-- right-to-work backfill touched 59 records and the agent read that as 59
-- approvals, emailing 12 contractors -- several of them on site for months --
-- to say their application had just been approved. Roughly 375 more Active
-- contractors had never been welcomed, so the next bulk write would have
-- mailed all of them at once.
--
-- There was no way to tell an approval from any other write, because approval
-- was never recorded. This column records it.
--
-- Nullable and additive, so safe on a live database. Deliberately NOT
-- backfilled: null means "not approved through PRISM", which is the honest
-- reading for every pre-existing and imported record, and it keeps the whole
-- historical backlog permanently outside the agent's window rather than
-- inventing approval dates to sit just outside it.
ALTER TABLE "Contractor" ADD COLUMN "approvedAt" TIMESTAMP(3);

-- The agent scans a recent-date window across the whole contractor table.
CREATE INDEX "Contractor_approvedAt_idx" ON "Contractor"("approvedAt");
