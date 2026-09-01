-- The compliance-chase agent auto-emails contractors directly, with no way to
-- tell a "sent" API acceptance from an actual delivery -- Graph and Resend
-- both just accept the send request; a hard bounce comes back later as a DSN
-- dropped into the infotech@ mailbox, invisible to PRISM. bounce-check now
-- reads that mailbox and flags the contractor here on a permanent (5xx)
-- bounce, so it shows up in the UI instead of only in someone's Outlook.
--
-- Nullable/defaulted and additive, safe on a live database. Not
-- auto-cleared -- fixing the address is a deliberate edit on the contractor
-- form, which is also where the flag should be cleared.
ALTER TABLE "Contractor" ADD COLUMN "emailBounced" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Contractor" ADD COLUMN "emailBouncedAt" TIMESTAMP(3);
ALTER TABLE "Contractor" ADD COLUMN "emailBounceReason" TEXT;
