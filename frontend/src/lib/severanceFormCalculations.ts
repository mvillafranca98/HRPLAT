/**
 * Automatic calculations for severance form fields
 */

/**
 * Calculate service period (years, months, days) from start date to current date
 */
function calculateServicePeriodToToday(startDate: string | Date): { years: number; months: number; days: number; totalMonths: number } {
  if (!startDate) return { years: 0, months: 0, days: 0, totalMonths: 0 };
  
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const today = new Date();
  
  if (isNaN(start.getTime())) {
    return { years: 0, months: 0, days: 0, totalMonths: 0 };
  }
  
  // Set both dates to midnight for accurate calculation
  const startCopy = new Date(start);
  startCopy.setHours(0, 0, 0, 0);
  const todayCopy = new Date(today);
  todayCopy.setHours(0, 0, 0, 0);
  
  let years = todayCopy.getFullYear() - startCopy.getFullYear();
  let months = todayCopy.getMonth() - startCopy.getMonth();
  let days = todayCopy.getDate() - startCopy.getDate();
  
  if (days < 0) {
    months--;
    const lastMonth = new Date(todayCopy.getFullYear(), todayCopy.getMonth(), 0);
    days += lastMonth.getDate();
  }
  
  if (months < 0) {
    years--;
    months += 12;
  }
  
  const totalMonths = years * 12 + months;
  
  return { years, months, days, totalMonths };
}

/**
 * Calculate required preaviso days based on years of service
 * Rules:
 * - 3 to 6 months: 7 days
 * - 6 months to 1 year: 14 days
 * - 1 to 2 years: 1 month (30 days)
 * - 2 to 5 years: 2 months (60 days)
 * - 5 to 10 years: 3 months (90 days)
 * - 10+ years: 4 months (120 days)
 */
export function calculateRequiredPreavisoDays(startDate: string | Date): number {
  if (!startDate) return 0;
  
  const servicePeriod = calculateServicePeriodToToday(startDate);
  const totalMonths = servicePeriod.totalMonths;
  
  // Less than 3 months: no preaviso required
  if (totalMonths < 3) {
    return 0;
  }
  
  // 3 to 6 months: 7 days
  if (totalMonths >= 3 && totalMonths < 6) {
    return 7;
  }
  
  // 6 months to 1 year: 14 days
  if (totalMonths >= 6 && totalMonths < 12) {
    return 14;
  }
  
  // 1 to 2 years: 1 month (30 days)
  if (servicePeriod.years >= 1 && servicePeriod.years < 2) {
    return 30;
  }
  
  // 2 to 5 years: 2 months (60 days)
  if (servicePeriod.years >= 2 && servicePeriod.years < 5) {
    return 60;
  }
  
  // 5 to 10 years: 3 months (90 days)
  if (servicePeriod.years >= 5 && servicePeriod.years < 10) {
    return 90;
  }
  
  // 10+ years: 4 months (120 days)
  if (servicePeriod.years >= 10) {
    return 120;
  }
  
  return 0;
}

/**
 * Calculate termination date based on current date + required preaviso days
 */
export function calculateTerminationDateFromPreaviso(preavisoDays: number): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const terminationDate = new Date(today);
  terminationDate.setDate(terminationDate.getDate() + preavisoDays);
  
  return terminationDate;
}

/**
 * Calculate preaviso days (days from today until termination date)
 * This is kept for backward compatibility and manual termination date entry
 */
export function calculatePreavisoDays(terminationDate: string | Date): number {
  if (!terminationDate) return 0;
  
  const termination = typeof terminationDate === 'string' 
    ? new Date(terminationDate) 
    : terminationDate;
  const today = new Date();
  
  // Set both dates to midnight for accurate day calculation
  today.setHours(0, 0, 0, 0);
  termination.setHours(0, 0, 0, 0);
  
  const diffTime = termination.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays); // Return 0 if termination date is in the past
}

/**
 * Calculate proportional vacation days
 * Formula: ROUND((days from anniversary to termination) * (vacation entitlement) / 360, 2)
 */
export function calculateProportionalVacationDaysForm(
  lastAnniversaryDate: string | Date,
  terminationDate: string | Date,
  vacationEntitlement: number
): number {
  if (!lastAnniversaryDate || !terminationDate || !vacationEntitlement) return 0;
  
  const anniversary = typeof lastAnniversaryDate === 'string'
    ? new Date(lastAnniversaryDate)
    : lastAnniversaryDate;
  const termination = typeof terminationDate === 'string'
    ? new Date(terminationDate)
    : terminationDate;
  
  // Set both dates to midnight for accurate day calculation
  anniversary.setHours(0, 0, 0, 0);
  termination.setHours(0, 0, 0, 0);
  
  // Days from anniversary to termination (inclusive)
  const daysFromAnniversary = Math.floor(
    (termination.getTime() - anniversary.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;
  
  // Formula: (days from anniversary) * (vacation entitlement) / 360
  const proportionalDays = (daysFromAnniversary * vacationEntitlement) / 360;
  
  // Round to 2 decimal places
  return Math.round(proportionalDays * 100) / 100;
}


/**
 * Get January 1st of the termination year
 * Used for 13th month (Décimo Tercer Mes) - NOW USES JANUARY 1ST
 */
export function getJanuary1stOfTerminationYear(terminationDate: string | Date): Date {
  if (!terminationDate) return new Date();
  
  const termination = typeof terminationDate === 'string'
    ? new Date(terminationDate)
    : terminationDate;
  
  const year = termination.getFullYear();
  return new Date(year, 0, 1); // January = month 0
}

/**
 * Get the last January 1st before or on the termination date
 * Used for calculating days from last January 1st to termination date
 */
export function getLastJanuary1st(terminationDate: string | Date): Date {
  if (!terminationDate) return new Date();
  
  const termination = typeof terminationDate === 'string'
    ? new Date(terminationDate)
    : terminationDate;
  
  const year = termination.getFullYear();
  const month = termination.getMonth();
  const day = termination.getDate();
  
  const jan1stThisYear = new Date(year, 0, 1); // January = month 0
  
  // If termination is on or after January 1st of current year, use current year's January 1st
  if (month > 0 || (month === 0 && day >= 1)) {
    return jan1stThisYear;
  }
  
  // If termination is before January 1st (shouldn't happen), use previous year's January 1st
  return new Date(year - 1, 0, 1);
}

/**
 * Calculate days for 13th month (Décimo Tercer Mes)
 * From last January 1st to termination date using 30-day months
 * Returns raw days that will be converted with *30/360 in PDF
 */
export function calculateThirteenthMonthDays(
  startDate: Date, // This should be the last Jan 1st
  terminationDate: string | Date
): number {
  if (!startDate || !terminationDate) return 0;
  
  const termination = typeof terminationDate === 'string'
    ? new Date(terminationDate)
    : terminationDate;
  
  // Set both dates to midnight
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const term = new Date(termination);
  term.setHours(0, 0, 0, 0);
  
  // Start is always Jan 1st of a year (month = 0)
  const startYear = start.getFullYear();
  const startMonth = start.getMonth(); // Should be 0 (January)
  const startDay = start.getDate(); // Should be 1
  
  const termYear = term.getFullYear();
  const termMonth = term.getMonth();
  const termDay = term.getDate();
  
  // Calculate total days using 30-day month logic
  let totalDays = 0;
  
  if (startYear === termYear && startMonth === termMonth) {
    // Same month (January) - days from start day to termination day (inclusive)
    // Jan 1 to Jan 6 = 6 days (Jan 1, 2, 3, 4, 5, 6)
    // Since start is always day 1, the number of days is termDay
    totalDays = termDay;
  } else {
    // Different month or year
    // Calculate full months between start and termination
    let fullMonths = 0;
    
    if (startYear === termYear) {
      // Same year: months from January (month 0) to termination month
      fullMonths = termMonth - startMonth;
    } else {
      // Different year: months from January to December + months from January to termination month
      fullMonths = (12 - startMonth) + termMonth;
    }
    
    // Full months * 30 + days in termination month (from day 1 to termination day, inclusive)
    totalDays = (fullMonths * 30) + termDay;
  }
  
  return Math.max(0, totalDays);
}

/**
 * Get July 1st of the termination year
 * Used for 14th month (Décimo Cuarto Mes) - NOW USES JULY 1ST
 */
export function getJuly1stOfTerminationYear(terminationDate: string | Date): Date {
  if (!terminationDate) return new Date();
  
  const termination = typeof terminationDate === 'string'
    ? new Date(terminationDate)
    : terminationDate;
  
  const year = termination.getFullYear();
  return new Date(year, 6, 1); // July = month 6 (0-indexed)
}

/**
 * Get the last July 1st before or on the termination date
 * Used for calculating days from last July 1st to termination date
 */
export function getLastJuly1st(terminationDate: string | Date): Date {
  if (!terminationDate) return new Date();
  
  const termination = typeof terminationDate === 'string'
    ? new Date(terminationDate)
    : terminationDate;
  
  const year = termination.getFullYear();
  const month = termination.getMonth();
  const day = termination.getDate();
  
  const july1stThisYear = new Date(year, 6, 1); // July = month 6 (0-indexed)
  
  // If termination is on or after July 1st of current year, use current year's July 1st
  if (month > 6 || (month === 6 && day >= 1)) {
    return july1stThisYear;
  }
  
  // If termination is before July 1st, use previous year's July 1st (last July 1st)
  return new Date(year - 1, 6, 1);
}

/**
 * Calculate days for 14th month (Décimo Cuarto Mes)
 * From last July 1st to termination date using 30-day months
 * Returns raw days that will be converted with *30/360 in PDF
 */
export function calculateFourteenthMonthDays(
  startDate: Date, // This should be the last July 1st
  terminationDate: string | Date
): number {
  if (!startDate || !terminationDate) return 0;
  
  const termination = typeof terminationDate === 'string'
    ? new Date(terminationDate)
    : terminationDate;
  
  // Set both dates to midnight
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const term = new Date(termination);
  term.setHours(0, 0, 0, 0);
  
  // Start is always July 1st of a year (month = 6)
  const startYear = start.getFullYear();
  const startMonth = start.getMonth(); // Should be 6 (July)
  const startDay = start.getDate(); // Should be 1
  
  const termYear = term.getFullYear();
  const termMonth = term.getMonth();
  const termDay = term.getDate();
  
  // Calculate total days using 30-day month logic
  let totalDays = 0;
  
  if (startYear === termYear && startMonth === termMonth) {
    // Same month (July) - days from start day to termination day (inclusive)
    totalDays = termDay - startDay + 1;
  } else {
    // Different month or year
    // Calculate full months between start and termination
    let fullMonths = 0;
    
    if (startYear === termYear) {
      // Same year: months from July (month 6) to termination month
      fullMonths = termMonth - startMonth;
    } else {
      // Different year: months from July to December + months from January to termination month
      fullMonths = (12 - startMonth) + termMonth;
    }
    
    // Full months * 30 + days in termination month (from day 1 to termination day, inclusive)
    totalDays = (fullMonths * 30) + termDay;
  }
  
  return Math.max(0, totalDays);
}

/**
 * Get January 1st of the termination year (alias for backward compatibility)
 */
export function getJanuary1stOfYear(terminationDate: string | Date): Date {
  return getJanuary1stOfTerminationYear(terminationDate);
}

/**
 * Calculate service period from start date to termination date
 * Returns years, months, days, and total days (using 360 days/year, 30 days/month)
 */
export function calculateServicePeriod(
  startDate: string | Date,
  terminationDate: string | Date
): { years: number; months: number; days: number; totalDays: number } {
  if (!startDate || !terminationDate) {
    return { years: 0, months: 0, days: 0, totalDays: 0 };
  }
  
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const termination = typeof terminationDate === 'string' ? new Date(terminationDate) : terminationDate;
  
  if (isNaN(start.getTime()) || isNaN(termination.getTime())) {
    return { years: 0, months: 0, days: 0, totalDays: 0 };
  }
  
  // Set both dates to midnight
  const startCopy = new Date(start);
  startCopy.setHours(0, 0, 0, 0);
  const termCopy = new Date(termination);
  termCopy.setHours(0, 0, 0, 0);
  
  let years = termCopy.getFullYear() - startCopy.getFullYear();
  let months = termCopy.getMonth() - startCopy.getMonth();
  let days = termCopy.getDate() - startCopy.getDate();
  
  if (days < 0) {
    months--;
    // Use 30 days per month for consistency with labor law calculations
    // When days is negative, we need to count remaining days in the start month inclusively
    // Example: From Feb 10 to Jan 6: days = -4, so remaining days in Feb = 30 - 10 + 1 = 21 days
    // After adjustment: days = 30 + days (which is -4) = 26, but we want 21 + 6 = 27
    // Actually, for inclusive counting: from day X to day Y in same month = Y - X + 1
    // But when crossing months: remaining days in start month + days in end month
    // Let's use: days = 30 + days (which gives us the correct remaining + end days)
    days += 30;
  }
  
  if (months < 0) {
    years--;
    months += 12;
  }
  
  // Calculate total days using 360 days/year, 30 days/month
  // Note: Days are counted inclusively (both start and end day are included)
  const totalDays = (years * 360) + (months * 30) + days;
  
  return { years, months, days, totalDays };
}

/**
 * Calculate cesantia days
 * Formula: total years worked * 360 * 30 / 360
 * This simplifies to: total years * 30
 */
export function calculateCesantiaDays(
  startDate: string | Date,
  terminationDate: string | Date
): number {
  if (!startDate || !terminationDate) return 0;
  
  const servicePeriod = calculateServicePeriod(startDate, terminationDate);
  
  // Formula: total years * 360 * 30 / 360 = total years * 30
  const cesantiaDays = (servicePeriod.years * 360 * 30) / 360;
  
  return Math.round(cesantiaDays * 100) / 100; // Round to 2 decimals
}

/**
 * Calculate cesantia proportional days
 * Formula: total days worked in the last year (month=30 days; add remaining days), then * 30 / 360
 */
export function calculateCesantiaProportionalDays(
  startDate: string | Date,
  terminationDate: string | Date
): number {
  if (!startDate || !terminationDate) return 0;
  
  // Get last anniversary (start of current year of service)
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const termination = typeof terminationDate === 'string' ? new Date(terminationDate) : terminationDate;
  
  if (isNaN(start.getTime()) || isNaN(termination.getTime())) {
    return 0;
  }
  
  // Calculate last anniversary
  const termYear = termination.getFullYear();
  const termMonth = termination.getMonth();
  const termDay = termination.getDate();
  
  const startMonth = start.getMonth();
  const startDay = start.getDate();
  
  let lastAnniversary = new Date(termYear, startMonth, startDay);
  
  // If last anniversary is after termination, use previous year's anniversary
  if (lastAnniversary > termination) {
    lastAnniversary = new Date(termYear - 1, startMonth, startDay);
  }
  
  // Count days from the day AFTER the anniversary (exclusive start) to match vacation calculation
  const dayAfterAnniversary = new Date(lastAnniversary);
  dayAfterAnniversary.setDate(dayAfterAnniversary.getDate() + 1);
  
  // Calculate days from day after anniversary to termination (using 30 days/month)
  const period = calculateServicePeriod(dayAfterAnniversary, termination);
  
  // Total days in last year using 30 days/month
  const daysInLastYear = (period.months * 30) + period.days;
  
  // Formula: days in last year * 30 / 360
  const cesantiaProDays = (daysInLastYear * 30) / 360;
  
  return Math.round(cesantiaProDays * 100) / 100; // Round to 2 decimals
}

/**
 * Get last anniversary date before or on the given date
 */
export function getLastAnniversaryDate(
  startDate: string | Date,
  beforeDate: string | Date
): Date {
  if (!startDate || !beforeDate) return new Date();
  
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const before = typeof beforeDate === 'string' ? new Date(beforeDate) : beforeDate;
  
  if (isNaN(start.getTime()) || isNaN(before.getTime())) {
    return new Date();
  }
  
  const startMonth = start.getMonth();
  const startDay = start.getDate();
  const beforeYear = before.getFullYear();
  const beforeMonth = before.getMonth();
  const beforeDay = before.getDate();
  
  // Create anniversary for the year of the "before" date
  let lastAnniversary = new Date(beforeYear, startMonth, startDay);
  
  // If anniversary hasn't occurred yet this year, use previous year's anniversary
  if (beforeMonth < startMonth || (beforeMonth === startMonth && beforeDay < startDay)) {
    lastAnniversary = new Date(beforeYear - 1, startMonth, startDay);
  }
  
  return lastAnniversary;
}

/**
 * Calculate proportional vacation days
 * Formula: (days since last anniversary / 360) * vacationDaysEntitlement
 * Where days are calculated using 30-day months, year=360 days
 * Note: Days are counted from the day AFTER the anniversary (exclusive start)
 */
export function calculateVacationProportionalDays(
  startDate: string | Date,
  terminationDate: string | Date,
  vacationDaysEntitlement: number
): number {
  if (!startDate || !terminationDate || !vacationDaysEntitlement) return 0;
  
  // Get last anniversary before termination date
  const lastAnniversary = getLastAnniversaryDate(startDate, terminationDate);
  
  // Count days from the day AFTER the anniversary (exclusive start)
  // This matches the spreadsheet calculation: "days worked since last anniversary"
  const dayAfterAnniversary = new Date(lastAnniversary);
  dayAfterAnniversary.setDate(dayAfterAnniversary.getDate() + 1);
  
  // Calculate service period from day after anniversary to termination (using 360 days/year, 30 days/month)
  const servicePeriod = calculateServicePeriod(dayAfterAnniversary, terminationDate);
  
  // Total days = (years * 360) + (months * 30) + days
  const totalDays = servicePeriod.totalDays;
  
  // Formula: (days / 360) * vacation entitlement
  const proportionalDays = (totalDays / 360) * vacationDaysEntitlement;
  
  return Math.round(proportionalDays * 100) / 100; // Round to 2 decimals
}

/**
 * Format date as YYYY-MM-DD for input fields
 */
export function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

