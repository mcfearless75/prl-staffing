-- Why staff sent a whole week back.
--
-- TimesheetEntry and Expense already carried a rejectionReason; Timesheet did
-- not, so "your timesheet was rejected" could never say why. Nullable and
-- additive: weeks rejected before this existed keep NULL, and the contractor
-- notification renders an honest placeholder rather than an empty reason.
ALTER TABLE "Timesheet" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
