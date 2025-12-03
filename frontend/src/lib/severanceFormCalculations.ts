/**
 * Automatic calculations for severance form fields
 */

/**
 * Calculate preaviso days (days from today until termination date)
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
 * Get the last July 1st before or on the termination date
 * Used for 13th month (Décimo Tercer Mes)
 * "should always be the last July 1st that has passed since the termination date"
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
  
  // Otherwise use last year's July 1st
  return new Date(year - 1, 6, 1);
}

/**
 * Calculate days for 13th month (30 days per month)
 * From last July 1st to termination date
 * Using 30 days per month calculation
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
  termination.setHours(0, 0, 0, 0);
  
  // Calculate difference in months and days
  let yearsDiff = termination.getFullYear() - start.getFullYear();
  let monthsDiff = termination.getMonth() - start.getMonth();
  let daysDiff = termination.getDate() - start.getDate();
  
  // Adjust if days are negative
  if (daysDiff < 0) {
    monthsDiff--;
    // Get last day of previous month
    const lastDayOfPrevMonth = new Date(termination.getFullYear(), termination.getMonth(), 0).getDate();
    daysDiff += lastDayOfPrevMonth;
  }
  
  // Adjust if months are negative
  if (monthsDiff < 0) {
    yearsDiff--;
    monthsDiff += 12;
  }
  
  // Total months from start to termination
  const totalMonths = yearsDiff * 12 + monthsDiff;
  
  // Days = months * 30 + remaining days (as per user requirement: 30 days per month)
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
  termination.setHours(0, 0, 0, 0);
  
  // Calculate difference in months and days
  let yearsDiff = termination.getFullYear() - start.getFullYear();
  let monthsDiff = termination.getMonth() - start.getMonth();
  let daysDiff = termination.getDate() - start.getDate();
  
  // Adjust if days are negative
  if (daysDiff < 0) {
    monthsDiff--;
    // Get last day of previous month
    const lastDayOfPrevMonth = new Date(termination.getFullYear(), termination.getMonth(), 0).getDate();
    daysDiff += lastDayOfPrevMonth;
  }
  
  // Adjust if months are negative
  if (monthsDiff < 0) {
    yearsDiff--;
    monthsDiff += 12;
  }
  
  // Total months from start to termination
  const totalMonths = yearsDiff * 12 + monthsDiff;
  
  // Days = months * 30 + remaining days (as per user requirement: 30 days per month)
  const days = (totalMonths * 30) + daysDiff;
  
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

