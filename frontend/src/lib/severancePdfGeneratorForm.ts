/**
 * PDF Generation Utility for Severance Documents - Form-Based
 * Clean, readable layout with proper spacing and alignment
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
  cumulativeVacationEntitlement: number;
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
  
  const parseLocalDate = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day); 
  };
  
  const date = parseLocalDate(dateString);
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
      promAverage: 0,
      baseDaily: 0,
      promDaily: 0,
      total: 0,
    };
  }
  
  const salaries = salaryHistory.map(s => s.amount);
  const withOvertime = salaryHistory.map(s => (s.amount || 0) + (s.overtime || 0));
  
  const total = salaries.reduce((sum, s) => sum + s, 0);
  const baseAverage = total / salaries.length;
  
  const totalWithOvertime = withOvertime.reduce((sum, s) => sum + s, 0);
  const basePromAverage = totalWithOvertime / withOvertime.length;
  
  const baseMonthly = salaries[salaries.length - 1] || baseAverage;
  const promAverage = (baseMonthly * 14) / 12;
  const promDaily = promAverage / 30;
  const baseDaily = baseMonthly / 30; // Use baseMonthly, not baseAverage
  
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
 * Generate PDF with clean, readable layout
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
  const lineHeight = 16;
  const sectionSpacing = 6;
  const tableLineHeight = 18;
  let yPosition = height - margin;
  
  // Clean column definitions - wider spacing to prevent overlap
  const cols = {
    label: 50,          // Labels (description column)
    value: 200,         // Values (dates, names, etc.)
    days: 320,          // Days column
    multiplier: 345,    // "x" symbol
    rate: 365,          // Rate (daily salary)
    amount: 500,        // Amount (payment)
  };
  
  // Helper function to draw text with overflow handling
  const drawText = (text: string, x: number, y: number, size: number = 10, bold: boolean = false, maxWidth?: number) => {
    if (y < margin + 20) {
      currentPage = pdfDoc.addPage([612, 792]);
      yPosition = height - margin;
      y = yPosition;
    }
    
    let displayText = text || '';
    if (maxWidth) {
      const font = bold ? helveticaBoldFont : helveticaFont;
      let textWidth = font.widthOfTextAtSize(displayText, size);
      if (textWidth > maxWidth) {
        let truncated = displayText;
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
  
  // Helper function to draw right-aligned text
  const drawTextRight = (text: string, x: number, y: number, size: number = 10, bold: boolean = false) => {
    if (y < margin + 20) {
      currentPage = pdfDoc.addPage([612, 792]);
      yPosition = height - margin;
      y = yPosition;
    }
    
    const font = bold ? helveticaBoldFont : helveticaFont;
    const displayText = text || '';
    const textWidth = font.widthOfTextAtSize(displayText, size);
    
    currentPage.drawText(displayText, {
      x: Math.max(0, x - textWidth),
      y,
      size,
      font,
      color: rgb(0, 0, 0),
    });
  };
  
  // Helper function to draw horizontal line
  const drawLine = (y: number, startX: number = margin, endX: number = width - margin, thickness: number = 0.5) => {
    if (y < margin + 20) {
      currentPage = pdfDoc.addPage([612, 792]);
      yPosition = height - margin;
      y = yPosition;
    }
    
    currentPage.drawLine({
      start: { x: startX, y },
      end: { x: endX, y },
      thickness,
      color: rgb(0, 0, 0),
    });
  };
  
  // Helper function to move to next row
  const nextRow = (extraSpacing: number = 0) => {
    yPosition -= lineHeight + extraSpacing;
  };
  
  // Helper function to format number with decimals
  const formatNumber = (num: number, decimals: number = 2): string => {
    if (num === 0) return '0.00';
    return num.toFixed(decimals).replace('.', ',');
  };
  
  // Calculate derived values (KEEP ALL FORMULAS THE SAME)
  const servicePeriod = calculateServicePeriod(formData.startDate, formData.terminationDate);
  const salaryAvgs = calculateSalaryAverages(formData.salaryHistory);
  
  const roundTo2Decimals = (num: number): number => {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  };
  
  const roundCurrency = (num: number): number => {
    return parseFloat(num.toFixed(2));
  };
  
  // Calculate benefits (KEEP ALL FORMULAS EXACTLY THE SAME)
  const preavisoPay = roundCurrency(formData.preavisoDays * salaryAvgs.promDaily);
  const cesantiaPay = roundCurrency(formData.cesantiaDays * salaryAvgs.promDaily);
  const cesantiaProPay = roundCurrency(formData.cesantiaProportionalDays * salaryAvgs.promDaily);
  // VACACIONES: Use cumulative total (stacked across all years)
  const cumulativeVacationPay = roundCurrency(formData.cumulativeVacationEntitlement * salaryAvgs.promDaily);
  const vacationBonusPay = roundCurrency(formData.vacationBonusDays * salaryAvgs.promDaily);
  
  const vacationProDays = roundTo2Decimals(formData.vacationProportionalDays);
  const vacationProPay = roundCurrency(vacationProDays * salaryAvgs.promDaily);
  
  // DECIMO TERCER MES: use (thirteenthMonthDays * 30 / 360) días x baseDaily
  const thirteenthDays = roundTo2Decimals((formData.thirteenthMonthDays * 30) / 360);
  const thirteenthPay = roundCurrency(thirteenthDays * salaryAvgs.baseDaily);
  
  // DECIMO CUARTO MES: use (fourteenthMonthDays * 30 / 360) días x baseDaily
  const fourteenthDays = roundTo2Decimals((formData.fourteenthMonthDays * 30) / 360);
  const fourteenthPay = roundCurrency(fourteenthDays * salaryAvgs.baseDaily);
  
  const totalBenefits = preavisoPay + cesantiaPay + cesantiaProPay + cumulativeVacationPay + vacationBonusPay + 
                        vacationProPay + thirteenthPay + fourteenthPay + formData.salariesDue + 
                        formData.overtimeDue + formData.otherPayments + formData.seventhDayPayment + 
                        formData.wageAdjustment + formData.educationalBonus;
  
  const totalDeductions = formData.municipalTax + formData.preavisoPenalty;
  const finalTotal = totalBenefits - totalDeductions;
  
  // ========== HEADER ==========
  const titleText = 'CALCULO DE PRESTACIONES LABORALES';
  const titleWidth = helveticaBoldFont.widthOfTextAtSize(titleText, 16);
  drawText(titleText, (width - titleWidth) / 2, yPosition, 16, true);
  nextRow(sectionSpacing * 2);
  drawLine(yPosition);
  nextRow(sectionSpacing * 2);
  
  // ========== EMPLOYEE INFORMATION SECTION ==========
  drawText('EMPLEADO:', cols.label, yPosition, 11, true);
  drawText((formData.employeeName || '').substring(0, 40), cols.value, yPosition, 10, false, 200);
  nextRow(sectionSpacing);
  
  drawText('No. Identidad:', cols.label, yPosition, 10, false);
  drawText(maskDNI(formData.dni || ''), cols.value, yPosition, 10, false);
  nextRow(sectionSpacing);
  
  drawText('Motivo:', cols.label, yPosition, 10, false);
  drawText((formData.terminationReason || '').substring(0, 40), cols.value, yPosition, 10, false, 200);
  nextRow(sectionSpacing * 2);
  
  drawText('FECHA DE INGRESO:', cols.label, yPosition, 10, false);
  drawText(formatDate(formData.startDate), cols.value, yPosition, 10, false);
  nextRow(sectionSpacing);
  
  drawText('FECHA DE RETIRO:', cols.label, yPosition, 10, false);
  drawText(formatDate(formData.terminationDate), cols.value, yPosition, 10, false);
  nextRow(sectionSpacing);
  
  drawText('ANTIGÜEDAD:', cols.label, yPosition, 10, false);
  drawText(`${servicePeriod.years} AÑOS ${servicePeriod.months} MESES ${servicePeriod.days} DIAS`, cols.value, yPosition, 10, false);
  nextRow(sectionSpacing * 2);
  drawLine(yPosition);
  nextRow(sectionSpacing * 2);
  
  // ========== SALARY INFORMATION SECTION ==========
  drawText('SUELDO MENSUAL ORDINARIO:', cols.label, yPosition, 10, false);
  drawTextRight(formatCurrency(salaryAvgs.baseMonthly).replace('L. ', ''), cols.amount, yPosition, 10, false);
  nextRow(sectionSpacing);
  
  drawText('Promedio:', cols.label + 20, yPosition, 9, false);
  drawTextRight(formatCurrency(salaryAvgs.baseAverage).replace('L. ', ''), cols.amount, yPosition, 9, false);
  nextRow(sectionSpacing * 2);
  
  drawText('SUELDO MENSUAL PROMEDIO:', cols.label, yPosition, 10, false);
  drawTextRight(formatCurrency(salaryAvgs.promAverage).replace('L. ', ''), cols.amount, yPosition, 10, false);
  nextRow(sectionSpacing);
  
  drawText('Sueldo Diario Promedio:', cols.label + 20, yPosition, 9, false);
  drawTextRight(formatCurrency(salaryAvgs.promDaily).replace('L. ', ''), cols.amount, yPosition, 9, false);
  nextRow(sectionSpacing * 2);
  drawLine(yPosition);
  nextRow(sectionSpacing * 2);
  
  // ========== CALCULATION TABLE SECTION ==========
  drawText('CALCULO', cols.label, yPosition, 12, true);
  nextRow(sectionSpacing * 2);
  
  // Table header
  drawLine(yPosition);
  nextRow(sectionSpacing);
  drawText('CONCEPTO', cols.label, yPosition, 9, true);
  drawText('DÍAS', cols.days, yPosition, 9, true);
  drawText('x', cols.multiplier, yPosition, 9, true);
  drawText('TASA DIARIA', cols.rate, yPosition, 9, true);
  drawTextRight('TOTAL', cols.amount, yPosition, 9, true);
  nextRow(sectionSpacing);
  drawLine(yPosition);
  nextRow(sectionSpacing);
  
  // PREAVISO
  drawText('PREAVISO', cols.label, yPosition, 10, false);
  drawText(formatNumber(formData.preavisoDays, 2), cols.days, yPosition, 10, false);
  drawText('x', cols.multiplier, yPosition, 10, false);
  drawTextRight(formatCurrency(salaryAvgs.promDaily).replace('L. ', ''), cols.rate + 20, yPosition, 9, false);
  drawTextRight(formatCurrency(preavisoPay).replace('L. ', ''), cols.amount, yPosition, 10, false);
  nextRow(tableLineHeight);
  
  // AUXILIO DE CESANTIA
  drawText('AUXILIO DE CESANTIA', cols.label, yPosition, 10, false);
  drawText(formatNumber(formData.cesantiaDays, 2), cols.days, yPosition, 10, false);
  drawText('x', cols.multiplier, yPosition, 10, false);
  drawTextRight(formatCurrency(salaryAvgs.promDaily).replace('L. ', ''), cols.rate + 20, yPosition, 9, false);
  drawTextRight(formatCurrency(cesantiaPay).replace('L. ', ''), cols.amount, yPosition, 10, false);
  nextRow(tableLineHeight);
  
  // AUXILIO DE CESANTIA PROPORCIONAL
  drawText('AUXILIO DE CESANTIA PROPORCIONAL', cols.label, yPosition, 10, false);
  drawText(formatNumber(formData.cesantiaProportionalDays, 2), cols.days, yPosition, 10, false);
  drawText('x', cols.multiplier, yPosition, 10, false);
  drawTextRight(formatCurrency(salaryAvgs.promDaily).replace('L. ', ''), cols.rate + 20, yPosition, 9, false);
  drawTextRight(formatCurrency(cesantiaProPay).replace('L. ', ''), cols.amount, yPosition, 10, false);
  nextRow(tableLineHeight);
  
  // VACACIONES - Use cumulative total (stacked across all years)
  drawText('VACACIONES', cols.label, yPosition, 10, false);
  drawText(formatNumber(formData.cumulativeVacationEntitlement, 2), cols.days, yPosition, 10, false);
  drawText('x', cols.multiplier, yPosition, 10, false);
  drawTextRight(formatCurrency(salaryAvgs.promDaily).replace('L. ', ''), cols.rate + 20, yPosition, 9, false);
  drawTextRight(formatCurrency(cumulativeVacationPay).replace('L. ', ''), cols.amount, yPosition, 10, false);
  nextRow(tableLineHeight);
  
  // VACACIONES PROPORCIONALES
  drawText('VACACIONES PROPORCIONALES', cols.label, yPosition, 10, false);
  drawText(formatNumber(vacationProDays, 2), cols.days, yPosition, 10, false);
  drawText('x', cols.multiplier, yPosition, 10, false);
  drawTextRight(formatCurrency(salaryAvgs.promDaily).replace('L. ', ''), cols.rate + 20, yPosition, 9, false);
  drawTextRight(formatCurrency(vacationProPay).replace('L. ', ''), cols.amount, yPosition, 10, false);
  nextRow(tableLineHeight);
  
  // Vacation dates info (if available)
  if (formData.lastAnniversaryDate) {
    nextRow(sectionSpacing);
    drawText(`Desde: ${formatDate(formData.lastAnniversaryDate)}`, cols.label + 20, yPosition, 8, false);
    drawText(`Hasta: ${formatDate(formData.terminationDate)}`, cols.label + 150, yPosition, 8, false);
    drawText(`Días Totales: ${formData.vacationDaysEntitlement}`, cols.label + 270, yPosition, 8, false);
    nextRow(tableLineHeight);
  }
  
  // DECIMO TERCER MES - Use baseDaily for rate display
  drawText('DECIMO TERCER MES', cols.label, yPosition, 10, false);
  drawText(formatNumber(thirteenthDays, 2), cols.days, yPosition, 10, false);
  drawText('x', cols.multiplier, yPosition, 10, false);
  drawTextRight(formatCurrency(salaryAvgs.baseDaily).replace('L. ', ''), cols.rate + 20, yPosition, 9, false);
  drawTextRight(formatCurrency(thirteenthPay).replace('L. ', ''), cols.amount, yPosition, 10, false);
  nextRow(tableLineHeight);
  
  if (formData.thirteenthMonthStartDate) {
    const startDate = formData.thirteenthMonthStartDate.split('-');
    drawText(`Desde: ${startDate[2]}/${startDate[1]}/${startDate[0]}`, cols.label + 20, yPosition, 8, false);
    drawText(`Hasta: ${formatDate(formData.terminationDate)}`, cols.label + 150, yPosition, 8, false);
    nextRow(tableLineHeight);
  }
  
  // DECIMO CUARTO MES - Use baseDaily for rate display
  drawText('DECIMO CUARTO MES', cols.label, yPosition, 10, false);
  drawText(formatNumber(fourteenthDays, 2), cols.days, yPosition, 10, false);
  drawText('x', cols.multiplier, yPosition, 10, false);
  drawTextRight(formatCurrency(salaryAvgs.baseDaily).replace('L. ', ''), cols.rate + 20, yPosition, 9, false);
  drawTextRight(formatCurrency(fourteenthPay).replace('L. ', ''), cols.amount, yPosition, 10, false);
  nextRow(tableLineHeight);
  
  if (formData.fourteenthMonthStartDate) {
    drawText(`Desde: ${formatDate(formData.fourteenthMonthStartDate)}`, cols.label + 20, yPosition, 8, false);
    drawText(`Hasta: ${formatDate(formData.terminationDate)}`, cols.label + 150, yPosition, 8, false);
    nextRow(tableLineHeight);
  }
  
  // Table footer
  nextRow(sectionSpacing);
  drawLine(yPosition);
  nextRow(sectionSpacing * 2);
  
  // ========== TOTAL PRESTACIONES ==========
  drawText('PRESTACIONES', cols.label, yPosition, 11, true);
  drawTextRight(formatCurrency(totalBenefits).replace('L. ', ''), cols.amount, yPosition, 11, true);
  nextRow(sectionSpacing * 2);
  drawLine(yPosition);
  nextRow(sectionSpacing * 2);
  
  // ========== ADDITIONAL PAYMENTS ==========
  if (formData.salariesDue > 0 || formData.overtimeDue > 0 || formData.otherPayments > 0) {
    drawText('OTROS PAGOS', cols.label, yPosition, 11, true);
    nextRow(sectionSpacing);
    
    if (formData.salariesDue > 0) {
      drawText('Salarios Adeudados:', cols.label + 20, yPosition, 10, false);
      drawTextRight(formatCurrency(formData.salariesDue).replace('L. ', ''), cols.amount, yPosition, 10, false);
      nextRow(sectionSpacing);
    }
    
    if (formData.overtimeDue > 0) {
      drawText('Horas Extras Pendientes:', cols.label + 20, yPosition, 10, false);
      drawTextRight(formatCurrency(formData.overtimeDue).replace('L. ', ''), cols.amount, yPosition, 10, false);
      nextRow(sectionSpacing);
    }
    
    if (formData.otherPayments > 0) {
      drawText('Otros Pagos:', cols.label + 20, yPosition, 10, false);
      drawTextRight(formatCurrency(formData.otherPayments).replace('L. ', ''), cols.amount, yPosition, 10, false);
      nextRow(sectionSpacing);
    }
    
    nextRow(sectionSpacing);
    drawLine(yPosition);
    nextRow(sectionSpacing * 2);
  }
  
  // ========== DEDUCTIONS ==========
  if (totalDeductions > 0) {
    drawText('DEDUCCIONES', cols.label, yPosition, 11, true);
    nextRow(sectionSpacing);
    
    if (formData.municipalTax > 0) {
      drawText('Impuesto Vecinal:', cols.label + 20, yPosition, 10, false);
      drawTextRight(formatCurrency(formData.municipalTax).replace('L. ', ''), cols.amount, yPosition, 10, false);
      nextRow(sectionSpacing);
    }
    
    if (formData.preavisoPenalty > 0) {
      drawText('Penalización por Incumplimiento de Preaviso:', cols.label + 20, yPosition, 10, false);
      drawTextRight(formatCurrency(formData.preavisoPenalty).replace('L. ', ''), cols.amount, yPosition, 10, false);
      nextRow(sectionSpacing);
    }
    
    drawTextRight(formatCurrency(totalDeductions).replace('L. ', ''), cols.amount, yPosition, 10, true);
    nextRow(sectionSpacing * 2);
    drawLine(yPosition);
    nextRow(sectionSpacing * 2);
  }
  
  // ========== FINAL TOTAL ==========
  drawText('PRESTACIONES AL', cols.label, yPosition, 11, true);
  drawText(formatDate(formData.terminationDate), cols.value, yPosition, 10, false);
  nextRow(sectionSpacing * 2);
  
  drawText('TOTAL', cols.label, yPosition, 12, true);
  drawTextRight(formatCurrency(finalTotal).replace('L. ', ''), cols.amount, yPosition, 12, true);
  nextRow(sectionSpacing * 2);
  drawLine(yPosition, margin, width - margin, 1);
  
  // ========== SALARY HISTORY (new page if needed) ==========
  if (yPosition < 200) {
    currentPage = pdfDoc.addPage([612, 792]);
    yPosition = height - margin;
  } else {
    nextRow(sectionSpacing * 3);
  }
  
  drawText('HISTORIAL DE SALARIOS', cols.label, yPosition, 11, true);
  nextRow(sectionSpacing * 2);
  
  // Salary history headers
  drawText('SALARIO MENSUAL', cols.label, yPosition, 9, true);
  drawText('HORAS EXTRAS', width / 2, yPosition, 9, true);
  nextRow(sectionSpacing);
  drawLine(yPosition);
  nextRow(sectionSpacing);
  
  formData.salaryHistory.forEach(salary => {
    drawText(`${salary.month} ${salary.year}`, cols.label, yPosition, 9, false);
    drawTextRight(formatCurrency(salary.amount).replace('L. ', ''), cols.value + 100, yPosition, 9, false);
    
    drawText(`${salary.month} ${salary.year}`, width / 2, yPosition, 9, false);
    drawTextRight(formatCurrency(salary.overtime || 0).replace('L. ', ''), width / 2 + 100, yPosition, 9, false);
    nextRow(sectionSpacing);
  });
  
  // Salary totals
  const salaryTotal = formData.salaryHistory.reduce((sum, s) => sum + s.amount, 0);
  const salaryAvg = salaryTotal / (formData.salaryHistory.length || 1);
  const overtimeTotal = formData.salaryHistory.reduce((sum, s) => sum + (s.overtime || 0), 0);
  
  nextRow(sectionSpacing);
  drawLine(yPosition);
  nextRow(sectionSpacing);
  drawText('TOTAL / PROMEDIO', cols.label, yPosition, 9, true);
  drawTextRight(formatCurrency(salaryTotal).replace('L. ', ''), cols.value + 100, yPosition, 9, false);
  drawTextRight(formatCurrency(salaryAvg).replace('L. ', ''), cols.value + 150, yPosition, 9, false);
  
  drawTextRight(formatCurrency(overtimeTotal).replace('L. ', ''), width / 2 + 100, yPosition, 9, false);
  
  // ========== FOOTER ==========
  yPosition = margin + 40;
  drawText('ELABORADO POR:', cols.label, yPosition, 9, false);
  drawText('REVISADO POR:', width / 2 - 50, yPosition, 9, false);
  drawText('RECIBE', cols.amount - 50, yPosition, 9, false);
  
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export function getPdfFilename(formData: SeveranceFormData): string {
  const date = formData.terminationDate ? formatDate(formData.terminationDate).replace(/\s/g, '_') : 'prestaciones';
  const dni = formData.dni ? formData.dni.replace(/\D/g, '') : 'unknown';
  return `prestaciones_${dni}_${date}.pdf`;
}
