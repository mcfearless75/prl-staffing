/**
 * A client site's contact person (Jenni, 2026-10-08): stored on the site so a
 * subcontractor agreement for that site is filled in automatically instead of
 * retyped every time. Pure: the site actions and the agreement prefill use it.
 */

export interface SiteContact {
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
}

const clean = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const s = v.trim().replace(/\s+/g, " ").slice(0, max);
  return s || null;
};

/**
 * The three contact fields from a site form. A malformed email is rejected
 * with a message rather than stored, since it would be copied into agreements.
 */
export function parseSiteContact(get: (field: string) => unknown): { contact: SiteContact } | { error: string } {
  const contactEmail = clean(get("contactEmail"), 254)?.toLowerCase() ?? null;
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return { error: "The site contact email doesn't look right. Check it and try again." };
  }
  return {
    contact: {
      contactName: clean(get("contactName"), 120),
      contactPhone: clean(get("contactPhone"), 40),
      contactEmail,
    },
  };
}

/** The site's address on one line for the agreement: "1 High St, Chorley, PR7 8HG". */
export function siteAddressLine(site: { address?: string | null; city?: string | null; postcode?: string | null }): string {
  return [site.address, site.city, site.postcode?.toUpperCase()]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(", ");
}
