-- New job role requested by PRL (2026-09-30). sortOrder 18 ties with
-- 'Hoist Driver', so the name tiebreak lists it between that and 'Joiner'.
-- ON CONFLICT: a no-op if the office already added it on /job-roles.
INSERT INTO "JobRole" ("id", "name", "active", "sortOrder", "createdAt", "updatedAt")
VALUES ('seed_jobrole_it_commissioning', 'IT Commissioning', true, 18, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;
