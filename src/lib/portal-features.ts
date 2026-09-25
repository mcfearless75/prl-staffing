/**
 * Worker-portal features that exist in code but are switched off for now.
 *
 * PRL runs timesheets through the site contact, not the app: in the 60 days to
 * 25/09/2026 the portal saw 6 timesheets (5 abandoned drafts), no expense
 * claims and no holiday requests. They are a future feature, so they are
 * HIDDEN, not deleted: flip a flag here to bring one back.
 *
 * While a flag is off: its bottom-bar tab and home-screen tiles are hidden,
 * its pages redirect to /portal, and nothing emails workers towards it.
 */
export const PORTAL_FEATURES = {
  timesheets: false,
  expenses: false,
  holiday: false,
} as const;

export type PortalFeature = keyof typeof PORTAL_FEATURES;

export function portalFeatureEnabled(feature: PortalFeature): boolean {
  return PORTAL_FEATURES[feature];
}
