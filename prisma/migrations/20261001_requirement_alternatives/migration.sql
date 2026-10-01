-- "Any one of these will do" requirements (Jenni, 2026-10-01: "it could be
-- either NPORS or CSCS"). The requirement is met by `type` OR any type listed
-- here — see src/lib/requirement-match.ts. Empty for every existing row.
ALTER TABLE "ComplianceRequirement" ADD COLUMN "alternatives" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
