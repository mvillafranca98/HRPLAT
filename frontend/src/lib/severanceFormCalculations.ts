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
    // Calculate remaining days using 30-day month logic:
    // Days = (remaining days in start month) + (days in end month)
    // = (30 - startDay) + endDay
    // Example: Jan 11 to Feb 7:
    // = (30 - 11) + 7 = 19 + 7 = 26 days
    days = 30 + days; // This gives us the correct remaining days
  }
  
  // Adjust for negative months
  if (months < 0) {
    years--;
    months += 12;
    // No need to add extra day here - the days calculation above is already correct
  }
  
  // Calculate total days using 360 days/year, 30 days/month
  // Note: Days are counted inclusively (both start and end day are included)
  const totalDays = (years * 360) + (months * 30) + days;
  
  return { years, months, days, totalDays };
  
}

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
 * Helper function to check if a year is a leap year
 */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Create a date with proper handling of February 29th (leap year)
 * If the day is Feb 29 and the target year is not a leap year, use Feb 28 instead
 */
function createAnniversaryDate(year: number, month: number, day: number): Date {
  // If it's February 29th and the target year is not a leap year, use Feb 28
  if (month === 1 && day === 29 && !isLeapYear(year)) {
    return new Date(year, 1, 28);
  }
  return new Date(year, month, day);
}

/**
 * Get last anniversary date before or on the given date
 * Shared utility used by both problematic functions
 * Handles February 29th properly: if start date is Feb 29, anniversary in non-leap years is Feb 28
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
  // Handle Feb 29 in non-leap years properly (use Feb 28 instead)
  let lastAnniversary = createAnniversaryDate(beforeYear, startMonth, startDay);
  
  // If anniversary hasn't occurred yet this year, use previous year's anniversary
  if (beforeMonth < startMonth || (beforeMonth === startMonth && beforeDay < startDay)) {
    lastAnniversary = createAnniversaryDate(beforeYear - 1, startMonth, startDay);
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
  
  // Return full precision - rounding will be done only for display in PDF
  return cesantiaProDays; 
}

/**
 * Calculate proportional vacation days
 * Formula: (days since last anniversary / 360) * vacationDaysEntitlement
 * Where days are calculated using 30-day months, year=360 days
 * Note: Days are counted FROM the anniversary date (inclusive) to termination date
 * 
 * Example breakdown (Nov 11 to Feb 7):
 * - Days in Nov: (30 - 11 + 1) = 20 days (inclusive from Nov 11)
 * - December: 30 days
 * - January: 30 days
 * - Days in Feb: 7 days
 * - Total: 20 + 30 + 30 + 7 = 87 days
 */
export function calculateVacationProportionalDays(
  startDate: string | Date,
  terminationDate: string | Date,
  vacationDaysEntitlement: number
): number {
  if (!startDate || !terminationDate || !vacationDaysEntitlement) return 0;
  
  // Normalize start date: Feb 29 → Feb 28 for calculations
  const normalizedStartDate = normalizeStartDateForCalculations(startDate);
  
  // Get last anniversary before termination date (using normalized start date)
  const lastAnniversary = getLastAnniversaryDate(normalizedStartDate, terminationDate);
  
  // Count days FROM the anniversary date (inclusive) to termination date
  // Breakdown: (remaining days in anniversary month) + (full months) + (days in termination month)
  const servicePeriod = calculateServicePeriod(lastAnniversary, terminationDate);
  
  // calculateServicePeriod already calculates the correct total days using 30-day month logic
  // It uses (30 - startDay) + endDay for partial months, which correctly handles the period
  // For Nov 11 to Feb 8: (30-11) + 8 = 27 days in partial months + 60 days full months = 87 days
  // This matches the expected calculation without needing additional adjustments
  const totalDays = servicePeriod.totalDays;
  
  // Formula: (days / 360) * vacation entitlement
  const proportionalDays = (totalDays / 360) * vacationDaysEntitlement;
  
  // Return full precision - rounding will be done only for display in PDF
  return proportionalDays;
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
