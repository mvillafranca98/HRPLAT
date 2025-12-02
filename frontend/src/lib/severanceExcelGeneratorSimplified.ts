/**
 * Simplified Excel Generation Utility for Severance Documents
 * Only replaces specific cell values - all other template content remains unchanged
 * This ensures compatibility across Google Sheets, LibreOffice, and other viewers
 */

import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { SeveranceData } from './severanceCalculation';
import { maskDNI } from './inputMasks';

/**
 * Template cell mapping - ONLY these cells are replaced
 * All other cells, formulas, and formatting remain from template
 */
export interface TemplateCellMapping {
  D3: string;   // Employee full name
  I3: string;   // Employee DNI / ID number
  I4: string;   // Termination motive
  E5: string;   // Start date (Fecha de ingreso)
  E7: string;   // End date (Fecha de retiro)
  E11: number;  // Salary (sueldo)
  C22: number;  // Vacation days (días de vacaciones restantes)
}

/**
 * Generate simplified cell mapping from severance data
 */
export function createCellMapping(severanceData: SeveranceData): TemplateCellMapping {
  // Format date helper (DD-MMM-YYYY format)
  const formatDate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 
                        'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  return {
    D3: severanceData.employeeName || '',
    I3: severanceData.dni ? maskDNI(severanceData.dni) : '',
    I4: severanceData.terminationReason || 'Renuncia',
    E5: formatDate(severanceData.startDate),
    E7: formatDate(severanceData.terminationDate),
    E11: severanceData.averageMonthlySalary || 0,
    C22: severanceData.vacationDaysRemaining || 0,
  };
}

/**
 * Simplified cell replacement - only replaces values, preserves all formatting
 */
function replaceCellValue(
  worksheet: ExcelJS.Worksheet,
  cellAddress: string,
  value: string | number
): void {
  try {
    const cell = worksheet.getCell(cellAddress);
    
    // Clear any existing formula
    if (cell.formula) {
      const wsModel = (worksheet as any).model;
      if (wsModel?.rows) {
        const rowModel = wsModel.rows[cell.row.number - 1];
        if (rowModel?.cells) {
          const cellModel = rowModel.cells[cell.col.number - 1];
          if (cellModel) {
            delete cellModel.f; // Remove formula
            delete cellModel.formula;
          }
        }
      }
    }
    
    // Set the value - ExcelJS preserves formatting automatically
    cell.value = value;
    
    console.log(`✓ Replaced ${cellAddress} = ${value}`);
  } catch (error: any) {
    console.error(`Error replacing cell ${cellAddress}:`, error.message);
    throw error;
  }
}

/**
 * Generate severance Excel file from template with minimal modifications
 */
export async function generateSeveranceExcel(
  severanceData: SeveranceData,
  templatePath: string
): Promise<ExcelJS.Workbook> {
  // Validate template exists
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template file not found at: ${templatePath}`);
  }

  // Load the Excel template
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);
  
  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) {
    throw new Error('Worksheet not found in template');
  }

  console.log(`Processing template: "${worksheet.name}"`);
  
  // Create cell mapping from severance data
  const cellMapping = createCellMapping(severanceData);
  
  // Replace ONLY the specified cells - all other template content remains unchanged
  replaceCellValue(worksheet, 'D3', cellMapping.D3);
  replaceCellValue(worksheet, 'I3', cellMapping.I3);
  replaceCellValue(worksheet, 'I4', cellMapping.I4);
  replaceCellValue(worksheet, 'E5', cellMapping.E5);
  replaceCellValue(worksheet, 'E7', cellMapping.E7);
  replaceCellValue(worksheet, 'E11', cellMapping.E11);
  replaceCellValue(worksheet, 'C22', cellMapping.C22);
  
  console.log('✓ All template cells replaced successfully');
  
  return workbook;
}

/**
 * Get template path - tries multiple locations
 */
export function getTemplatePath(): string {
  // Try public directory first
  const publicPath = path.join(process.cwd(), 'public', 'severance-template.xlsx');
  if (fs.existsSync(publicPath)) {
    return publicPath;
  }
  
  // Try severance2 directory
  const severance2Path = path.join(process.cwd(), '..', 'severance2', 'RRHH.xlsx');
  if (fs.existsSync(severance2Path)) {
    return severance2Path;
  }
  
  // Try absolute path from project root
  const absoluteSeverance2Path = path.join(process.cwd(), 'severance2', 'RRHH.xlsx');
  if (fs.existsSync(absoluteSeverance2Path)) {
    return absoluteSeverance2Path;
  }
  
  throw new Error('Severance template file not found. Please ensure severance-template.xlsx exists in the public directory or RRHH.xlsx in severance2 directory.');
}
