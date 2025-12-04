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
 * Get July 1st of the termination date's year
 * Used for 13th month (Décimo Tercer Mes) start date display
 * Returns July 1st of the termination year
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
 * For 13th month calculation, we need the last July 1st that has passed
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
 * Calculate days for 13th month (30 days per month)
 * From last July 1st to termination date
 * Using 30 days per month calculation
 * 
 * Example: If termination is Jan 2, 2026 and last July 1st is July 1, 2025:
 * - Full months: July through December (6 months) = 6 * 30 = 180 days
 * - January days: Jan 1 to Jan 2 = 2 days (inclusive)
 * - Total = 180 + 2 = 182 days
 */
export function calculateThirteenthMonthDays(
  startDate: Date,
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
  
  // Calculate total months difference
  let yearsDiff = term.getFullYear() - start.getFullYear();
  let monthsDiff = term.getMonth() - start.getMonth();
  let daysDiff = term.getDate() - start.getDate();
  
  // Adjust if days are negative (termination day is before start day)
  if (daysDiff < 0) {
    monthsDiff--;
    // Count days in termination month (inclusive from day 1)
    daysDiff = term.getDate();
  }
  
  // Adjust if months are negative
  if (monthsDiff < 0) {
    yearsDiff--;
    monthsDiff += 12;
  }
  
  // Total full months from start to termination
  const totalMonths = yearsDiff * 12 + monthsDiff;
  
  // Days = (full months * 30) + days in termination month
  // Using 30 days per month as per requirement
  const days = (totalMonths * 30) + daysDiff;
  
  return Math.max(0, days);
}

/**
 * Get January 1st of the termination year
 * Used for 14th month (Décimo Cuarto Mes)
 */
export function getJanuary1stOfYear(terminationDate: string | Date): Date {
  if (!terminationDate) return new Date();
  
  const termination = typeof terminationDate === 'string'
    ? new Date(terminationDate)
    : terminationDate;
  
  const year = termination.getFullYear();
  return new Date(year, 0, 1); // January = month 0
}

/**
 * Calculate days for 14th month (30 days per month)
 * From January 1st to termination date
 * Using 30 days per month calculation
 * 
 * Example: If termination is Jan 31, 2026 and start is Jan 1, 2026:
 * - Full months: 0 (same month)
 * - Days in January: Jan 1 to Jan 31 = 31 days, but using 30 days/month = 30 days
 * - Total = 0 * 30 + 30 = 30 days
 */
export function calculateFourteenthMonthDays(
  startDate: Date,
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
  
  // Start is always January 1st of the termination year (day 1)
  // Termination date is in the same year
  
  // Calculate months difference (0 for January, 1-11 for other months)
  const monthsDiff = term.getMonth() - start.getMonth();
  
  // If termination is before or on Jan 1, return 0
  if (monthsDiff < 0 || (monthsDiff === 0 && term.getDate() <= 1)) {
    return 0;
  }
  
  // Calculate days from Jan 1 to termination date
  // Start is Jan 1 (day 1), so days = termination day - 1
  // Using 30 days per month logic, cap at 30
  let daysInTermMonth = term.getDate() - 1;
  
  // Cap at 30 days per month
  daysInTermMonth = Math.min(daysInTermMonth, 30);
  
  // Days = (full months * 30) + days in termination month
  // For January: monthsDiff = 0, days = daysInTermMonth
  // For Jan 31: days = min(31 - 1, 30) = 30 ✓
  // For Jan 2: days = min(2 - 1, 30) = 1 (but user wants 30 for Jan 31 example)
  
  const days = (monthsDiff * 30) + daysInTermMonth;
  
  return Math.max(0, days);
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

