/**
 * PDF Generation Utility for Severance Documents
 * Uses pdf-lib which doesn't require external font files
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { SeveranceData, SeveranceBenefits, calculateSeveranceBenefits } from './severanceCalculation';
import { maskDNI } from './inputMasks';

/**
 * Format date helper (DD-MMM-YYYY format)
 */
function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 
                      'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Generate PDF directly from severance data
 */
export async function generateSeverancePDF(
  severanceData: SeveranceData
): Promise<Buffer> {
  // Calculate all benefits
  const benefits = calculateSeveranceBenefits(severanceData);
  
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  
  // Add a page (LETTER size: 612 x 792 points)
  const page = pdfDoc.addPage([612, 792]);
  const { width, height } = page.getSize();
  
  // Get standard fonts (these don't require external files)
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let yPosition = height - 50; // Start from top with 50pt margin
  const margin = 50;
  const lineHeight = 15;
  const sectionSpacing = 20;
  let currentPage = page;
  
  // Header (centered)
  const headerText = 'CÁLCULO DE PRESTACIONES LABORALES';
  const headerWidth = helveticaBoldFont.widthOfTextAtSize(headerText, 16);
  currentPage.drawText(headerText, {
    x: (width - headerWidth) / 2,
    y: yPosition,
    size: 16,
    font: helveticaBoldFont,
    color: rgb(0, 0, 0),
  });
  
  yPosition -= sectionSpacing * 2;
  
  // Employee Information Section
  currentPage.drawText('INFORMACIÓN DEL EMPLEADO', {
    x: margin,
    y: yPosition,
    size: 12,
    font: helveticaBoldFont,
    color: rgb(0, 0, 0),
  });
  yPosition -= lineHeight * 1.5;
  
  const formattedDNI = severanceData.dni ? maskDNI(severanceData.dni) : 'N/A';
  const employeeInfo = [
    `Nombre: ${severanceData.employeeName || 'N/A'}`,
    `DNI: ${formattedDNI}`,
    `Motivo de Terminación: ${severanceData.terminationReason || 'N/A'}`,
    `Fecha de Ingreso: ${formatDate(severanceData.startDate)}`,
    `Fecha de Retiro: ${formatDate(severanceData.terminationDate)}`,
  ];
  
  for (const line of employeeInfo) {
    currentPage.drawText(line, {
      x: margin,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= lineHeight;
  }
  
  yPosition -= sectionSpacing;
  
  // Seniority
  currentPage.drawText('ANTIGÜEDAD', {
    x: margin,
    y: yPosition,
    size: 12,
    font: helveticaBoldFont,
    color: rgb(0, 0, 0),
  });
  yPosition -= lineHeight * 1.5;
  
  currentPage.drawText(
    `${severanceData.yearsOfService} años, ${severanceData.monthsOfService} meses, ${severanceData.daysOfService} días`,
    {
      x: margin,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    }
  );
  yPosition -= lineHeight + sectionSpacing;
  
  // Salary Information
  currentPage.drawText('INFORMACIÓN SALARIAL', {
    x: margin,
    y: yPosition,
    size: 12,
    font: helveticaBoldFont,
    color: rgb(0, 0, 0),
  });
  yPosition -= lineHeight * 1.5;
  
  currentPage.drawText(
    `Salario Mensual Promedio: L. ${severanceData.averageMonthlySalary.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    {
      x: margin,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    }
  );
  yPosition -= lineHeight;
  
  currentPage.drawText(
    `Salario Diario: L. ${severanceData.dailySalary.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    {
      x: margin,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    }
  );
  yPosition -= lineHeight + sectionSpacing;
  
  // Vacation Information
  currentPage.drawText('VACACIONES', {
    x: margin,
    y: yPosition,
    size: 12,
    font: helveticaBoldFont,
    color: rgb(0, 0, 0),
  });
  yPosition -= lineHeight * 1.5;
  
  currentPage.drawText(
    `Días de Vacaciones Restantes: ${severanceData.vacationDaysRemaining}`,
    {
      x: margin,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    }
  );
  yPosition -= lineHeight;
  
  currentPage.drawText(
    `Derecho Total de Vacaciones: ${severanceData.vacationDaysEntitlement} días`,
    {
      x: margin,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    }
  );
  yPosition -= lineHeight + sectionSpacing;
  
  // Benefits Section
  currentPage.drawText('PRESTACIONES', {
    x: margin,
    y: yPosition,
    size: 12,
    font: helveticaBoldFont,
    color: rgb(0, 0, 0),
  });
  yPosition -= lineHeight * 1.5;
  
  const benefitsText: string[] = [];
  
  // Notice Pay
  if (severanceData.noticeDays > 0 && benefits.noticePay > 0) {
    benefitsText.push(
      `Preaviso: ${severanceData.noticeDays} días - L. ${benefits.noticePay.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    );
  }
  
  // Severance Pay
  const severanceDays = benefits.severancePay / severanceData.dailySalary;
  if (severanceDays > 0) {
    benefitsText.push(
      `Auxilio de Cesantía: ${severanceDays.toFixed(2)} días - L. ${benefits.severancePay.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    );
  }
  
  // Proportional Severance
  if (benefits.proportionalSeverancePay > 0) {
    benefitsText.push(
      `Auxilio de Cesantía Proporcional: ${severanceData.proportionalSeveranceDays.toFixed(2)} días - L. ${benefits.proportionalSeverancePay.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    );
  }
  
  // Vacation Pay
  if (benefits.vacationPay > 0) {
    benefitsText.push(
      `Vacaciones: ${severanceData.vacationDaysRemaining} días - L. ${benefits.vacationPay.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    );
  }
  
  // Proportional Vacation
  if (benefits.proportionalVacationPay > 0) {
    benefitsText.push(
      `Vacaciones Proporcionales: L. ${benefits.proportionalVacationPay.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    );
  }
  
  // 13th Month
  if (severanceData.thirteenthMonthDays > 0 && benefits.thirteenthMonthPay > 0) {
    benefitsText.push(
      `Décimo Tercer Mes: ${severanceData.thirteenthMonthDays.toFixed(2)} días - L. ${benefits.thirteenthMonthPay.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    );
  }
  
  // 14th Month
  if (severanceData.fourteenthMonthDays > 0 && benefits.fourteenthMonthPay > 0) {
    benefitsText.push(
      `Décimo Cuarto Mes: ${severanceData.fourteenthMonthDays.toFixed(2)} días - L. ${benefits.fourteenthMonthPay.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    );
  }
  
  // Draw benefits text
  for (const line of benefitsText) {
    // Check if we need a new page
    if (yPosition < 50) {
      currentPage = pdfDoc.addPage([612, 792]);
      yPosition = height - 50;
    }
    
    currentPage.drawText(line, {
      x: margin,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= lineHeight;
  }
  
  yPosition -= sectionSpacing;
  
  // Total Benefits (right-aligned)
  const totalText = `TOTAL PRESTACIONES: L. ${benefits.totalBenefits.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const totalWidth = helveticaBoldFont.widthOfTextAtSize(totalText, 14);
  
  // Check if we need a new page for total
  if (yPosition < 50) {
    currentPage = pdfDoc.addPage([612, 792]);
    yPosition = height - 50;
  }
  
  currentPage.drawText(totalText, {
    x: width - margin - totalWidth,
    y: yPosition,
    size: 14,
    font: helveticaBoldFont,
    color: rgb(0, 0, 0),
  });
  
  yPosition -= sectionSpacing * 3;
  
  // Footer
  const footerText = `Documento generado el ${new Date().toLocaleDateString('es-HN')}`;
  const footerWidth = helveticaFont.widthOfTextAtSize(footerText, 8);
  
  // Check if we need a new page for footer
  if (yPosition < 50) {
    currentPage = pdfDoc.addPage([612, 792]);
    yPosition = height - 50;
  }
  
  currentPage.drawText(footerText, {
    x: (width - footerWidth) / 2,
    y: yPosition,
    size: 8,
    font: helveticaFont,
    color: rgb(0.5, 0.5, 0.5),
  });
  
  // Serialize the PDF to bytes
  const pdfBytes = await pdfDoc.save();
  
  // Return as Buffer
  return Buffer.from(pdfBytes);
}

/**
 * Generate PDF filename from employee data
 */
export function getPdfFilename(severanceData: SeveranceData): string {
  const employeeName = (severanceData.employeeName || 'empleado')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .toLowerCase();
  const date = new Date().toISOString().split('T')[0];
  return `prestaciones_${employeeName}_${date}.pdf`;
}