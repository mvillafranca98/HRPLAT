/**
 * Excel Generation Utility for Severance Documents
 * Populates the Excel template with calculated severance data
 * Based on RRHH.xlsx template structure
 */

import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { SeveranceData, SeveranceBenefits, calculateSeveranceBenefits } from './severanceCalculation';

/**
 * Generate severance Excel file from template
 */
export async function generateSeveranceExcel(
  severanceData: SeveranceData,
  templatePath: string
): Promise<ExcelJS.Workbook> {
  // Load the Excel template
  const workbook = new ExcelJS.Workbook();
  
  // Read the template file
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template file not found at: ${templatePath}`);
  }
  
  await workbook.xlsx.readFile(templatePath);
  
  const worksheet = workbook.getWorksheet(1); // Get first sheet
  
  if (!worksheet) {
    throw new Error('Worksheet not found in template');
  }
  
  // Calculate all benefits
  const benefits = calculateSeveranceBenefits(severanceData);
  
  // Format date helper (DD-MMM-YYYY format as seen in CSV)
  const formatDate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 
                        'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };
  
  // Format date for Excel (numeric date value)
  const formatDateForExcel = (date: Date): number => {
    // Excel stores dates as numbers (days since Jan 1, 1900)
    const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899
    const diffTime = date.getTime() - excelEpoch.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  const dailySalary = severanceData.dailySalary;
  const avgSalary = severanceData.averageMonthlySalary;
  const termDateStr = formatDate(severanceData.terminationDate);
  const startDateStr = formatDate(severanceData.startDate);
  
  // ===== BASIC EMPLOYEE INFORMATION =====
  // D3 = Employee name
  worksheet.getCell('D3').value = severanceData.employeeName;
  
  // I3 = DNI (User's ID)
  worksheet.getCell('I3').value = severanceData.dni || '';
  
  // I4 = Termination reason
  worksheet.getCell('I4').value = severanceData.terminationReason || 'Renuncia';
  
  // E5 = Starting date
  worksheet.getCell('E5').value = startDateStr;
  
  // E7 = Termination date
  worksheet.getCell('E7').value = termDateStr;
  
  // ===== ANTIGÜEDAD (SENIORITY) - Row 9 =====
  // C9 = Years
  worksheet.getCell('C9').value = severanceData.yearsOfService;
  // E9 = "AÑOS" (text, should already be in template)
  // G9 = Months
  worksheet.getCell('G9').value = severanceData.monthsOfService;
  // I9 = "MESES" (text, should already be in template)
  // For days, we need to check the template structure - likely in column K or similar
  // Based on CSV, it shows "4,DIAS" - let's use column K for days
  worksheet.getCell('K9').value = severanceData.daysOfService;
  
  // ===== SALARY INFORMATION =====
  // E11 = Current monthly salary (average)
  worksheet.getCell('E11').value = avgSalary;
  
  // E13 = Average monthly salary (duplicate)
  worksheet.getCell('E13').value = avgSalary;
  
  // I13 = Daily salary
  worksheet.getCell('I13').value = dailySalary;
  
  // ===== VACATION INFORMATION =====
  // C22 = Vacation days remaining
  worksheet.getCell('C22').value = severanceData.vacationDaysRemaining;
  
  // A25 = Last anniversary date
  worksheet.getCell('A25').value = formatDate(severanceData.lastAnniversaryDate);
  
  // A26 = Vacation entitlement (total days allowed according to seniority)
  worksheet.getCell('A26').value = severanceData.vacationDaysEntitlement;
  
  // B25 = Termination date (for vacation calculation period)
  worksheet.getCell('B25').value = termDateStr;
  
  // C26 = Days from anniversary to termination
  const daysFromAnniversary = Math.floor(
    (severanceData.terminationDate.getTime() - severanceData.lastAnniversaryDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  worksheet.getCell('C26').value = daysFromAnniversary;
  
  // ===== PREAVISO (NOTICE PAY) - Row 16 =====
  worksheet.getCell('C16').value = severanceData.noticeDays;
  worksheet.getCell('G16').value = benefits.noticePay;
  
  // ===== AUXILIO DE CESANTÍA (SEVERANCE PAY) - Row 19 =====
  const totalSeveranceDays = benefits.severancePay / dailySalary;
  worksheet.getCell('C19').value = totalSeveranceDays;
  worksheet.getCell('G19').value = benefits.severancePay;
  
  // ===== AUXILIO DE CESANTÍA PROPORCIONAL - Row 20 =====
  worksheet.getCell('C20').value = severanceData.proportionalSeveranceDays;
  worksheet.getCell('G20').value = benefits.proportionalSeverancePay;
  
  // ===== VACACIONES (VACATION PAY) - Row 23 =====
  worksheet.getCell('C23').value = severanceData.vacationDaysRemaining;
  worksheet.getCell('E23').value = severanceData.vacationDaysRemaining;
  worksheet.getCell('G23').value = benefits.vacationPay;
  
  // ===== VACACIONES PROPORCIONALES - Row 25 =====
  const proportionalVacationDays = benefits.proportionalVacationPay / dailySalary;
  worksheet.getCell('C25').value = proportionalVacationDays;
  worksheet.getCell('G25').value = benefits.proportionalVacationPay;
  
  // ===== DÉCIMO TERCER MES (13TH MONTH) - Row 28 =====
  worksheet.getCell('C28').value = severanceData.thirteenthMonthDays;
  worksheet.getCell('G28').value = benefits.thirteenthMonthPay;
  worksheet.getCell('A28').value = formatDate(severanceData.thirteenthMonthStartDate);
  worksheet.getCell('B28').value = termDateStr;
  
  // C29 = Days from Jan 1 to termination (365 days in year)
  const daysJan1ToTerm = Math.floor(
    (severanceData.terminationDate.getTime() - severanceData.thirteenthMonthStartDate.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;
  worksheet.getCell('C29').value = daysJan1ToTerm;
  
  // ===== DÉCIMO CUARTO MES (14TH MONTH) - Row 31 =====
  if (severanceData.fourteenthMonthDays > 0) {
    worksheet.getCell('C31').value = severanceData.fourteenthMonthDays;
    worksheet.getCell('G31').value = benefits.fourteenthMonthPay;
    worksheet.getCell('A31').value = formatDate(severanceData.fourteenthMonthStartDate);
    worksheet.getCell('B31').value = termDateStr;
    
    // C32 = Days from Jul 1 to termination
    const daysJul1ToTerm = Math.floor(
      (severanceData.terminationDate.getTime() - severanceData.fourteenthMonthStartDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;
    worksheet.getCell('C32').value = daysJul1ToTerm;
  } else {
    worksheet.getCell('C31').value = 0;
    worksheet.getCell('G31').value = 0;
  }
  
  // ===== TOTALS =====
  // G33 = Total benefits
  worksheet.getCell('G33').value = benefits.totalBenefits;
  
  // H35 = Prestaciones total
  worksheet.getCell('H35').value = benefits.totalBenefits;
  
  // B52 = Prestaciones AL [date]
  worksheet.getCell('B52').value = termDateStr;
  worksheet.getCell('H52').value = benefits.totalBenefits;
  
  // H55 = Total final
  worksheet.getCell('H55').value = benefits.totalBenefits;
  
  // ===== SALARY HISTORY (Last 6 months) - Rows 60-65 =====
  const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  
  severanceData.salaryHistory.forEach((salary, index) => {
    const row = 60 + index; // Rows 60-65
    worksheet.getCell(`A${row}`).value = salary.month.toLowerCase();
    worksheet.getCell(`B${row}`).value = salary.year;
    // Store as number for Excel formulas
    worksheet.getCell(`C${row}`).value = salary.amount;
  });
  
  // Row 66 = Sum of salaries
  const salarySum = severanceData.salaryHistory.reduce((sum, s) => sum + s.amount, 0);
  worksheet.getCell('C66').value = salarySum;
  
  // E66 = Average monthly salary
  worksheet.getCell('E66').value = avgSalary;
  
  return workbook;
}

/**
 * Get template path - tries multiple locations
 */
export function getTemplatePath(): string {
  // Try public directory first (for production) - new template name
  const publicPath = path.join(process.cwd(), 'public', 'severance-template.xlsx');
  if (fs.existsSync(publicPath)) {
    return publicPath;
  }
  
  // Try severance2 directory (new template location)
  const severance2Path = path.join(process.cwd(), '..', 'severance2', 'RRHH.xlsx');
  if (fs.existsSync(severance2Path)) {
    return severance2Path;
  }
  
  // Try absolute path from project root (severance2)
  const absoluteSeverance2Path = path.join(process.cwd(), 'severance2', 'RRHH.xlsx');
  if (fs.existsSync(absoluteSeverance2Path)) {
    return absoluteSeverance2Path;
  }
  
  // Try old severance directory (for backward compatibility)
  const severancePath = path.join(process.cwd(), '..', 'severance', 'severance.xlsx');
  if (fs.existsSync(severancePath)) {
    return severancePath;
  }
  
  // Try absolute path from project root (old location)
  const absolutePath = path.join(process.cwd(), 'severance', 'severance.xlsx');
  if (fs.existsSync(absolutePath)) {
    return absolutePath;
  }
  
  throw new Error('Severance template file not found. Please ensure severance-template.xlsx exists in the public directory or RRHH.xlsx exists in the severance2 directory.');
}

