/**
 * UK Bank Holiday detection for England & Wales
 * Used for overtime/holiday premium calculations
 */

// Calculate Easter Sunday using the Anonymous Gregorian algorithm
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Get the substitute day if bank holiday falls on weekend
function substituteDay(date: Date): Date {
  const day = date.getDay();
  if (day === 0) return addDays(date, 1); // Sunday -> Monday
  if (day === 6) return addDays(date, 2); // Saturday -> Monday
  return date;
}

/**
 * Returns all UK bank holidays (England & Wales) for a given year
 */
export function getUKBankHolidays(year: number): Date[] {
  const easter = easterSunday(year);

  const holidays: Date[] = [
    // New Year's Day
    substituteDay(new Date(year, 0, 1)),
    // Good Friday (Easter - 2 days)
    addDays(easter, -2),
    // Easter Monday (Easter + 1 day)
    addDays(easter, 1),
    // Early May Bank Holiday (first Monday in May)
    getFirstMondayInMonth(year, 4),
    // Spring Bank Holiday (last Monday in May)
    getLastMondayInMonth(year, 4),
    // Summer Bank Holiday (last Monday in August)
    getLastMondayInMonth(year, 7),
    // Christmas Day
    getChristmasSubstitute(year),
    // Boxing Day
    getBoxingDaySubstitute(year),
  ];

  return holidays;
}

function getFirstMondayInMonth(year: number, month: number): Date {
  const date = new Date(year, month, 1);
  while (date.getDay() !== 1) {
    date.setDate(date.getDate() + 1);
  }
  return date;
}

function getLastMondayInMonth(year: number, month: number): Date {
  const date = new Date(year, month + 1, 0); // Last day of month
  while (date.getDay() !== 1) {
    date.setDate(date.getDate() - 1);
  }
  return date;
}

/**
 * Christmas Day, moved to the next working day that Boxing Day has not taken.
 *
 * The plain substituteDay rule is wrong here. When Christmas falls on a SUNDAY,
 * Boxing Day (Monday the 26th) is already a bank holiday in its own right, so
 * the Christmas substitute goes to TUESDAY the 27th — it cannot share the 26th.
 * Using substituteDay collapsed both onto the 26th and left the 27th undetected,
 * so anyone working 27 December in such a year was paid no bank-holiday premium.
 * Next occurrence 2033; last was 2022.
 */
function getChristmasSubstitute(year: number): Date {
  const christmasDay = new Date(year, 11, 25).getDay();
  // Sunday: Boxing Day holds the Monday, so Christmas moves to Tuesday 27th.
  if (christmasDay === 0) return new Date(year, 11, 27);
  // Saturday: Monday 27th is free — Boxing Day goes on to Tuesday 28th.
  if (christmasDay === 6) return new Date(year, 11, 27);
  return new Date(year, 11, 25);
}

function getBoxingDaySubstitute(year: number): Date {
  const christmas = new Date(year, 11, 25);
  const boxing = new Date(year, 11, 26);
  const christmasDay = christmas.getDay();

  // If Christmas is Friday, Boxing Day (Sat) moves to Monday
  if (christmasDay === 5) return new Date(year, 11, 28);
  // If Christmas is Saturday, Boxing Day (Sun) moves to Tuesday (Monday is Christmas sub)
  if (christmasDay === 6) return new Date(year, 11, 28);
  // If Christmas is Sunday, Boxing Day (Mon) stays, Christmas moves to Tuesday
  if (christmasDay === 0) return boxing;
  // Normal substitute
  return substituteDay(boxing);
}

/**
 * Check if a specific date is a UK bank holiday
 */
export function isUKBankHoliday(date: Date): boolean {
  const holidays = getUKBankHolidays(date.getFullYear());
  return holidays.some(
    (h) =>
      h.getFullYear() === date.getFullYear() &&
      h.getMonth() === date.getMonth() &&
      h.getDate() === date.getDate()
  );
}

/**
 * Get the name of the bank holiday for a given date (or null)
 */
export function getBankHolidayName(date: Date): string | null {
  const year = date.getFullYear();
  const easter = easterSunday(year);
  const holidays: [Date, string][] = [
    [substituteDay(new Date(year, 0, 1)), "New Year's Day"],
    [addDays(easter, -2), "Good Friday"],
    [addDays(easter, 1), "Easter Monday"],
    [getFirstMondayInMonth(year, 4), "Early May Bank Holiday"],
    [getLastMondayInMonth(year, 4), "Spring Bank Holiday"],
    [getLastMondayInMonth(year, 7), "Summer Bank Holiday"],
    [getChristmasSubstitute(year), "Christmas Day"],
    [getBoxingDaySubstitute(year), "Boxing Day"],
  ];

  for (const [h, name] of holidays) {
    if (
      h.getFullYear() === date.getFullYear() &&
      h.getMonth() === date.getMonth() &&
      h.getDate() === date.getDate()
    ) {
      return name;
    }
  }
  return null;
}

/**
 * For a given week starting date (Monday), return which days are bank holidays
 * Returns array of { dayOfWeek: 0-6, name: string }
 */
export function getBankHolidaysInWeek(
  weekStarting: Date
): { dayOfWeek: number; name: string }[] {
  const result: { dayOfWeek: number; name: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStarting, i);
    const name = getBankHolidayName(day);
    if (name) {
      result.push({ dayOfWeek: i, name });
    }
  }
  return result;
}
