/**
 * Excel Generation Utility for Severance Documents
 * Populates the Excel template with calculated severance data
 * Based on RRHH.xlsx template structure
 */

import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';
import { SeveranceData, SeveranceBenefits, calculateSeveranceBenefits } from './severanceCalculation';
import { maskDNI } from './inputMasks';

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
  
  // Log worksheet info for debugging
  console.log(`Working with worksheet: "${worksheet.name}", ${worksheet.rowCount} rows`);
  
  // Function to get cell value from worksheet for debugging
  const debugCell = (addr: string) => {
    const cell = worksheet.getCell(addr);
    return {
      address: addr,
      value: cell.value,
      formula: cell.formula || null,
      text: cell.text || null,
      type: (cell as any).type || 'unknown',
    };
  };
  
  console.log('Template cells before modification:');
  console.log('D3:', debugCell('D3'));
  console.log('I3:', debugCell('I3'));
  console.log('E5:', debugCell('E5'));
  
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
  
  // Helper function to safely set cell value, completely removing formulas
  // Uses direct row/cell manipulation to ensure formulas are completely replaced
  const setCellValue = (cellAddress: string, value: any, numFmt?: string): void => {
    try {
      // Convert cell address to row and column numbers
      const match = cellAddress.match(/^([A-Z]+)(\d+)$/);
      if (!match) {
        throw new Error(`Invalid cell address: ${cellAddress}`);
      }
      
      const colLetter = match[1];
      const rowNum = parseInt(match[2], 10);
      
      // Convert column letter to number
      let colNum = 0;
      for (let i = 0; i < colLetter.length; i++) {
        colNum = colNum * 26 + (colLetter.charCodeAt(i) - 64);
      }
      
      // Get the row directly
      const row = worksheet.getRow(rowNum);
      
      // Get the cell - this gives us direct access
      const cell = row.getCell(colNum);
      
      console.log(`Setting ${cellAddress} (row ${rowNum}, col ${colNum}) = "${value}"`);
      
      // Check for formula first
      if (cell.formula) {
        console.log(`  ⚠️  Formula detected: "${cell.formula}"`);
      }
      
      // CRITICAL: Completely remove formula BEFORE setting value
      // ExcelJS stores formulas in the XML model, we need to remove them first
      const wsModel = (worksheet as any).model;
      
      // Step 1: Remove formula from worksheet XML model FIRST (before setting value)
      if (wsModel && wsModel.rows) {
        const rowModel = wsModel.rows[rowNum - 1];
        if (rowModel && rowModel.cells) {
          const xmlCell = rowModel.cells[colNum - 1];
          if (xmlCell) {
            // Remove ALL formula-related properties from XML
            if (xmlCell.f !== undefined) {
              console.log(`  Removing formula 'f' from XML for ${cellAddress}`);
              delete xmlCell.f;
            }
            // Change cell type from formula ('e') to value type
            if (xmlCell.t === 'e') {
              const newType = typeof value === 'number' ? 'n' : (typeof value === 'string' ? 'inlineStr' : 'n');
              xmlCell.t = newType;
              console.log(`  Changed XML cell type from 'e' (formula) to '${newType}' for ${cellAddress}`);
            }
            // Remove result property if it exists
            if (xmlCell.result !== undefined) delete xmlCell.result;
          }
        }
      }
      
      // Step 2: Remove formula from cell model
      const cellModel = (cell as any).model;
      if (cellModel) {
        if (cellModel.f !== undefined) delete cellModel.f;
        if (cellModel.formula !== undefined) delete cellModel.formula;
        if (cellModel.result !== undefined) delete cellModel.result;
        if (cellModel.t === 'e') {
          cellModel.t = typeof value === 'number' ? 'n' : 'inlineStr';
        }
      }
      
      // Step 3: Now set the value - this creates a value cell, not formula
      const targetCell = row.getCell(colNum);
      targetCell.value = value;
      
      // Step 4: Force update the XML model to ensure value is stored
      if (wsModel && wsModel.rows) {
        const rowModel = wsModel.rows[rowNum - 1];
        if (rowModel && rowModel.cells) {
          const xmlCell = rowModel.cells[colNum - 1];
          if (xmlCell) {
            // Ensure value is in XML model
            xmlCell.v = value;
            // Ensure type is correct (not formula)
            if (xmlCell.t === undefined || xmlCell.t === 'e') {
              xmlCell.t = typeof value === 'number' ? 'n' : 'inlineStr';
            }
            // Double-check formula is removed
            if (xmlCell.f !== undefined) {
              console.error(`  ERROR: Formula 'f' still exists in XML for ${cellAddress} after cleanup!`);
              delete xmlCell.f;
            }
          }
        }
      }
      
      // Set number format if specified
      if (numFmt) {
        row.getCell(colNum).numFmt = numFmt;
      }
      
      // Verify it was set correctly
      const verifyCell = worksheet.getCell(cellAddress);
      
      if (verifyCell.formula) {
        console.error(`  ❌ FAILED: Formula still exists!`);
        console.error(`     Formula: "${verifyCell.formula}"`);
        console.error(`     This means Excel will show formula result, not your value!`);
      } else {
        const actualValue = verifyCell.value;
        console.log(`  ✓ Set: ${cellAddress} = "${actualValue}"`);
        
        // Double-check the value matches what we set
        if (actualValue !== value && String(actualValue) !== String(value)) {
          console.warn(`  ⚠️  Value mismatch: expected "${value}", got "${actualValue}"`);
        }
      }
      
    } catch (error: any) {
      console.error(`❌ Error setting cell ${cellAddress}:`, error.message);
      console.error(error);
    }
  };
  
  const dailySalary = severanceData.dailySalary;
  const avgSalary = severanceData.averageMonthlySalary;
  const termDateStr = formatDate(severanceData.terminationDate);
  const startDateStr = formatDate(severanceData.startDate);
  
  // ===== BASIC EMPLOYEE INFORMATION =====
  // Format DNI with hyphens (XXXX-XXXX-XXXXX)
  const formattedDNI = severanceData.dni ? maskDNI(severanceData.dni) : '';
  
  console.log('Populating employee information:');
  console.log('- Employee name:', severanceData.employeeName);
  console.log('- DNI (formatted):', formattedDNI);
  console.log('- Termination reason:', severanceData.terminationReason);
  console.log('- Start date:', startDateStr);
  console.log('- Termination date:', termDateStr);
  
  // D3 = Employee name
  setCellValue('D3', severanceData.employeeName, '@');
  
  // I3 = DNI (User's ID) - formatted with hyphens
  setCellValue('I3', formattedDNI, '@');
  
  // I4 = Termination reason
  setCellValue('I4', severanceData.terminationReason || 'Renuncia', '@');
  
  // E5 = Starting date
  setCellValue('E5', startDateStr, '@');
  
  // E7 = Termination date
  setCellValue('E7', termDateStr, '@');
  
  console.log('Employee information populated successfully');
  
  // ===== ANTIGÜEDAD (SENIORITY) - Row 9 =====
  // C9 = Years
  setCellValue('C9', severanceData.yearsOfService);
  // E9 = "AÑOS" (text, should already be in template)
  // G9 = Months
  setCellValue('G9', severanceData.monthsOfService);
  // I9 = "MESES" (text, should already be in template)
  // For days, we need to check the template structure - likely in column K or similar
  // Based on CSV, it shows "4,DIAS" - let's use column K for days
  setCellValue('K9', severanceData.daysOfService);
  
  // ===== SALARY INFORMATION =====
  // E11 = Current monthly salary (average) - SPECIFICATION
  setCellValue('E11', avgSalary);
  
  // E13 = Average monthly salary (duplicate)
  setCellValue('E13', avgSalary);
  
  // I13 = Daily salary
  setCellValue('I13', dailySalary);
  
  // ===== VACATION INFORMATION =====
  // C22 = Vacation days remaining - SPECIFICATION
  setCellValue('C22', severanceData.vacationDaysRemaining);
  
  // A25 = Last anniversary date - SPECIFICATION
  setCellValue('A25', formatDate(severanceData.lastAnniversaryDate), '@');
  
  // A26 = Vacation entitlement (total days allowed according to seniority) - SPECIFICATION
  setCellValue('A26', severanceData.vacationDaysEntitlement);
  
  // B25 = Termination date (for vacation calculation period)
  setCellValue('B25', termDateStr, '@');
  
  // C26 = Days from anniversary to termination
  const daysFromAnniversary = Math.floor(
    (severanceData.terminationDate.getTime() - severanceData.lastAnniversaryDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  setCellValue('C26', daysFromAnniversary);
  
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
  
  // Final cleanup: Remove formulas ONLY from cells we're replacing
  // This preserves all other formulas in the template (calculations, etc.)
  console.log('\n=== FINAL CLEANUP: Removing formulas from target cells only ===');
  const criticalCells = ['D3', 'I3', 'I4', 'E5', 'E7', 'E11', 'A25', 'C22', 'A26'];
  
  // Access the worksheet model directly to remove formulas from XML
  const wsModel = (worksheet as any).model;
  
  if (wsModel && wsModel.rows) {
    console.log('Accessing worksheet model to remove formulas from XML structure...');
    
    for (const cellAddr of criticalCells) {
      const cell = worksheet.getCell(cellAddr);
      const rowNum = cell.row.number;
      const colNum = cell.col.number;
      
      // Access row model
      const rowModel = wsModel.rows[rowNum - 1]; // Rows are 0-indexed in model
      
      if (rowModel && rowModel.cells) {
        // Access cell model directly
        const cellModel = rowModel.cells[colNum - 1]; // Columns are 0-indexed in model
        
        if (cellModel) {
          // Force remove formula properties from XML model
          if (cellModel.f) { // 'f' is formula in Excel XML
            console.log(`Removing formula 'f' property from ${cellAddr}`);
            delete cellModel.f;
          }
          if (cellModel.formula) {
            console.log(`Removing formula property from ${cellAddr}`);
            delete cellModel.formula;
          }
          if (cellModel.t === 'e' || cellModel.t === 'str') { // 'e' = formula, 'str' = string
            // Change type to 'inlineStr' or 'n' (number) or 's' (shared string)
            cellModel.t = 'inlineStr'; // Force it to be a string value
            console.log(`Changed cell type for ${cellAddr}`);
          }
          
          // Ensure the value is set in the model
          if (cell.value !== null && cell.value !== undefined) {
            cellModel.v = cell.value; // 'v' is the value in Excel XML
            if (cellModel.t === undefined || cellModel.t === 'e') {
              cellModel.t = typeof cell.value === 'number' ? 'n' : 'inlineStr';
            }
          }
        }
      }
    }
  }
  
  // Final verification: Check what will actually be written to Excel
  console.log('\n' + '='.repeat(60));
  console.log('FINAL VERIFICATION - What will be written to Excel file:');
  console.log('='.repeat(60));
  
  for (const cellAddr of criticalCells) {
    const cell = worksheet.getCell(cellAddr);
    const hasFormula = !!cell.formula;
    const value = cell.value;
    
    if (hasFormula) {
      console.error(`❌ ${cellAddr}: STILL HAS FORMULA "${cell.formula}" - VALUE WILL BE IGNORED!`);
      console.error(`   Current value: "${value}"`);
    } else {
      console.log(`✓ ${cellAddr}: "${value}"`);
    }
  }
  
  console.log('='.repeat(60));
  console.log('Note: Only formulas in the cells listed above are removed.');
  console.log('All other formulas in the template are preserved.\n');
  
  // FINAL STEP: Write to buffer, then selectively remove formulas only from target cells
  // Only remove formulas from cells we're replacing, preserve all other formulas
  console.log('Writing workbook to buffer...');
  const buffer = await workbook.xlsx.writeBuffer();
  
  // List of cells where we want to remove formulas (only these cells)
  const cellsToReplace = ['D3', 'I3', 'I4', 'E5', 'E7', 'E11', 'A25', 'C22', 'A26'];
  
  // Helper function to convert cell address (e.g., "D3") to row number and column letter
  const parseCellAddress = (address: string): { row: number; col: string } => {
    const match = address.match(/^([A-Z]+)(\d+)$/);
    if (!match) throw new Error(`Invalid cell address: ${address}`);
    return { row: parseInt(match[2], 10), col: match[1] };
  };
  
  // Convert cell addresses to row/column format
  const targetCells = cellsToReplace.map(addr => parseCellAddress(addr));
  
  // Helper function to convert column letter to Excel XML column number (1-based)
  const colLetterToNum = (col: string): number => {
    let num = 0;
    for (let i = 0; i < col.length; i++) {
      num = num * 26 + (col.charCodeAt(i) - 64);
    }
    return num;
  };
  
  // Convert our target cells to Excel XML format (row="3" r="D3")
  const targetCellRefs = new Set(targetCells.map(cell => {
    const colNum = colLetterToNum(cell.col);
    return { row: cell.row, col: cell.col, colNum, ref: `${cell.col}${cell.row}` };
  }));
  
  console.log(`Will only remove formulas from these cells: ${cellsToReplace.join(', ')}`);
  console.log('All other formulas will be preserved.');
  
  // Use adm-zip to extract, modify XML, and repackage
  console.log('Selectively removing formulas from Excel XML structure...');
  const zip = new AdmZip(buffer);
  
  // Find all worksheet XML files
  const zipEntries = zip.getEntries();
  const worksheetEntries = zipEntries.filter(entry => 
    entry.entryName.startsWith('xl/worksheets/') && 
    entry.entryName.endsWith('.xml') &&
    !entry.entryName.includes('_rels')
  );
  
  console.log(`Found ${worksheetEntries.length} worksheet(s) to process`);
  
  // Process each worksheet XML
  for (const entry of worksheetEntries) {
    try {
      let xmlContent = entry.getData().toString('utf8');
      let formulaCount = 0;
      
      // Parse XML to find cell elements and only remove formulas from target cells
      // Excel XML format: <c r="D3" ...><f>FORMULA</f><v>VALUE</v></c>
      
      // Use a more comprehensive regex to match all cell elements
      // Match: <c ... r="CELLREF" ...>...</c> or cells without r attribute (we'll handle those separately)
      xmlContent = xmlContent.replace(
        /<c(\s+[^>]*r="([A-Z]+\d+)"[^>]*)>(.*?)<\/c>/gis,
        (match, attrs, cellRef, cellContent) => {
          // Check if this cell is in our target list
          const isTargetCell = Array.from(targetCellRefs).some(t => t.ref === cellRef);
          
          if (isTargetCell && (cellContent.includes('<f') || attrs.includes('t="e"'))) {
            // This is a target cell with a formula - remove the formula
            formulaCount++;
            
            // Remove formula tags: <f>...</f> or <f .../>
            let cleanedContent = cellContent.replace(/<f[^>]*\/\s*>/gi, '');
            cleanedContent = cleanedContent.replace(/<f[^>]*>.*?<\/f>/gis, '');
            
            // Remove formula type attribute if present (t="e" means formula/expression type)
            let cleanedAttrs = attrs.replace(/\s+t="e"/gi, '');
            cleanedAttrs = cleanedAttrs.replace(/\s+t='e'/gi, '');
            
            console.log(`  ✓ Removed formula from cell ${cellRef}`);
            
            return `<c${cleanedAttrs}>${cleanedContent}</c>`;
          }
          
          // Not a target cell or doesn't have formula - keep as is
          return match;
        }
      );
      
      if (formulaCount > 0) {
        console.log(`  ✓ Removed ${formulaCount} formula(s) from target cells in ${entry.entryName}`);
        
        // Update the zip entry with cleaned XML
        zip.updateFile(entry, Buffer.from(xmlContent, 'utf8'));
      } else {
        console.log(`  ✓ No formulas to remove in target cells for ${entry.entryName}`);
      }
    } catch (error: any) {
      console.error(`  ⚠️  Error processing ${entry.entryName}:`, error.message);
      console.error(error);
    }
  }
  
  // Create a new workbook from the cleaned zip buffer
  const cleanedBuffer = zip.toBuffer();
  
  // Read the cleaned workbook back
  const cleanWorkbook = new ExcelJS.Workbook();
  await cleanWorkbook.xlsx.load(cleanedBuffer);
  
  // Verify critical cells one more time
  const cleanWorksheet = cleanWorkbook.getWorksheet(1);
  if (cleanWorksheet) {
    console.log('\nFinal verification after XML cleanup:');
    for (const cellAddr of criticalCells) {
      const cleanCell = cleanWorksheet.getCell(cellAddr);
      if (cleanCell.formula) {
        console.error(`  ⚠️  ${cellAddr} STILL has formula: "${cleanCell.formula}"`);
      } else {
        console.log(`  ✓ ${cellAddr}: "${cleanCell.value}"`);
      }
    }
  }
  
  return cleanWorkbook;
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

