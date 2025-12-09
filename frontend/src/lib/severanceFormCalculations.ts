/**
 * Severance Calculation Functions - TO BE FIXED
 * 
 * This file contains functions that need to be fixed:
 * - calculateCesantiaProportionalDays (needs fixing)
 * - calculateVacationProportionalDays (needs fixing)
 * 
 * Also contains shared utilities used by both working and problematic functions:
 * - calculateServicePeriod (shared utility)
 * - getLastAnniversaryDate (shared utility)
 * - formatDateForInput (shared utility)
 * 
 * All working calculations have been moved to:
 * - severanceFormCalculationsWorking.ts
 */

/**
 * Calculate service period from start date to termination date
 * Returns years, months, days, and total days (using 360 days/year, 30 days/month)
 * This is a shared utility used by both working and problematic functions
 */
export function calculateServicePeriod(
  startDate: string | Date,
  terminationDate: string | Date
): { years: number; months: number; days: number; totalDays: number } {
  if (!startDate || !terminationDate) {
    return { years: 0, months: 0, days: 0, totalDays: 0 };
  }
  
  // Helper to parse date strings without timezone issues
  const parseDate = (date: string | Date): Date => {
    if (typeof date === 'string') {
      const [year, month, day] = date.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    return date;
  };
  
  const start = parseDate(startDate);
  const termination = parseDate(terminationDate);
  
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
  
  // Adjust for negative days
  if (days < 0) {
    months--;
    // When crossing months, calculate remaining days in start month + days in end month
    // Example: From Feb 11 to Jan 6:
    // - Remaining days in Feb (Feb 11-30) = 30 - 11 + 1 = 20 days
    // - Days in Jan (Jan 1-6) = 6 days
    // - Total = 20 + 6 = 26 days
    // But with 30-day month logic: (30 - startDay + 1) + endDay
    // = (30 - 11 + 1) + 6 = 20 + 6 = 26
    // However, we're using days = 30 + days, where days = -5
    // So: 30 + (-5) = 25, which is off by 1
    
    // The correct formula when using 30-day months:
    // Remaining days in start month = 30 - startDay + 1 (if inclusive from startDay)
    // But since we want to count FROM startDay (inclusive) TO endDay (inclusive)
    // in a 30-day month system: days = (30 - startDay + 1) + endDay
    // = 30 - startDay + 1 + endDay = 30 + (endDay - startDay) + 1
    // = 30 + days + 1 (since days = endDay - startDay, which is negative)
    days = 30 + days + 1; // Add 1 to account for inclusive counting
  }
  
  if (months < 0) {
    years--;
    months += 12;
    // When months wrap around (crossing year boundary), we need to add 1 day
    // for inclusive counting if days is positive
    // Example: Feb 5 to Jan 7: months wraps, days=2, but should count inclusively
    if (days >= 0) {
      days += 1; // Add 1 for inclusive counting when crossing year boundary
    }
  }
  
  // Calculate total days using 360 days/year, 30 days/month
  // Note: Days are counted inclusively (both start and end day are included)
  const totalDays = (years * 360) + (months * 30) + days;
  
  return { years, months, days, totalDays };
  
}

/**
 * Get last anniversary date before or on the given date
 * Shared utility used by both problematic functions
 */
export function getLastAnniversaryDate(
  startDate: string | Date,
  beforeDate: string | Date
): Date {
  if (!startDate || !beforeDate) return new Date();
  
  // Helper to parse date strings without timezone issues
  const parseDate = (date: string | Date): Date => {
    if (typeof date === 'string') {
      const [year, month, day] = date.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    return date;
  };
  
  const start = parseDate(startDate);
  const before = parseDate(beforeDate);
  
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
 * Calculate cesantia proportional days
 * TODO: This function needs to be fixed to match the spreadsheet calculations
 * Formula: total days worked in the last year (month=30 days; add remaining days), then * 30 / 360
 */
export function calculateCesantiaProportionalDays(
  startDate: string | Date,
  terminationDate: string | Date
): number {
  if (!startDate || !terminationDate) return 0;
  
  // Helper to parse date strings without timezone issues
  const parseDate = (date: string | Date): Date => {
    if (typeof date === 'string') {
      const [year, month, day] = date.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    return date;
  };
  
  // Get last anniversary (start of current year of service)
  const start = parseDate(startDate);
  const termination = parseDate(terminationDate);
  
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
  
  // DEBUG: Log period details
  console.log('DEBUG Period Calculation (Cesantia Proporcional):', {
    dayAfterAnniversary: dayAfterAnniversary.toISOString().split('T')[0],
    termination: termination.toISOString().split('T')[0],
    period,
    totalDays: period.totalDays
  });
  
  // Use totalDays directly from calculateServicePeriod which already calculates correctly
  // Total days in last year using 30 days/month
  const daysInLastYear = period.totalDays + 1;
  
  // Formula: days in last year * 30 / 360
  const cesantiaProDays = (daysInLastYear * 30) / 360;
  
  // DEBUG: Log intermediate values
  console.log('DEBUG Cesantia Proporcional Calculation:', {
    daysInLastYear,
    calculation: `${daysInLastYear} * 30 / 360`,
    rawResult: cesantiaProDays,
    rounded: Math.round(cesantiaProDays * 100) / 100
  });
  
  return Math.round(cesantiaProDays * 100) / 100; // Round to 2 decimals 
}

/**
 * Calculate proportional vacation days
 * TODO: This function needs to be fixed to match the spreadsheet calculations
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
  const totalDays = servicePeriod.totalDays + 1;
  
  // Formula: (days / 360) * vacation entitlement
  const proportionalDays = (totalDays / 360) * vacationDaysEntitlement;
  
  return Math.round(proportionalDays * 100) / 100; // Round to 2 decimals
}

/**
 * Format date as YYYY-MM-DD for input fields
 * Shared utility used by both working and problematic functions
 */
export function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
