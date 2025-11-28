/**
 * Excel Generation Utility for Severance Documents
 * Populates the Excel template with calculated severance data
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
  
  // Format date helper
  const formatDate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };
  
  // Store numbers in Excel (Excel will format them based on cell formatting)
  // For display purposes, we can format as strings in certain cells
  
  // Populate employee information
  // B3 - Employee name
  worksheet.getCell('B3').value = severanceData.employeeName;
  worksheet.getCell('D3').value = severanceData.employeeName;
  
  // I3 - DNI number
  worksheet.getCell('I3').value = severanceData.dni || '';
  
  // I4 - Termination reason
  worksheet.getCell('I4').value = severanceData.terminationReason || 'Renuncia';
  
  // B5/E5 - Start date
  const startDateStr = formatDate(severanceData.startDate);
  worksheet.getCell('B5').value = startDateStr;
  worksheet.getCell('E5').value = startDateStr;
  
  // B6/E7 - Termination date
  const termDateStr = formatDate(severanceData.terminationDate);
  worksheet.getCell('B6').value = termDateStr;
  worksheet.getCell('E7').value = termDateStr;
  
  // B8, D8, F8 - Years, months, days of service
  worksheet.getCell('B8').value = severanceData.yearsOfService;
  worksheet.getCell('D8').value = severanceData.monthsOfService;
  worksheet.getCell('F8').value = severanceData.daysOfService;
  
  // C17 - Total days worked (30 days per month)
  worksheet.getCell('C17').value = severanceData.totalDaysWorked;
  
  // D16 - Notice days (Preaviso) - typically 30 days
  worksheet.getCell('D16').value = severanceData.noticeDays;
  
  // Salary information
  // Average monthly salary (appears in multiple places)
  const avgSalary = severanceData.averageMonthlySalary;
  worksheet.getCell('E11').value = avgSalary;
  worksheet.getCell('E13').value = avgSalary;
  
  // Daily salary
  const dailySalary = severanceData.dailySalary;
  worksheet.getCell('I13').value = dailySalary;
  
  // C54-C59 - Salary history (last 6 months, oldest to newest)
  const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  
  severanceData.salaryHistory.forEach((salary, index) => {
    const row = 54 + index; // C54, C55, C56, C57, C58, C59
    worksheet.getCell(`A${row}`).value = salary.month.toLowerCase();
    worksheet.getCell(`B${row}`).value = salary.year;
    worksheet.getCell(`C${row}`).value = salary.amount.toLocaleString('es-HN', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  });
  
  // Calculate sum of last 6 months salary (row 66)
  const salarySum = severanceData.salaryHistory.reduce((sum, s) => sum + s.amount, 0);
  worksheet.getCell('C66').value = salarySum.toLocaleString('es-HN', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
  
  // Average salary (row 66, column E)
  worksheet.getCell('E66').value = avgSalary.toLocaleString('es-HN', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
  
  // Vacation information
  // C22 - Vacation days remaining for this year
  worksheet.getCell('C22').value = severanceData.vacationDaysRemaining;
  
  // A25 - Last anniversary date
  worksheet.getCell('A25').value = formatDate(severanceData.lastAnniversaryDate);
  
  // A26 - Vacation days remaining since last anniversary
  worksheet.getCell('A26').value = severanceData.vacationDaysRemaining;
  
  // B25 - Termination date (duplicate)
  worksheet.getCell('B25').value = termDateStr;
  
  // Calculate days from anniversary to termination (row 26, column C)
  const daysFromAnniversary = Math.floor(
    (severanceData.terminationDate.getTime() - severanceData.lastAnniversaryDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  worksheet.getCell('C26').value = daysFromAnniversary;
  
  // Vacation entitlement (row 27, appears as "15")
  worksheet.getCell('A27').value = severanceData.vacationDaysEntitlement;
  
  // Preaviso (Notice Pay) - Row 16
  worksheet.getCell('C16').value = severanceData.noticeDays;
  worksheet.getCell('G16').value = benefits.noticePay;
  
  // Auxilio de Cesantía (Severance Pay) - Row 19
  const totalSeveranceDays = benefits.severancePay / dailySalary;
  worksheet.getCell('C19').value = totalSeveranceDays;
  worksheet.getCell('G19').value = benefits.severancePay;
  
  // Auxilio de Cesantía Proporcional - Row 20
  worksheet.getCell('C20').value = severanceData.proportionalSeveranceDays;
  worksheet.getCell('G20').value = benefits.proportionalSeverancePay;
  
  // Vacaciones (Vacation Pay) - Row 23
  worksheet.getCell('C23').value = severanceData.vacationDaysRemaining;
  worksheet.getCell('E23').value = severanceData.vacationDaysRemaining;
  worksheet.getCell('G23').value = benefits.vacationPay;
  
  // Vacaciones Proporcionales (Proportional Vacation Pay) - Row 25
  const proportionalVacationDays = benefits.proportionalVacationPay / dailySalary;
  worksheet.getCell('C25').value = proportionalVacationDays;
  worksheet.getCell('G25').value = benefits.proportionalVacationPay;
  
  // Décimo Tercer Mes (13th Month) - Row 28
  worksheet.getCell('C28').value = severanceData.thirteenthMonthDays;
  worksheet.getCell('G28').value = benefits.thirteenthMonthPay;
  worksheet.getCell('A28').value = formatDate(severanceData.thirteenthMonthStartDate);
  worksheet.getCell('B28').value = termDateStr;
  
  // Calculate days from Jan 1 to termination (row 29)
  const daysJan1ToTerm = Math.floor(
    (severanceData.terminationDate.getTime() - severanceData.thirteenthMonthStartDate.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;
  worksheet.getCell('C29').value = daysJan1ToTerm;
  
  // Décimo Cuarto Mes (14th Month) - Row 31
  if (severanceData.fourteenthMonthDays > 0) {
    worksheet.getCell('C31').value = severanceData.fourteenthMonthDays;
    worksheet.getCell('G31').value = benefits.fourteenthMonthPay;
    worksheet.getCell('A31').value = formatDate(severanceData.fourteenthMonthStartDate);
    worksheet.getCell('B31').value = termDateStr;
    
    // Calculate days from Jul 1 to termination (row 32)
    const daysJul1ToTerm = Math.floor(
      (severanceData.terminationDate.getTime() - severanceData.fourteenthMonthStartDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;
    worksheet.getCell('C32').value = daysJul1ToTerm;
  } else {
    worksheet.getCell('C31').value = 0;
    worksheet.getCell('G31').value = 0;
  }
  
  // TOTAL - Row 33
  worksheet.getCell('G33').value = benefits.totalBenefits;
  
  // PRESTACIONES - Row 35
  worksheet.getCell('H35').value = benefits.totalBenefits;
  
  // PRESTACIONES AL [date] - Row 52
  worksheet.getCell('B52').value = termDateStr;
  worksheet.getCell('H52').value = benefits.totalBenefits;
  
  // TOTAL - Row 55
  worksheet.getCell('H55').value = benefits.totalBenefits;
  
  return workbook;
}

/**
 * Get template path - tries multiple locations
 */
export function getTemplatePath(): string {
  // Try public directory first (for production)
  const publicPath = path.join(process.cwd(), 'public', 'severance-template.xlsx');
  if (fs.existsSync(publicPath)) {
    return publicPath;
  }
  
  // Try severance directory (for development)
  const severancePath = path.join(process.cwd(), '..', 'severance', 'severance.xlsx');
  if (fs.existsSync(severancePath)) {
    return severancePath;
  }
  
  // Try absolute path from project root
  const absolutePath = path.join(process.cwd(), 'severance', 'severance.xlsx');
  if (fs.existsSync(absolutePath)) {
    return absolutePath;
  }
  
  throw new Error('Severance template file not found. Please ensure severance-template.xlsx exists in the public directory.');
}

