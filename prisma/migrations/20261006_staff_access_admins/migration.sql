-- Staff access (2026-10-06, Paul): Paul (infotech@), Adella and Jenni are the
-- admins who approve new staff on /settings/staff. Data only; no schema change.
-- Nobody is demoted here — other admins can be changed on that page.
UPDATE "User" SET "role" = 'admin'
WHERE lower("email") IN (
  'infotech@prlsitesolutions.co.uk',
  'adella@prlsitesolutions.co.uk',
  'jenni@prlsitesolutions.co.uk'
);
