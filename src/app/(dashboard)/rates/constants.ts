export const EMPLOYMENT_TYPES = ["CIS", "PAYE", "PSC"] as const;
export const RATE_TYPES = ["Time", "Piece"] as const;
export const RATE_BASES = ["Hourly", "Daily"] as const;

export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];
export type RateType = (typeof RATE_TYPES)[number];
export type RateBasis = (typeof RATE_BASES)[number];

export const RATES_PAGE_SIZE = 30;
