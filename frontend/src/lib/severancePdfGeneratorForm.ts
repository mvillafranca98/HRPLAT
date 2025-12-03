/**
 * PDF Generation Utility for Severance Documents - Form-Based
 * Matches the RRHH.csv layout structure exactly with proper column spacing
 * Uses pdf-lib which doesn't require external font files
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface SeveranceFormData {
  employeeName: string;
  dni: string;
  terminationReason: string;
  startDate: string;
  terminationDate: string;
  lastAnniversaryDate: string;
  vacationDaysRemaining: number;
  vacationDaysEntitlement: number;
  salaryHistory: Array<{
    month: string;
    year: number;
    amount: number;
    overtime?: number;
  }>;
  preavisoDays: number;
  cesantiaDays: number;
  cesantiaProportionalDays: number;
  vacationBonusDays: number;
  vacationProportionalDays: number;
  thirteenthMonthDays: number;
  thirteenthMonthStartDate: string;
  fourteenthMonthDays: number;
  fourteenthMonthStartDate: string;
  salariesDue: number;
  overtimeDue: number;
  otherPayments: number;
  seventhDayPayment: number;
  wageAdjustment: number;
  educationalBonus: number;
  municipalTax: number;
  preavisoPenalty: number;
}

/**
 * Format date helper (DD-MMM-YYYY format)
 */
function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  const day = String(date.getDate()).padStart(2, '0');
  const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 
                      'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Format currency (L. X,XXX.XX)
 */
function formatCurrency(amount: number): string {
  if (amount === 0) return '  -   ';
  return `L. ${amount.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Mask DNI (0501-2000-09664)
 */
function maskDNI(dni: string): string {
  if (!dni) return '';
  const cleaned = dni.replace(/\D/g, '');
  if (cleaned.length !== 13) return dni;
  return `${cleaned.substring(0, 4)}-${cleaned.substring(4, 8)}-${cleaned.substring(8, 13)}`;
}

/**
 * Calculate service period (years, months, days)
 */
function calculateServicePeriod(startDate: string, endDate: string): { years: number; months: number; days: number; totalDays: number } {
  if (!startDate || !endDate) return { years: 0, months: 0, days: 0, totalDays: 0 };
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { years: 0, months: 0, days: 0, totalDays: 0 };
  }
  
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();
  
  if (days < 0) {
    months--;
    const lastMonth = new Date(end.getFullYear(), end.getMonth(), 0);
    days += lastMonth.getDate();
  }
  
  if (months < 0) {
    years--;
    months += 12;
  }
  
  return { years, months, days, totalDays };
}

/**
 * Calculate salary averages
 */
function calculateSalaryAverages(salaryHistory: Array<{ amount: number; overtime?: number }>) {
  if (!salaryHistory || salaryHistory.length === 0) {
    return {
      baseMonthly: 0,
      baseAverage: 0,
      basePromAverage: 0,
      promAverage: 0, // Sueldo mensual promedio = (sueldo mensual ordinario * 14) / 12
      baseDaily: 0,
      promDaily: 0, // Sueldo diario promedio = sueldo mensual promedio / 30
      total: 0,
    };
  }
  
  const salaries = salaryHistory.map(s => s.amount);
  const withOvertime = salaryHistory.map(s => (s.amount || 0) + (s.overtime || 0));
  
  const total = salaries.reduce((sum, s) => sum + s, 0);
  const baseAverage = total / salaries.length;
  
  const totalWithOvertime = withOvertime.reduce((sum, s) => sum + s, 0);
  const basePromAverage = totalWithOvertime / withOvertime.length;
  
  // Sueldo mensual ordinario (last salary or average)
  const baseMonthly = salaries[salaries.length - 1] || baseAverage;
  
  // Sueldo mensual promedio = (sueldo mensual ordinario * 14) / 12
  const promAverage = (baseMonthly * 14) / 12;
  
  // Sueldo diario promedio = sueldo mensual promedio / 30
  const promDaily = promAverage / 30;
  
  const baseDaily = baseAverage / 30;
  
  return {
    baseMonthly,
    baseAverage,
    basePromAverage,
    promAverage,
    baseDaily,
    promDaily,
    total,
  };
}

/**
 * Generate PDF that matches RRHH.csv layout
 */
export async function generateSeverancePDFFromForm(
  formData: SeveranceFormData
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  let currentPage = pdfDoc.addPage([612, 792]); // LETTER size
  const { width, height } = currentPage.getSize();
  
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const margin = 50;
  const lineHeight = 14; // Increased from 12 to 14 for better row separation
  const sectionSpacing = 8; // Extra spacing between sections
  let yPosition = height - margin;
  
  // Define precise column positions based on CSV structure
  // Using fixed positions with wider spacing to prevent overlap
  // LETTER width = 612pt, so we distribute columns across this width
  const cols = {
    A: 50,          // Column A - Labels (50pt from left)
    B: 85,          // Column B - Small offset values
    C: 120,         // Column C - Small values
    D: 180,         // Column D - Main values (wider spacing)
    E: 280,         // Column E - Secondary values
    F: 380,         // Column F - "Días" label (wide spacing)
    G: 410,         // Column G - "x" symbol
    H: 450,         // Column H - Daily salary (wider spacing)
    I: 510,         // Column I - Payment amounts (right side, wider spacing)
    J: 570,         // Column J - Rightmost (42pt from right edge = 612 - 570)
  };
  
  // Helper function to draw text with max width to prevent overflow
  const drawText = (text: string, x: number, y: number, size: number = 10, bold: boolean = false, maxWidth?: number) => {
    if (y < margin) {
      currentPage = pdfDoc.addPage([612, 792]);
      yPosition = height - margin;
      y = yPosition;
    }
    
    let displayText = text;
    if (maxWidth) {
      const font = bold ? helveticaBoldFont : helveticaFont;
      let textWidth = font.widthOfTextAtSize(text, size);
      if (textWidth > maxWidth) {
        // Truncate text if too long
        let truncated = text;
        while (textWidth > maxWidth && truncated.length > 0) {
          truncated = truncated.slice(0, -1);
          textWidth = font.widthOfTextAtSize(truncated + '...', size);
        }
        displayText = truncated + '...';
      }
    }
    
    currentPage.drawText(displayText, {
      x,
      y,
      size,
      font: bold ? helveticaBoldFont : helveticaFont,
      color: rgb(0, 0, 0),
    });
  };
  
  // Helper function to draw right-aligned text with max width
  const drawTextRight = (text: string, x: number, y: number, size: number = 10, bold: boolean = false, maxWidth?: number) => {
    if (y < margin) {
      currentPage = pdfDoc.addPage([612, 792]);
      yPosition = height - margin;
      y = yPosition;
    }
    
    const font = bold ? helveticaBoldFont : helveticaFont;
    let displayText = text;
    let textWidth = font.widthOfTextAtSize(text, size);
    
    if (maxWidth && textWidth > maxWidth) {
      // Truncate text if too long
      let truncated = text;
      while (textWidth > maxWidth && truncated.length > 0) {
        truncated = truncated.slice(0, -1);
        textWidth = font.widthOfTextAtSize(truncated + '...', size);
      }
      displayText = truncated + '...';
      textWidth = font.widthOfTextAtSize(displayText, size);
    }
    
    currentPage.drawText(displayText, {
      x: Math.max(0, x - textWidth),
      y,
      size,
      font,
      color: rgb(0, 0, 0),
    });
  };
  
  // Helper function to draw horizontal line separator
  const drawHorizontalLine = (y: number, startX: number = margin, endX: number = width - margin) => {
    if (y < margin) {
      currentPage = pdfDoc.addPage([612, 792]);
      yPosition = height - margin;
      y = yPosition;
    }
    
    currentPage.drawLine({
      start: { x: startX, y },
      end: { x: endX, y },
      thickness: 0.5,
      color: rgb(0, 0, 0),
    });
  };
  
  // Helper function to move to next row with proper spacing
  const nextRow = (extraSpacing: number = 0) => {
    yPosition -= lineHeight + extraSpacing;
  };
  
  // Helper function to format number with padding for display
  const formatPadded = (num: number, decimals: number = 2): string => {
    if (num === 0) return '  0,00 ';
    // Round first to ensure proper 2 decimal display
    const rounded = roundTo2Decimals(num);
    return rounded.toFixed(decimals).replace('.', ',').padStart(8, ' ');
  };
  
  // Calculate derived values
  const servicePeriod = calculateServicePeriod(formData.startDate, formData.terminationDate);
  const salaryAvgs = calculateSalaryAverages(formData.salaryHistory);
  
  // Helper function to round to 2 decimal places (banker's rounding for precision)
  const roundTo2Decimals = (num: number): number => {
    // Use toFixed(2) and parseFloat to handle floating point precision issues
    return Math.round((num + Number.EPSILON) * 100) / 100;
  };
  
  // Helper function to round currency to 2 decimal places (for payments)
  const roundCurrency = (num: number): number => {
    // Ensure proper rounding for currency amounts
    return parseFloat(num.toFixed(2));
  };
  
  // Calculate benefits (round all currency amounts)
  const preavisoPay = roundCurrency(formData.preavisoDays * salaryAvgs.promDaily);
  const cesantiaPay = roundCurrency(formData.cesantiaDays * salaryAvgs.promDaily);
  const cesantiaProPay = roundCurrency(formData.cesantiaProportionalDays * salaryAvgs.promDaily);
  const vacationPay = roundCurrency(formData.vacationDaysRemaining * salaryAvgs.promDaily);
  const vacationBonusPay = roundCurrency(formData.vacationBonusDays * salaryAvgs.promDaily);
  
  // For these three, use days/12 for payment calculation (proportional to months)
  // Calculate days first, then round to 2 decimals for display
  const vacationProDays = roundTo2Decimals(formData.vacationProportionalDays / 12);
  // For payment, use the rounded days value and round the final result
  const vacationProPay = roundCurrency(vacationProDays * salaryAvgs.promDaily);
  
  const thirteenthDays = roundTo2Decimals(formData.thirteenthMonthDays / 12);
  const thirteenthPay = roundCurrency(thirteenthDays * salaryAvgs.baseDaily);
  
  const fourteenthDays = roundTo2Decimals(formData.fourteenthMonthDays / 12);
  const fourteenthPay = roundCurrency(fourteenthDays * salaryAvgs.baseDaily);
  
  const totalBenefits = preavisoPay + cesantiaPay + cesantiaProPay + vacationPay + vacationBonusPay + 
                        vacationProPay + thirteenthPay + fourteenthPay + formData.salariesDue + 
                        formData.overtimeDue + formData.otherPayments + formData.seventhDayPayment + 
                        formData.wageAdjustment + formData.educationalBonus;
  
  const totalDeductions = formData.municipalTax + formData.preavisoPenalty;
  const finalTotal = totalBenefits - totalDeductions;
  
  // Row 1: Title
  const titleText = 'CALCULO DE PRESTACIONES LABORALES';
  const titleWidth = helveticaBoldFont.widthOfTextAtSize(titleText, 14);
  drawText(titleText, (width - titleWidth) / 2, yPosition, 14, true);
  nextRow(sectionSpacing);
  nextRow(sectionSpacing);
  
  // Row 3: Employee name and DNI
  drawText('EMPLEADO', cols.A, yPosition, 10, false);
  drawText(formData.employeeName || '', cols.D, yPosition, 10, false);
  drawText('No. Identidad', cols.I - 40, yPosition, 10, false);
  drawText(maskDNI(formData.dni || ''), cols.I + 10, yPosition, 10, false);
  nextRow(sectionSpacing);
  
  // Row 4: Termination reason
  drawText('Motivo', cols.I - 40, yPosition, 10, false);
  drawText(formData.terminationReason || '', cols.I + 10, yPosition, 10, false);
  nextRow(sectionSpacing);
  nextRow(sectionSpacing);
  
  // Row 5: Start date
  drawText('FECHA DE INGRESO', cols.A, yPosition, 10, false);
  drawText(formatDate(formData.startDate), cols.D, yPosition, 10, false);
  nextRow(sectionSpacing);
  nextRow(sectionSpacing);
  
  // Row 7: Termination date
  drawText('FECHA DE RETIRO', cols.A, yPosition, 10, false);
  drawText(formatDate(formData.terminationDate), cols.D, yPosition, 10, false);
  nextRow(sectionSpacing);
  nextRow(sectionSpacing);
  
  // Row 9: Seniority
  drawText('ANTIGÜEDAD', cols.A, yPosition, 10, false);
  drawText(String(servicePeriod.years), cols.D, yPosition, 10, false);
  drawText('AÑOS', cols.D + 25, yPosition, 10, false);
  drawText(String(servicePeriod.months), cols.D + 70, yPosition, 10, false);
  drawText('MESES', cols.D + 105, yPosition, 10, false);
  drawText(String(servicePeriod.days), cols.D + 155, yPosition, 10, false);
  drawText('DIAS', cols.D + 195, yPosition, 10, false);
  nextRow(sectionSpacing);
  nextRow(sectionSpacing);
  
  // Row 11: Monthly salary
  drawText('SUELDO MENSUAL ORDINARIO', cols.A, yPosition, 10, false);
  drawText('Lps', cols.D, yPosition, 10, false);
  const baseMonthlyStr = formatCurrency(salaryAvgs.baseMonthly).replace('L. ', '');
  drawTextRight(baseMonthlyStr, cols.E + 20, yPosition, 10, false);
  const baseAvgStr = formatCurrency(salaryAvgs.baseAverage).replace('L. ', '');
  drawTextRight(baseAvgStr, cols.I - 10, yPosition, 10, false);
  const promAvgStr = formatCurrency(salaryAvgs.promAverage).replace('L. ', '');
  drawTextRight(promAvgStr, cols.J - 40, yPosition, 10, false);
  drawTextRight(promAvgStr, cols.J, yPosition, 10, false);
  nextRow(sectionSpacing);
  
  // Row 12: Empty row with labels
  drawText('Promedio', cols.E - 20, yPosition, 9, false);
  drawText('TOTAL', cols.I - 40, yPosition, 9, false);
  drawText('TOTAL', cols.J - 40, yPosition, 9, false);
  drawText('Prom. Dia', cols.J - 10, yPosition, 9, false);
  nextRow(sectionSpacing);
  
  // Row 13: Average monthly salary
  drawText('SUELDO MENSUAL PROMEDIO', cols.A, yPosition, 10, false);
  drawText('Lps', cols.D, yPosition, 10, false);
  drawTextRight(promAvgStr, cols.E + 20, yPosition, 10, false);
  const baseDailyStr = formatCurrency(salaryAvgs.baseDaily).replace('L. ', '');
  drawTextRight(baseDailyStr, cols.H + 30, yPosition, 10, false);
  const promDailyStr = formatCurrency(salaryAvgs.promDaily).replace('L. ', '');
  drawTextRight(promDailyStr, cols.J - 40, yPosition, 10, false);
  drawTextRight(promDailyStr, cols.J, yPosition, 10, false);
  nextRow(sectionSpacing);
  nextRow(sectionSpacing);
  
  // Row 15: CALCULO
  drawText('CALCULO', cols.A, yPosition, 10, false);
  nextRow(sectionSpacing);
  nextRow(sectionSpacing);
  
  // Benefits section with proper column alignment and row separation
  // Preaviso
  drawText('PREAVISO', cols.A, yPosition, 10, false);
  drawText(formatPadded(formData.preavisoDays, 2), cols.D, yPosition, 10, false);
  drawText('Días', cols.F, yPosition, 10, false);
  drawText('x', cols.G, yPosition, 10, false);
  drawTextRight(promDailyStr, cols.H + 20, yPosition, 10, false);
  const preavisoPayStr = formatCurrency(preavisoPay).replace('L. ', '');
  drawTextRight(preavisoPayStr, cols.J, yPosition, 10, false);
  nextRow(sectionSpacing);
  nextRow(sectionSpacing);
  
  // Cesantia
  drawText('AUXILIO DE CESANTIA', cols.A, yPosition, 10, false);
  drawText(formatPadded(formData.cesantiaDays, 2), cols.D, yPosition, 10, false);
  drawText('Días', cols.F, yPosition, 10, false);
  drawText('x', cols.G, yPosition, 10, false);
  drawTextRight(promDailyStr, cols.H + 20, yPosition, 10, false);
  const cesantiaPayStr = formatCurrency(cesantiaPay).replace('L. ', '');
  drawTextRight(cesantiaPayStr || '  -   ', cols.J, yPosition, 10, false);
  nextRow(sectionSpacing);
  
  // Cesantia Proportional
  drawText('AUXILIO DE CESANTIA PROPORCIONAL', cols.A, yPosition, 10, false);
  drawText(formatPadded(formData.cesantiaProportionalDays, 2), cols.D, yPosition, 10, false);
  drawText('Días', cols.F, yPosition, 10, false);
  drawText('x', cols.G, yPosition, 10, false);
  drawTextRight(promDailyStr, cols.H + 20, yPosition, 10, false);
  const cesantiaProPayStr = formatCurrency(cesantiaProPay).replace('L. ', '');
  drawTextRight(cesantiaProPayStr || '  -   ', cols.J, yPosition, 10, false);
  nextRow(sectionSpacing);
  nextRow(sectionSpacing);
  
  // Vacations
  drawText('VACACIONES', cols.A, yPosition, 10, false);
  drawText(formatPadded(formData.vacationDaysRemaining, 2), cols.C, yPosition, 10, false);
  drawText(formatPadded(formData.vacationDaysRemaining, 2), cols.D, yPosition, 10, false);
  drawText('Días', cols.F, yPosition, 10, false);
  drawText('x', cols.G, yPosition, 10, false);
  drawTextRight(promDailyStr, cols.H + 20, yPosition, 10, false);
  const vacationPayStr = formatCurrency(vacationPay).replace('L. ', '');
  drawTextRight(vacationPayStr, cols.J, yPosition, 10, false);
  nextRow(sectionSpacing);
  nextRow(sectionSpacing);
  
  // Vacation Proportional
  drawText('VACACIONES PROPORCIONALES', cols.A, yPosition, 10, false);
  drawText(formatPadded(vacationProDays, 2), cols.D, yPosition, 10, false);
  drawText('Días', cols.F, yPosition, 10, false);
  drawText('x', cols.G, yPosition, 10, false);
  drawTextRight(promDailyStr, cols.H + 20, yPosition, 10, false);
  const vacationProPayStr = formatCurrency(vacationProPay).replace('L. ', '');
  drawTextRight(vacationProPayStr, cols.J, yPosition, 10, false);
  nextRow(sectionSpacing);
  
  // Last anniversary and entitlement
  if (formData.lastAnniversaryDate) {
    drawText(formatDate(formData.lastAnniversaryDate), cols.A, yPosition, 10, false);
    drawText(formatDate(formData.terminationDate), cols.C + 20, yPosition, 10, false);
    nextRow(sectionSpacing);
    drawText(String(formData.vacationDaysEntitlement), cols.B, yPosition, 10, false);
    nextRow(sectionSpacing);
  }
  
  // 13th Month
  drawText('DECIMO TERCER MES', cols.A, yPosition, 10, false);
  drawText(formatPadded(thirteenthDays, 2), cols.D, yPosition, 10, false);
  drawText('Días', cols.F, yPosition, 10, false);
  drawText('x', cols.G, yPosition, 10, false);
  drawTextRight(baseDailyStr, cols.H + 20, yPosition, 10, false);
  const thirteenthPayStr = formatCurrency(thirteenthPay).replace('L. ', '');
  drawTextRight(thirteenthPayStr, cols.J, yPosition, 10, false);
  nextRow(sectionSpacing);
  
  if (formData.thirteenthMonthStartDate) {
    const startDate = formData.thirteenthMonthStartDate.split('-');
    drawText(`${startDate[2]}/${startDate[1]}/${startDate[0]}`, cols.A, yPosition, 10, false);
    drawText(formatDate(formData.terminationDate), cols.C + 20, yPosition, 10, false);
    nextRow(sectionSpacing);
  }
  
  // 14th Month
  nextRow(sectionSpacing);
  drawText('DECIMO CUARTO MES', cols.A, yPosition, 10, false);
  drawText(formatPadded(fourteenthDays, 2), cols.D, yPosition, 10, false);
  drawText('Días', cols.F, yPosition, 10, false);
  drawText('x', cols.G, yPosition, 10, false);
  drawTextRight(baseDailyStr, cols.H + 20, yPosition, 10, false);
  const fourteenthPayStr = formatCurrency(fourteenthPay).replace('L. ', '');
  drawTextRight(fourteenthPayStr, cols.J, yPosition, 10, false);
  nextRow(sectionSpacing);
  
  if (formData.fourteenthMonthStartDate) {
    drawText(formatDate(formData.fourteenthMonthStartDate), cols.A, yPosition, 10, false);
    drawText(formatDate(formData.terminationDate), cols.C + 20, yPosition, 10, false);
    nextRow(sectionSpacing);
  }
  
  // Total Benefits
  nextRow(sectionSpacing);
  const totalBenefitsStr = formatCurrency(totalBenefits).replace('L. ', '');
  drawTextRight(totalBenefitsStr, cols.J, yPosition, 10, true);
  nextRow(sectionSpacing);
  nextRow(sectionSpacing);
  
  // PRESTACIONES row
  drawText('PRESTACIONES', cols.A, yPosition, 10, false);
  drawText('Lps', cols.I, yPosition, 10, false);
  drawTextRight(totalBenefitsStr, cols.J, yPosition, 10, false);
  nextRow(sectionSpacing);
  nextRow(sectionSpacing);
  
  // A FAVOR section (if needed)
  drawText('A FAVOR', cols.A, yPosition, 10, false);
  drawText('N/A', cols.B, yPosition, 10, false);
  drawTextRight('0,00', cols.J, yPosition, 10, false);
  nextRow(sectionSpacing);
  nextRow(sectionSpacing);
  
  // Additional Payments Section
  drawText('Salarios Adeudados(LPS):', cols.A, yPosition, 10, false);
  const salariesDueStr = formatCurrency(formData.salariesDue).replace('L. ', '');
  drawTextRight(salariesDueStr || '  -   ', cols.J, yPosition, 10, false);
  nextRow(sectionSpacing);
  
  drawText('Vacaciones Pendientes(Dias):', cols.A, yPosition, 10, false);
  drawTextRight(String(formData.vacationDaysRemaining), cols.J, yPosition, 10, false);
  nextRow(sectionSpacing);
  
  drawText('Otros Pagos(LPS):', cols.A, yPosition, 10, false);
  const otherPaymentsStr = formatCurrency(formData.otherPayments).replace('L. ', '');
  drawTextRight(otherPaymentsStr || '  -   ', cols.J, yPosition, 10, false);
  nextRow(sectionSpacing);
  
  drawText('Pago HE Pendiente(LPS):', cols.A, yPosition, 10, false);
  const overtimeDueStr = formatCurrency(formData.overtimeDue).replace('L. ', '');
  drawTextRight(overtimeDueStr || '  -   ', cols.J, yPosition, 10, false);
  nextRow(sectionSpacing);
  
  // Deductions
  nextRow(sectionSpacing);
  nextRow(sectionSpacing);
  drawText('DEDUCCIONES', cols.A, yPosition, 10, true);
  nextRow(sectionSpacing);
  
  if (formData.municipalTax > 0) {
    drawText('Impuesto vecinal', cols.B, yPosition, 10, false);
    const municipalTaxStr = formatCurrency(formData.municipalTax).replace('L. ', '');
    drawTextRight(municipalTaxStr, cols.J, yPosition, 10, false);
    nextRow(sectionSpacing);
  }
  
  if (formData.preavisoPenalty > 0) {
    drawText('Penalización por incumplimiento de preaviso', cols.B, yPosition, 10, false);
    const penaltyStr = formatCurrency(formData.preavisoPenalty).replace('L. ', '');
    drawTextRight(penaltyStr, cols.J, yPosition, 10, false);
    nextRow(sectionSpacing);
  }
  
  // Summary
  nextRow(sectionSpacing);
  nextRow(sectionSpacing);
  drawText('RESUMEN', cols.A, yPosition, 10, true);
  nextRow(sectionSpacing);
  nextRow(sectionSpacing);
  
  drawText('PRESTACIONES AL', cols.A, yPosition, 10, false);
  drawText(formatDate(formData.terminationDate), cols.C + 20, yPosition, 10, false);
  drawText('Lps', cols.I, yPosition, 10, false);
  const finalTotalStr = formatCurrency(finalTotal).replace('L. ', '');
  drawTextRight(finalTotalStr, cols.J, yPosition, 10, true);
  nextRow(sectionSpacing);
  nextRow(sectionSpacing);
  
  drawTextRight('TOTAL', cols.I + 10, yPosition, 10, true);
  drawText('Lps', cols.I + 30, yPosition, 10, true);
  nextRow(sectionSpacing);
  drawTextRight(finalTotalStr, cols.J, yPosition, 10, true);
  
  // Salary History Section (if we have space, otherwise new page)
  if (yPosition < 200) {
    currentPage = pdfDoc.addPage([612, 792]);
    yPosition = height - margin;
  } else {
    yPosition -= lineHeight * 3;
  }
  
  drawText('SALARIO MENSUAL:', cols.A, yPosition, 10, true);
  drawText('INGRESOS ADICIONALES (Horas Extras):', width / 2, yPosition, 10, true);
  yPosition -= lineHeight;
  
  formData.salaryHistory.forEach(salary => {
    drawText(salary.month, cols.A, yPosition, 10, false);
    drawText(String(salary.year), cols.A + 70, yPosition, 10, false);
    const salaryStr = formatCurrency(salary.amount).replace('L. ', '');
    drawTextRight(salaryStr, cols.E, yPosition, 10, false);
    
    drawText(salary.month, width / 2, yPosition, 10, false);
    drawText(String(salary.year), width / 2 + 70, yPosition, 10, false);
    const overtimeStr = formatCurrency(salary.overtime || 0).replace('L. ', '');
    drawTextRight(overtimeStr || '  -   ', width / 2 + 150, yPosition, 10, false);
    yPosition -= lineHeight;
  });
  
  // Totals for salary history
  const salaryTotal = formData.salaryHistory.reduce((sum, s) => sum + s.amount, 0);
  const salaryAvg = salaryTotal / (formData.salaryHistory.length || 1);
  const overtimeTotal = formData.salaryHistory.reduce((sum, s) => sum + (s.overtime || 0), 0);
  
  drawText('Suman', cols.A, yPosition, 10, false);
  const salaryTotalStr = formatCurrency(salaryTotal).replace('L. ', '');
  drawTextRight(salaryTotalStr, cols.E, yPosition, 10, false);
  const salaryAvgStr = formatCurrency(salaryAvg).replace('L. ', '');
  drawTextRight(salaryAvgStr, cols.E + 50, yPosition, 10, false);
  drawText('Suman', width / 2, yPosition, 10, false);
  const overtimeTotalStr = formatCurrency(overtimeTotal).replace('L. ', '');
  drawTextRight(overtimeTotalStr || '  -   ', width / 2 + 150, yPosition, 10, false);
  
  // Footer
  yPosition = margin + 40;
  drawText('ELABORADO POR:', cols.A, yPosition, 10, false);
  drawText('REVISADO POR:', width / 2 - 50, yPosition, 10, false);
  drawText('RECIBE', cols.I, yPosition, 10, false);
  
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export function getPdfFilename(formData: SeveranceFormData): string {
  const date = formData.terminationDate ? formatDate(formData.terminationDate).replace(/\s/g, '_') : 'prestaciones';
  const dni = formData.dni ? formData.dni.replace(/\D/g, '') : 'unknown';
  return `prestaciones_${dni}_${date}.pdf`;
}
