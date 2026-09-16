-- New staff accounts should not default to "admin". This only changes the
-- column default for future INSERTs -- existing rows keep whatever role they
-- already have, so no live admin is demoted by this migration.
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'viewer';
