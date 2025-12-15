/**
 * Severance Calculation Utilities
 * Based on Honduras Labor Law
 */

import { calculateBusinessDays, getHondurasHolidaysForYear, calculateVacationEntitlement } from './vacationBalance';

export interface SeveranceData {
  // Employee Info
  employeeName: string;
  dni: string;
  startDate: Date;
  terminationDate: Date;
  terminationReason: string; // "Renuncia", "Despido", etc.
  
  // Salary History (last 6 months, oldest to newest)
  salaryHistory: Array<{
    month: string;
    year: number;
    amount: number;
  }>;
  
  // Calculated Values
  yearsOfService: number;
  monthsOfService: number;
  daysOfService: number;
  totalDaysWorked: number; // Based on 30 days per month
  averageMonthlySalary: number;
  dailySalary: number;
  
  // Vacation Info
  lastAnniversaryDate: Date;
  vacationDaysRemaining: number;
  vacationDaysEntitlement: number;
  
  // Notice Period (Preaviso) - typically 30 days, but can vary
  noticeDays: number;
  
  // Severance Benefits
  severanceDays: number; // 150 days for years 1-3, then proportional
  proportionalSeveranceDays: number;
  
  // 13th Month (Aguinaldo) - calculated from Jan 1 to termination
  thirteenthMonthDays: number;
  thirteenthMonthStartDate: Date;
  
  // 14th Month (Bono 14) - calculated from Jul 1 to termination
  fourteenthMonthDays: number;
  fourteenthMonthStartDate: Date;
}

export interface SeveranceBenefits {
  noticePay: number;
  severancePay: number;
  proportionalSeverancePay: number;
  vacationPay: number;
  proportionalVacationPay: number;
  thirteenthMonthPay: number;
  fourteenthMonthPay: number;
  totalBenefits: number;
}

/**
 * Calculate service period (years, months, days) between start and end date
 */
export function calculateServicePeriod(
  startDate: Date,
  endDate: Date
): {
  years: number;
  months: number;
  days: number;
  totalDays: number;
} {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Ensure start is before end
  if (start > end) {
    return { years: 0, months: 0, days: 0, totalDays: 0 };
  }
  
  // Calculate years
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();
  
  // Adjust for negative months/days
  if (days < 0) {
    months--;
    // Get last day of previous month
    const lastDayOfPrevMonth = new Date(end.getFullYear(), end.getMonth(), 0).getDate();
    days += lastDayOfPrevMonth;
  }
  
  if (months < 0) {
    years--;
    months += 12;
  }
  
  // Calculate total days
  const totalDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  return { years, months, days, totalDays };
}

/**
 * Calculate average salary from salary history (last 6 months)
 */
export function calculateAverageSalary(
  salaryHistory: Array<{ amount: number }>
): number {
  if (salaryHistory.length === 0) return 0;
  const total = salaryHistory.reduce((sum, s) => sum + s.amount, 0);
  return total / salaryHistory.length;
}

/**
 * Calculate daily salary from monthly salary (assuming 30 days per month)
 */
export function calculateDailySalary(monthlySalary: number): number {
  return monthlySalary / 30;
}

/**
 * Calculate total days worked based on service period (30 days per month)
 */
export function calculateTotalDaysWorked(
  years: number,
  months: number,
  days: number
): number {
  return years * 365 + months * 30 + days;
}

/**
 * Calculate vacation days remaining for severance
 */
export function calculateVacationDaysForSeverance(
  startDate: Date,
  terminationDate: Date,
  approvedVacations: Array<{
    startDate: Date | string;
    endDate: Date | string;
    type: string;
  }> = []
): {
  daysRemaining: number;
  lastAnniversary: Date;
  entitlement: number;
} {
  // Calculate last anniversary before termination
  const start = new Date(startDate);
  const termination = new Date(terminationDate);
  
  const startMonth = start.getMonth();
  const startDay = start.getDate();
  const termYear = termination.getFullYear();
  const termMonth = termination.getMonth();
  const termDay = termination.getDate();
  
  // Determine last anniversary
  let lastAnniversary: Date;
  if (termMonth > startMonth || (termMonth === startMonth && termDay >= startDay)) {
    // Anniversary already passed this year
    lastAnniversary = new Date(termYear, startMonth, startDay);
  } else {
    // Anniversary hasn't passed - last anniversary was last year
    lastAnniversary = new Date(termYear - 1, startMonth, startDay);
  }
  
  // Calculate entitlement for the year
  const entitlement = calculateVacationEntitlement(startDate, lastAnniversary);
  
  // Calculate days taken since last anniversary
  let daysTaken = 0;
  const holidays = getHondurasHolidaysForYear(lastAnniversary.getFullYear());
  
  for (const vacation of approvedVacations) {
    if (vacation.type !== 'Vacation') continue;
    
    const vacStart = typeof vacation.startDate === 'string' 
      ? new Date(vacation.startDate) 
      : vacation.startDate;
    const vacEnd = typeof vacation.endDate === 'string' 
      ? new Date(vacation.endDate) 
      : vacation.endDate;
    
    // Only count vacations after last anniversary and before termination
    if (vacStart >= lastAnniversary && vacEnd <= termination) {
      const days = calculateBusinessDays(vacStart, vacEnd, holidays);
      daysTaken += days;
    }
  }
  
  const daysRemaining = Math.max(0, entitlement - daysTaken);
  
  return {
    daysRemaining,
    lastAnniversary,
    entitlement,
  };
}

/**
 * Calculate proportional vacation days from last anniversary to termination
 */
export function calculateProportionalVacationDays(
  startDate: Date,
  terminationDate: Date,
  lastAnniversary: Date,
  vacationEntitlement: number
): number {
  // Days from anniversary to termination
  const daysFromAnniversary = Math.floor(
    (terminationDate.getTime() - lastAnniversary.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // Days in a year (365)
  const daysInYear = 365;
  
  // Proportional vacation = (days from anniversary / days in year) * entitlement
  const proportional = (daysFromAnniversary / daysInYear) * vacationEntitlement;
  
  return Math.round(proportional * 100) / 100; // Round to 2 decimals
}

/**
 * Calculate 13th month (Aguinaldo) - from January 1 to termination
 */
export function calculateThirteenthMonth(
  terminationDate: Date
): {
  days: number;
  startDate: Date;
} {
  const termination = new Date(terminationDate);
  const year = termination.getFullYear();
  const startDate = new Date(year, 0, 1); // January 1
  
  // Days from Jan 1 to termination (inclusive)
  const days = Math.floor(
    (termination.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1; // +1 to include both start and end days
  
  return { days, startDate };
}

/**
 * Calculate 14th month (Bono 14) - from July 1 to termination (if in second half)
 */
export function calculateFourteenthMonth(
  terminationDate: Date
): {
  days: number;
  startDate: Date;
} {
  const termination = new Date(terminationDate);
  const year = termination.getFullYear();
  const startDate = new Date(year, 6, 1); // July 1
  
  // Only calculate if termination is after July 1
  if (termination < startDate) {
    return { days: 0, startDate };
  }
  
  // Days from Jul 1 to termination (inclusive)
  const days = Math.floor(
    (termination.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1; // +1 to include both start and end days
  
  return { days, startDate };
}

/**
 * Calculate severance benefits according to Honduras law
 */
export function calculateSeveranceBenefits(
  data: SeveranceData
): SeveranceBenefits {
  const dailySalary = data.dailySalary;
  
  // Preaviso (Notice Pay) - typically 30 days, but using data.noticeDays
  const noticePay = data.noticeDays * dailySalary;
  
  // Auxilio de Cesantía (Severance Pay)
  // For employees with 1-3 years: 150 days
  // For employees with more than 3 years: 150 days + proportional for additional years
  let severanceDays = 0;
  if (data.yearsOfService <= 3) {
    severanceDays = 150;
  } else {
    // 150 days for first 3 years + 20 days per additional year (max 8 additional years = 160 more days)
    const additionalYears = Math.min(data.yearsOfService - 3, 8);
    severanceDays = 150 + (additionalYears * 20);
  }
  
  const severancePay = severanceDays * dailySalary;
  
  // Auxilio de Cesantía Proporcional
  // Pro-rate using months and days beyond full years with 30-day year base
  // Formula: ((months*30 + days) / 12) == (((months*30 + days) * 30) / 360)
  const proportionalSeveranceDays =
    ((data.monthsOfService * 30) + data.daysOfService) / 12;
  const proportionalSeverancePay = proportionalSeveranceDays * dailySalary;
  
  // Vacation Pay (already accrued)
  const vacationPay = data.vacationDaysRemaining * dailySalary;
  
  // Vacation Pay Proportional (from last anniversary to termination)
  const proportionalVacationDays = calculateProportionalVacationDays(
    data.startDate,
    data.terminationDate,
    data.lastAnniversaryDate,
    data.vacationDaysEntitlement
  );
  const proportionalVacationPay = proportionalVacationDays * dailySalary;
  
  // 13th Month (Aguinaldo)
  const thirteenthMonthPay = (data.thirteenthMonthDays / 365) * data.averageMonthlySalary;
  
  // 14th Month (Bono 14)
  const fourteenthMonthPay = data.fourteenthMonthDays > 0 
    ? (data.fourteenthMonthDays / 184) * data.averageMonthlySalary // July-Dec = 184 days
    : 0;
  
  const totalBenefits =
    noticePay +
    severancePay +
    proportionalSeverancePay +
    vacationPay +
    proportionalVacationPay +
    thirteenthMonthPay +
    fourteenthMonthPay;
  
  return {
    noticePay: Math.round(noticePay * 100) / 100,
    severancePay: Math.round(severancePay * 100) / 100,
    proportionalSeverancePay: Math.round(proportionalSeverancePay * 100) / 100,
    vacationPay: Math.round(vacationPay * 100) / 100,
    proportionalVacationPay: Math.round(proportionalVacationPay * 100) / 100,
    thirteenthMonthPay: Math.round(thirteenthMonthPay * 100) / 100,
    fourteenthMonthPay: Math.round(fourteenthMonthPay * 100) / 100,
    totalBenefits: Math.round(totalBenefits * 100) / 100,
  };
}

