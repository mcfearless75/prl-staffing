/**
 * Auto-overtime calculation engine
 * Calculates overtime based on configurable thresholds
 */

import { isUKBankHoliday } from "./uk-bank-holidays";

export interface OvertimeConfig {
  standardDailyHours: number;    // Default: 8
  standardWeeklyHours: number;   // Default: 40
  bankHolidayMultiplier: number; // Default: 1.5 (time-and-a-half)
  weekendMultiplier: number;     // Default: 1.5
  overtimeMultiplier: number;    // Default: 1.5
}

export const DEFAULT_OVERTIME_CONFIG: OvertimeConfig = {
  standardDailyHours: 8,
  standardWeeklyHours: 40,
  bankHolidayMultiplier: 1.5,
  weekendMultiplier: 1.5,
  overtimeMultiplier: 1.5,
};

export interface DayEntry {
  dayOfWeek: number; // 0=Mon ... 6=Sun
  hours: number;
  date: Date;
}

export interface OvertimeResult {
  totalRegularHours: number;
  totalOvertimeHours: number;
  dailyBreakdown: DayBreakdown[];
  weeklyOvertimeHours: number;
  bankHolidayHours: number;
  weekendHours: number;
  exceptions: string[];
}

export interface DayBreakdown {
  dayOfWeek: number;
  regularHours: number;
  overtimeHours: number;
  isBankHoliday: boolean;
  isWeekend: boolean;
  bankHolidayName?: string;
  reason?: string;
}

/**
 * Calculate overtime for a week of timesheet entries
 * @param entries - Array of day entries with hours
 * @param weekStarting - The Monday of the week
 * @param config - Overtime configuration
 */
export function calculateOvertime(
  entries: DayEntry[],
  weekStarting: Date,
  config: OvertimeConfig = DEFAULT_OVERTIME_CONFIG
): OvertimeResult {
  const breakdown: DayBreakdown[] = [];
  let totalRegularHours = 0;
  let totalOvertimeHours = 0;
  let bankHolidayHours = 0;
  let weekendHours = 0;
  const exceptions: string[] = [];

  // Process each day
  for (const entry of entries) {
    const entryDate = new Date(weekStarting);
    entryDate.setDate(entryDate.getDate() + entry.dayOfWeek);

    const isWeekend = entry.dayOfWeek >= 5; // Sat=5, Sun=6
    const isBankHoliday = isUKBankHoliday(entryDate);

    let regularHours = 0;
    let overtimeHours = 0;
    let reason: string | undefined;

    if (isBankHoliday) {
      // All bank holiday hours are treated as overtime/premium
      overtimeHours = entry.hours;
      bankHolidayHours += entry.hours;
      reason = "Bank holiday premium";
    } else if (isWeekend) {
      // All weekend hours are overtime
      overtimeHours = entry.hours;
      weekendHours += entry.hours;
      reason = "Weekend premium";
    } else {
      // Regular weekday - split at daily threshold
      if (entry.hours > config.standardDailyHours) {
        regularHours = config.standardDailyHours;
        overtimeHours = entry.hours - config.standardDailyHours;
        reason = `Exceeded ${config.standardDailyHours}h daily limit`;
      } else {
        regularHours = entry.hours;
      }
    }

    totalRegularHours += regularHours;
    totalOvertimeHours += overtimeHours;

    breakdown.push({
      dayOfWeek: entry.dayOfWeek,
      regularHours,
      overtimeHours,
      isBankHoliday,
      isWeekend,
      reason,
    });
  }

  // Check weekly overtime (total regular hours exceeding weekly limit)
  let weeklyOvertimeHours = 0;
  if (totalRegularHours > config.standardWeeklyHours) {
    weeklyOvertimeHours = totalRegularHours - config.standardWeeklyHours;
    totalOvertimeHours += weeklyOvertimeHours;
    totalRegularHours = config.standardWeeklyHours;
    exceptions.push(
      `Weekly hours (${totalRegularHours + weeklyOvertimeHours}h) exceed ${config.standardWeeklyHours}h standard`
    );
  }

  // Flag exceptions
  const totalHours = totalRegularHours + totalOvertimeHours;
  if (totalHours > 60) {
    exceptions.push(`Excessive hours: ${totalHours}h in one week`);
  }
  if (totalHours === 0) {
    exceptions.push("Zero hours submitted");
  }
  if (bankHolidayHours > 0) {
    exceptions.push(`${bankHolidayHours}h worked on bank holiday`);
  }

  return {
    totalRegularHours,
    totalOvertimeHours,
    dailyBreakdown: breakdown,
    weeklyOvertimeHours,
    bankHolidayHours,
    weekendHours,
    exceptions,
  };
}

/**
 * Determine if a timesheet should be auto-approved or flagged as exception
 */
export function shouldAutoApprove(
  totalHours: number,
  overtimeHours: number,
  exceptions: string[],
  config: OvertimeConfig = DEFAULT_OVERTIME_CONFIG
): { autoApprove: boolean; reason: string } {
  // Never auto-approve if there are exceptions
  if (exceptions.length > 0) {
    return {
      autoApprove: false,
      reason: `Flagged: ${exceptions.join("; ")}`,
    };
  }

  // Auto-approve if within standard hours and no overtime
  if (totalHours <= config.standardWeeklyHours && overtimeHours === 0) {
    return {
      autoApprove: true,
      reason: `Standard week: ${totalHours}h within ${config.standardWeeklyHours}h limit`,
    };
  }

  // Small overtime (up to 2h) can be auto-approved
  if (overtimeHours <= 2 && totalHours <= config.standardWeeklyHours + 2) {
    return {
      autoApprove: true,
      reason: `Minor overtime: ${overtimeHours}h within tolerance`,
    };
  }

  return {
    autoApprove: false,
    reason: `Overtime of ${overtimeHours}h requires manual approval`,
  };
}
