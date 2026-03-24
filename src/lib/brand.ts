/**
 * White-label brand configuration
 *
 * All branding is driven by environment variables.
 * To set up a new client, just change these in Railway/Vercel:
 *
 * BRAND_NAME          - Company name (default: "PRL Site Solutions")
 * BRAND_TAGLINE       - Tagline under logo (default: "Recruitment Specialists")
 * BRAND_PRODUCT       - Product name (default: "PRISM")
 * BRAND_LOGO_URL      - Path to logo image (default: "/prl_logo.jpg")
 * BRAND_PRIMARY_COLOR - Hex colour without # (default: "2563eb")
 * BRAND_EMAIL         - Contact email (default: "info@prlsitesolutions.co.uk")
 * BRAND_PHONE         - Contact phone (default: "0800 772 3959")
 * BRAND_WEBSITE       - Website URL (default: "prlsitesolutions.co.uk")
 */

export interface BrandConfig {
  name: string;
  tagline: string;
  product: string;
  logoUrl: string;
  primaryColor: string;
  email: string;
  phone: string;
  website: string;
}

// Server-side brand config (reads from process.env)
export function getBrandConfig(): BrandConfig {
  return {
    name: process.env.BRAND_NAME || "PRL Site Solutions",
    tagline: process.env.BRAND_TAGLINE || "Recruitment Specialists",
    product: process.env.BRAND_PRODUCT || "PRISM",
    logoUrl: process.env.BRAND_LOGO_URL || "/prl_logo.jpg",
    primaryColor: process.env.BRAND_PRIMARY_COLOR || "2563eb",
    email: process.env.BRAND_EMAIL || "info@prlsitesolutions.co.uk",
    phone: process.env.BRAND_PHONE || "0800 772 3959",
    website: process.env.BRAND_WEBSITE || "prlsitesolutions.co.uk",
  };
}

// Default config for client components (before server data arrives)
export const defaultBrand: BrandConfig = {
  name: "PRL Site Solutions",
  tagline: "Recruitment Specialists",
  product: "PRISM",
  logoUrl: "/prl_logo.jpg",
  primaryColor: "2563eb",
  email: "info@prlsitesolutions.co.uk",
  phone: "0800 772 3959",
  website: "prlsitesolutions.co.uk",
};
