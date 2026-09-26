-- The name a contractor actually goes by ("Bob" for Robert). Optional; emails
-- greet by it when set, otherwise by firstName.
ALTER TABLE "Contractor" ADD COLUMN "knownAs" TEXT;
