/**
 * Vacation Balance Utilities
 * 
 * Calculates vacation entitlement based on Honduras labor law:
 * Entitlement is determined by completed full years of service:
 * - 10 days after completion of 1st year (working in year 2, haven't completed year 2 yet)
 * - 12 days after completion of 2nd year (working in year 3, haven't completed year 3 yet)
 * - 15 days after completion of 3rd year (working in year 4, haven't completed year 4 yet)
 * - 20 days after completion of 4th year (working in year 5+)
 * 
 * Example: 1 year, 10 months, 22 days → entitlement = 10 days (has not completed 2 full years)
 * 
 * Benefits start after 90-day trial period
 * Vacation days reset on employee anniversary
 */

/**
 * Normalize start date: if it's Feb 29, convert to Feb 28 for calculations
 * This ensures calculations work correctly while preserving the original date for display
 * Handles both Date objects and date strings in YYYY-MM-DD format
 */
function normalizeStartDateForCalculations(date: Date | string): Date {
  let d: Date;
  let originalYear: number;
  let originalMonth: number;
  let originalDay: number;
  
  if (typeof date === 'string') {
    // Parse string date (YYYY-MM-DD format)
    const parts = date.split('-').map(Number);
    originalYear = parts[0];
    originalMonth = parts[1]; // 1-12 format
    originalDay = parts[2];
    
    // Check the original string first - if it was Feb 29, normalize to Feb 28
    if (originalMonth === 2 && originalDay === 29) {
      return new Date(originalYear, 1, 28); // month is 0-indexed, so 1 = February
    }
    
    d = new Date(originalYear, originalMonth - 1, originalDay);
  } else {
    d = date;
    originalYear = d.getFullYear();
    originalMonth = d.getMonth() + 1; // Convert to 1-12 format
    originalDay = d.getDate();
  }
  
  // Double-check: if it's February 29th, normalize to February 28th
  // This handles both Date objects and edge cases
  if (originalMonth === 2 && originalDay === 29) {
    return new Date(originalYear, 1, 28); // month is 0-indexed, so 1 = February
  }
  
  // Also check the Date object's actual values (handles timezone issues)
  const month = d.getMonth();
  const day = d.getDate();
  if (month === 1 && day === 29) {
    const year = d.getFullYear();
    return new Date(year, 1, 28);
  }
  
  return d;
}

/**
 * Calculate vacation days entitlement based on completed years of service (Honduras law)
 * Entitlement is based on completed full years, not current year being worked.
 * 
 * @param startDate - Employee start date
 * @param currentDate - Current date (defaults to today)
 * @returns Number of vacation days entitled for the current year
 */
export function calculateVacationEntitlement(
  startDate: Date | string | null,
  currentDate: Date | string = new Date()
): number {
  if (!startDate) {
    return 0; // No start date = no vacation entitlement
  }

  // Normalize start date: Feb 29 → Feb 28 for calculations
  const start = normalizeStartDateForCalculations(startDate);
  const current = typeof currentDate === 'string' ? new Date(currentDate) : currentDate;

  // Check if employee has completed 90-day trial period
  const daysSinceStart = Math.floor(
    (current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (daysSinceStart < 90) {
    return 0; // Still in trial period
  }

  // Calculate completed full years of service
  // This represents how many full years have been completed
  const startYear = start.getFullYear();
  const currentYear = current.getFullYear();
  const startMonth = start.getMonth();
  const currentMonth = current.getMonth();
  const startDay = start.getDate();
  const currentDay = current.getDate();

  // Calculate completed full years
  let completedYears = currentYear - startYear;

  // If anniversary hasn't occurred this year yet, subtract one
  // (they haven't completed that year yet)
  if (
    currentMonth < startMonth ||
    (currentMonth === startMonth && currentDay < startDay)
  ) {
    completedYears--;
  }

  // Ensure at least 0 years
  completedYears = Math.max(0, completedYears);
  
  // Apply vacation law based on the CURRENT cycle being worked:
  // Cycle 1 (0–<1 year, after 90 days): 10 days
  // Cycle 2 (1–<2 years): 12 days
  // Cycle 3 (2–<3 years): 15 days
  // Cycle 4+ (3+ years): 20 days
  const cycle = completedYears + 1;
  
  if (cycle <= 1) {
    return 10;
  } else if (cycle === 2) {
    return 12;
  } else if (cycle === 3) {
    return 15;
  } else {
    return 20;
  }
}

/**
 * Calculate cumulative/stacked vacation entitlement across all completed years
 * This sums up all vacation days earned through each completed year
 * 
 * Example: 3 years 113 days → 10 + 12 + 15 = 37 days total
 * 
 * @param startDate - Employee start date
 * @param currentDate - Current date (defaults to today)
 * @returns Cumulative total of all vacation days earned
 */
export function calculateCumulativeVacationEntitlement(
  startDate: Date | string | null,
  currentDate: Date | string = new Date()
): number {
  if (!startDate) {
    return 0;
  }

  // Normalize start date: Feb 29 → Feb 28 for calculations
  const start = normalizeStartDateForCalculations(startDate);
  const current = typeof currentDate === 'string' ? new Date(currentDate) : currentDate;

  // Debug: Log normalization for Feb 29 cases
  const originalStartStr = typeof startDate === 'string' ? startDate : startDate.toISOString().split('T')[0];
  const normalizedStartStr = start.toISOString().split('T')[0];
  const currentStr = current.toISOString().split('T')[0];
  
  if (originalStartStr.includes('02-29') || originalStartStr.includes('02-28') || currentStr.includes('2026-01-10')) {
    console.log('DEBUG calculateCumulativeVacationEntitlement:', {
      originalStart: originalStartStr,
      normalizedStart: normalizedStartStr,
      currentDate: currentStr,
    });
  }
  
  // Check if employee has completed 90-day trial period
  const daysSinceStart = Math.floor(
    (current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (daysSinceStart < 90) {
    return 0; // Still in trial period
  }

  // Calculate completed full years of service
  // Make sure we're using the normalized start date for all comparisons
  const startYear = start.getFullYear();
  const currentYear = current.getFullYear();
  const startMonth = start.getMonth();
  const currentMonth = current.getMonth();
  const startDay = start.getDate();
  const currentDay = current.getDate();

  let completedYears = currentYear - startYear;

  // If the current date is before the anniversary in the current year, they haven't completed that year yet
  if (
    currentMonth < startMonth ||
    (currentMonth === startMonth && currentDay < startDay)
  ) {
    completedYears--;
  }

  completedYears = Math.max(0, completedYears);
  
  // Debug: Log calculation details for Feb 29 cases
  if (originalStartStr.includes('02-29') || originalStartStr.includes('02-28') || currentStr.includes('2026-01-10')) {
    console.log('DEBUG calculateCumulativeVacationEntitlement calculation:', {
      daysSinceStart,
      startYear,
      currentYear,
      startMonth,
      currentMonth,
      startDay,
      currentDay,
      completedYears,
      willReturn: completedYears === 0 ? 0 : completedYears === 1 ? 10 : completedYears === 2 ? 22 : completedYears === 3 ? 37 : 10 + 12 + 15 + (20 * (completedYears - 3)),
    });
  }

  // Calculate cumulative total by summing entitlements for each completed year
  // After completion of 1st year: 10 days
  // After completion of 2nd year: 12 days
  // After completion of 3rd year: 15 days
  // After completion of 4th year and above: 20 days each
  
  let cumulativeTotal = 0;
  
  if (completedYears === 0) {
    // No completed years yet: 0 days (vacation days only accumulate after completing a year)
    cumulativeTotal = 0;
  } else if (completedYears === 1) {
    // Completed 1 year: 10 days
    cumulativeTotal = 10;
  } else if (completedYears === 2) {
    // Completed 2 years: 10 + 12 = 22 days
    cumulativeTotal = 10 + 12;
  } else if (completedYears === 3) {
    // Completed 3 years: 10 + 12 + 15 = 37 days
    cumulativeTotal = 10 + 12 + 15;
  } else {
    // Completed 4+ years: 10 + 12 + 15 + 20*(completedYears - 3)
    cumulativeTotal = 10 + 12 + 15 + (20 * (completedYears - 3));
  }

  return cumulativeTotal;
}

/**
 * Calculate number of business days between two dates (excluding weekends and holidays)
 * @param startDate - Start date
 * @param endDate - End date
 * @param holidays - Array of holiday dates (defaults to Honduras holidays)
 * @returns Number of business days
 */
export function calculateBusinessDays(
  startDate: Date | string,
  endDate: Date | string,
  holidays: Date[] = []
): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  // Ensure start is before end
  if (start > end) {
    return 0;
  }

  // If no holidays provided, use Honduras holidays
  const hondurasHolidays = holidays.length > 0 ? holidays : getHondurasHolidaysForYear(end.getFullYear());

  let days = 0;
  const current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    
    // Skip weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      current.setDate(current.getDate() + 1);
      continue;
    }

    // Check if current day is a holiday
    const isHoliday = hondurasHolidays.some(holiday => {
      return (
        holiday.getDate() === current.getDate() &&
        holiday.getMonth() === current.getMonth() &&
        holiday.getFullYear() === current.getFullYear()
      );
    });

    // Count only business days (Monday-Friday) that are not holidays
    if (!isHoliday) {
      days++;
    }

    current.setDate(current.getDate() + 1);
  }

  return days;
}

/**
 * Get Honduras holidays for a given year
 * Holidays:
 * - January 1st: New Year's Day
 * - April 14th: Día de las Américas
 * - Easter (Thursday, Friday, Saturday) - calculated
 * - May 1st: Labor Day
 * - September 15th: Independence Day
 * - First week of October (Wednesday, Friday, Saturday): Feriado Morazánico
 * - December 25th: Christmas Day
 */
export function getHondurasHolidaysForYear(year: number): Date[] {
  const holidays: Date[] = [];

  // Fixed holidays
  holidays.push(new Date(year, 0, 1)); // January 1 - New Year
  holidays.push(new Date(year, 3, 14)); // April 14 - Día de las Américas
  holidays.push(new Date(year, 4, 1)); // May 1 - Labor Day
  holidays.push(new Date(year, 8, 15)); // September 15 - Independence Day
  holidays.push(new Date(year, 11, 25)); // December 25 - Christmas

  // Calculate Easter (using simplified algorithm)
  const easter = calculateEaster(year);
  const easterThursday = new Date(easter);
  easterThursday.setDate(easter.getDate() - 3); // Thursday before Easter
  const easterFriday = new Date(easter);
  easterFriday.setDate(easter.getDate() - 2); // Good Friday
  const easterSaturday = new Date(easter);
  easterSaturday.setDate(easter.getDate() - 1); // Holy Saturday

  holidays.push(easterThursday, easterFriday, easterSaturday);

  // Feriado Morazánico (first week of October: Wednesday, Friday, Saturday)
  // Find first Wednesday of October
  const octoberFirst = new Date(year, 9, 1); // October is month 9
  let firstWednesday = new Date(octoberFirst);
  
  // Find first Wednesday
  while (firstWednesday.getDay() !== 3) {
    firstWednesday.setDate(firstWednesday.getDate() + 1);
  }
  
  const firstFriday = new Date(firstWednesday);
  firstFriday.setDate(firstWednesday.getDate() + 2);
  
  const firstSaturday = new Date(firstWednesday);
  firstSaturday.setDate(firstWednesday.getDate() + 3);

  holidays.push(firstWednesday, firstFriday, firstSaturday);

  return holidays;
}

/**
 * Calculate Easter Sunday for a given year (using anonymous Gregorian algorithm)
 */
function calculateEaster(year: number): Date {
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
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month, day);
}

/**
 * Calculate total vacation days taken by an employee in the current anniversary year
 * @param approvedRequests - Array of approved vacation leave requests
 * @param startDate - Employee start date (for calculating anniversary year)
 * @returns Total vacation days taken
 */
export function calculateDaysTaken(
  approvedRequests: Array<{
    startDate: Date | string;
    endDate: Date | string;
    type: string;
  }>,
  startDate: Date | string | null
): number {
  if (!startDate) return 0;

  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const current = new Date();
  
  // Helper function to check if a year is a leap year
  const isLeapYear = (year: number): boolean => {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  };

  // Helper to create anniversary date handling Feb 29 properly
  const createAnniversaryDate = (year: number, month: number, day: number): Date => {
    // If it's February 29th and the target year is not a leap year, use Feb 28
    if (month === 1 && day === 29 && !isLeapYear(year)) {
      return new Date(year, 1, 28);
    }
    return new Date(year, month, day);
  };

  // Calculate current anniversary year
  const currentYear = current.getFullYear();
  const startMonth = start.getMonth();
  const currentMonth = current.getMonth();
  const startDay = start.getDate();
  const currentDay = current.getDate();

  // Determine which anniversary year we're in
  let anniversaryYearStart: Date;
  let anniversaryYearEnd: Date;

  // Check if anniversary has passed this year
  if (currentMonth > startMonth || (currentMonth === startMonth && currentDay >= startDay)) {
    // Anniversary already passed - current anniversary year started this year
    // Handle Feb 29 in non-leap years properly
    anniversaryYearStart = createAnniversaryDate(currentYear, startMonth, startDay);
    anniversaryYearEnd = createAnniversaryDate(currentYear + 1, startMonth, startDay);
    anniversaryYearEnd.setDate(anniversaryYearEnd.getDate() - 1); // End day before next anniversary
  } else {
    // Anniversary hasn't passed - current anniversary year started last year
    // Handle Feb 29 in non-leap years properly
    anniversaryYearStart = createAnniversaryDate(currentYear - 1, startMonth, startDay);
    anniversaryYearEnd = createAnniversaryDate(currentYear, startMonth, startDay);
    anniversaryYearEnd.setDate(anniversaryYearEnd.getDate() - 1); // End day before anniversary
  }

  // Get holidays for both years (in case request spans years)
  const holidaysCurrentYear = getHondurasHolidaysForYear(anniversaryYearStart.getFullYear());
  const holidaysNextYear = getHondurasHolidaysForYear(anniversaryYearEnd.getFullYear());
  const allHolidays = [...holidaysCurrentYear, ...holidaysNextYear];

  let totalDays = 0;

  for (const request of approvedRequests) {
    // Only count vacation type requests
    if (request.type !== 'Vacation') {
      continue;
    }

    const requestStart = typeof request.startDate === 'string' 
      ? new Date(request.startDate) 
      : request.startDate;
    const requestEnd = typeof request.endDate === 'string' 
      ? new Date(request.endDate) 
      : request.endDate;

    // Only count requests within the current anniversary year
    // Check if request overlaps with anniversary year
    if (
      (requestStart >= anniversaryYearStart && requestStart <= anniversaryYearEnd) ||
      (requestEnd >= anniversaryYearStart && requestEnd <= anniversaryYearEnd) ||
      (requestStart <= anniversaryYearStart && requestEnd >= anniversaryYearEnd)
    ) {
      // Calculate business days for this request (excluding holidays)
      const days = calculateBusinessDays(requestStart, requestEnd, allHolidays);
      totalDays += days;
    }
  }

  return totalDays;
}

/**
 * Calculate vacation balance (entitlement - days taken)
 * @param startDate - Employee start date
 * @param approvedVacationRequests - Array of approved vacation requests
 * @returns Object with entitlement, taken, and available days
 */
export function calculateVacationBalance(
  startDate: Date | string | null,
  approvedVacationRequests: Array<{
    startDate: Date | string;
    endDate: Date | string;
    type: string;
  }> = []
): {
  entitlement: number;
  taken: number;
  available: number;
  yearsOfService: number;
  isInTrialPeriod: boolean;
  daysUntilEligible: number;
  nextAnniversary: Date | null;
} {
  const currentDate = new Date();
  
  // Check if in trial period
  let isInTrialPeriod = false;
  let daysUntilEligible = 0;
  
  if (startDate) {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const daysSinceStart = Math.floor(
      (currentDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceStart < 90) {
      isInTrialPeriod = true;
      daysUntilEligible = 90 - daysSinceStart;
    }
  }

  const entitlement = calculateVacationEntitlement(startDate, currentDate);
  const taken = calculateDaysTaken(approvedVacationRequests, startDate);
  const available = Math.max(0, entitlement - taken);

  // Calculate years of service for display
  let yearsOfService = 0;
  let nextAnniversary: Date | null = null;
  
  if (startDate) {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const current = new Date();
    yearsOfService = current.getFullYear() - start.getFullYear();
    
    const startMonth = start.getMonth();
    const currentMonth = current.getMonth();
    const startDay = start.getDate();
    const currentDay = current.getDate();
    
    if (currentMonth < startMonth || (currentMonth === startMonth && currentDay < startDay)) {
      yearsOfService--;
    }
    
    yearsOfService = Math.max(0, yearsOfService);
    
    // Calculate next anniversary
    const currentYear = current.getFullYear();
    nextAnniversary = new Date(currentYear, startMonth, startDay);
    if (nextAnniversary <= current) {
      nextAnniversary = new Date(currentYear + 1, startMonth, startDay);
    }
  }

  return {
    entitlement,
    taken,
    available,
    yearsOfService,
    isInTrialPeriod,
    daysUntilEligible,
    nextAnniversary,
  };
}

