/**
 * Script to create Excel template for Severance Calculator configuration
 * Run with: npx tsx scripts/create-excel-template.ts
 */

import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

async function createExcelTemplate() {
  const workbook = new ExcelJS.Workbook();
  
  // ============================================
  // Sheet 1: Field Definitions
  // ============================================
  const fieldsSheet = workbook.addWorksheet('Field Definitions');
  
  // Headers
  fieldsSheet.columns = [
    { header: 'Field Name', key: 'fieldName', width: 30 },
    { header: 'Display Label (Spanish)', key: 'label', width: 35 },
    { header: 'Data Type', key: 'type', width: 15 },
    { header: 'Required', key: 'required', width: 10 },
    { header: 'Auto-Calculated', key: 'autoCalc', width: 18 },
    { header: 'Source/Dependency', key: 'dependency', width: 40 },
    { header: 'Formula/Logic', key: 'formula', width: 50 },
    { header: 'Default Value', key: 'default', width: 15 },
  ];
  
  fieldsSheet.getRow(1).font = { bold: true };
  fieldsSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  
  // Employee Information Fields
  const employeeFields = [
    ['employeeName', 'Nombre del Empleado', 'string', 'Yes', 'No', 'From database or manual entry', '', ''],
    ['dni', 'No. Identidad (DNI)', 'string', 'Yes', 'No', 'From database or manual entry', '', ''],
    ['terminationReason', 'Motivo', 'string', 'Yes', 'No', 'Dropdown selection', 'Renuncia, Despido, etc.', 'Renuncia'],
    ['startDate', 'Fecha de Ingreso', 'date', 'Yes', 'No', 'From database or manual entry', '', ''],
    ['terminationDate', 'Fecha de Retiro', 'date', 'Yes', 'Auto', 'Auto: today + preavisoDays OR manual', 'calculateTerminationDateFromPreaviso()', ''],
    ['lastAnniversaryDate', 'Último Aniversario', 'date', 'No', 'Auto', 'Calculated from startDate', 'getLastAnniversary(startDate)', ''],
  ];
  
  // Vacation Information Fields
  const vacationFields = [
    ['vacationDaysRemaining', 'Días de Vacaciones Restantes', 'number', 'No', 'Auto', 'From database calculation', 'calculateVacationDaysForSeverance()', '0'],
    ['vacationDaysEntitlement', 'Días Totales de Vacaciones', 'number', 'No', 'Auto', 'Based on years of service', 'calculateVacationEntitlement(startDate)', '0'],
  ];
  
  // Benefits Calculation Fields
  const benefitsFields = [
    ['preavisoDays', 'Días de Preaviso', 'number', 'No', 'Auto', 'Based on service period (see Preaviso Rules sheet)', 'calculateRequiredPreavisoDays(startDate)', '30'],
    ['cesantiaDays', 'Días de Auxilio de Cesantía', 'number', 'No', 'No', 'Manual entry', '', '0'],
    ['cesantiaProportionalDays', 'Días de Auxilio de Cesantía Proporcional', 'number', 'No', 'No', 'Manual entry', '', '0'],
    ['vacationBonusDays', 'Días de Bono por Vacaciones', 'number', 'No', 'No', 'Manual entry', '', '0'],
    ['vacationProportionalDays', 'Días de Vacaciones Proporcionales', 'number', 'No', 'Auto', 'Same as vacationDaysRemaining', '= vacationDaysRemaining', '0'],
    ['thirteenthMonthDays', 'Días de Décimo Tercer Mes', 'number', 'No', 'Auto', 'From last July 1st to termination', 'calculateThirteenthMonthDays()', '0'],
    ['thirteenthMonthStartDate', 'Fecha Inicio Décimo Tercer Mes', 'date', 'No', 'Auto', 'Last July 1st before termination', 'getLastJuly1st(terminationDate)', ''],
    ['fourteenthMonthDays', 'Días de Décimo Cuarto Mes', 'number', 'No', 'Auto', 'From Jan 1st to termination', 'calculateFourteenthMonthDays()', '0'],
    ['fourteenthMonthStartDate', 'Fecha Inicio Décimo Cuarto Mes', 'date', 'No', 'Auto', 'January 1st of termination year', 'getJanuary1stOfYear(terminationDate)', ''],
  ];
  
  // Additional Payments Fields
  const paymentsFields = [
    ['salariesDue', 'Salarios Adeudados (L.)', 'number', 'No', 'No', 'Manual entry', '', '0'],
    ['overtimeDue', 'Pago HE Pendiente (L.)', 'number', 'No', 'No', 'Manual entry', '', '0'],
    ['otherPayments', 'Otros Pagos (L.)', 'number', 'No', 'No', 'Manual entry', '', '0'],
    ['seventhDayPayment', 'Pago Séptimo Día (L.)', 'number', 'No', 'No', 'Manual entry', '', '0'],
    ['wageAdjustment', 'Ajuste Salarial (L.)', 'number', 'No', 'No', 'Manual entry', '', '0'],
    ['educationalBonus', 'Bono Educacional (L.)', 'number', 'No', 'No', 'Manual entry', '', '0'],
  ];
  
  // Deductions Fields
  const deductionsFields = [
    ['municipalTax', 'Impuesto Municipal (L.)', 'number', 'No', 'No', 'Manual entry', '', '0'],
    ['preavisoPenalty', 'Multa por Preaviso (L.)', 'number', 'No', 'No', 'Manual entry', '', '0'],
  ];
  
  // Add all fields
  let rowNum = 2;
  const addFields = (fields: string[][], category: string) => {
    fieldsSheet.getCell(`A${rowNum}`).value = `=== ${category} ===`;
    fieldsSheet.getRow(rowNum).font = { bold: true, italic: true };
    fieldsSheet.mergeCells(`A${rowNum}:H${rowNum}`);
    rowNum++;
    
    fields.forEach(field => {
      fieldsSheet.addRow({
        fieldName: field[0],
        label: field[1],
        type: field[2],
        required: field[3],
        autoCalc: field[4],
        dependency: field[5],
        formula: field[6],
        default: field[7],
      });
      rowNum++;
    });
    rowNum++; // Add spacing
  };
  
  addFields(employeeFields, 'Employee Information');
  addFields(vacationFields, 'Vacation Information');
  addFields(benefitsFields, 'Benefits Calculation');
  addFields(paymentsFields, 'Additional Payments');
  addFields(deductionsFields, 'Deductions');
  
  // ============================================
  // Sheet 2: Preaviso Rules
  // ============================================
  const preavisoSheet = workbook.addWorksheet('Preaviso Rules');
  
  preavisoSheet.columns = [
    { header: 'Service Period Description', key: 'description', width: 30 },
    { header: 'Min Months', key: 'minMonths', width: 15 },
    { header: 'Max Months', key: 'maxMonths', width: 15 },
    { header: 'Min Years', key: 'minYears', width: 15 },
    { header: 'Max Years', key: 'maxYears', width: 15 },
    { header: 'Preaviso Days', key: 'days', width: 15 },
    { header: 'Notes', key: 'notes', width: 40 },
  ];
  
  preavisoSheet.getRow(1).font = { bold: true };
  preavisoSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  
  const preavisoRules = [
    ['Less than 3 months', '0', '2', '', '', '0', 'No preaviso required'],
    ['3 to 6 months', '3', '5', '', '', '7', ''],
    ['6 months to 1 year', '6', '11', '', '', '14', ''],
    ['1 to 2 years', '', '', '1', '1', '30', '1 month = 30 days'],
    ['2 to 5 years', '', '', '2', '4', '60', '2 months = 60 days'],
    ['5 to 10 years', '', '', '5', '9', '90', '3 months = 90 days'],
    ['10+ years', '', '', '10', '999', '120', '4 months = 120 days'],
  ];
  
  preavisoRules.forEach(rule => {
    preavisoSheet.addRow({
      description: rule[0],
      minMonths: rule[1] || '',
      maxMonths: rule[2] || '',
      minYears: rule[3] || '',
      maxYears: rule[4] || '',
      days: rule[5],
      notes: rule[6],
    });
  });
  
  // ============================================
  // Sheet 3: Calculation Formulas
  // ============================================
  const formulasSheet = workbook.addWorksheet('Calculation Formulas');
  
  formulasSheet.columns = [
    { header: 'Field Name', key: 'fieldName', width: 30 },
    { header: 'Calculation Type', key: 'type', width: 25 },
    { header: 'Formula/Logic', key: 'formula', width: 60 },
    { header: 'Dependencies', key: 'dependencies', width: 50 },
    { header: 'Notes', key: 'notes', width: 40 },
  ];
  
  formulasSheet.getRow(1).font = { bold: true };
  formulasSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  
  const formulas = [
    ['preavisoDays', 'Service Period Based', 'See Preaviso Rules sheet', 'startDate', 'Based on service period from start date to today'],
    ['terminationDate', 'Date Calculation', 'today + preavisoDays', 'preavisoDays, today', 'Auto-calculated when employee selected'],
    ['lastAnniversaryDate', 'Date Calculation', 'Last anniversary date from startDate', 'startDate', ''],
    ['vacationDaysRemaining', 'Database Calculation', 'calculateVacationDaysForSeverance()', 'startDate, vacationRequests', 'From database'],
    ['vacationDaysEntitlement', 'Service Based', 'calculateVacationEntitlement(startDate)', 'startDate', 'Based on years of service'],
    ['vacationProportionalDays', 'Direct Copy', '= vacationDaysRemaining', 'vacationDaysRemaining', 'Same value'],
    ['thirteenthMonthStartDate', 'Date Calculation', 'Last July 1st before/on termination', 'terminationDate', ''],
    ['thirteenthMonthDays', 'Date Calculation', '(months * 30) + days', 'thirteenthMonthStartDate, terminationDate', '30 days per month'],
    ['fourteenthMonthStartDate', 'Date Calculation', 'January 1st of termination year', 'terminationDate', ''],
    ['fourteenthMonthDays', 'Date Calculation', '(months * 30) + days', 'fourteenthMonthStartDate, terminationDate', '30 days per month'],
  ];
  
  formulas.forEach(formula => {
    formulasSheet.addRow({
      fieldName: formula[0],
      type: formula[1],
      formula: formula[2],
      dependencies: formula[3],
      notes: formula[4],
    });
  });
  
  // ============================================
  // Sheet 4: Field Relationships
  // ============================================
  const relationshipsSheet = workbook.addWorksheet('Field Relationships');
  
  relationshipsSheet.columns = [
    { header: 'Source Field', key: 'source', width: 30 },
    { header: 'Target Field', key: 'target', width: 30 },
    { header: 'Relationship Type', key: 'type', width: 25 },
    { header: 'Trigger', key: 'trigger', width: 30 },
    { header: 'Formula', key: 'formula', width: 50 },
  ];
  
  relationshipsSheet.getRow(1).font = { bold: true };
  relationshipsSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  
  const relationships = [
    ['startDate', 'preavisoDays', 'Calculates', 'On startDate change', 'calculateRequiredPreavisoDays(startDate)'],
    ['startDate', 'terminationDate', 'Calculates', 'On startDate change', 'today + preavisoDays'],
    ['startDate', 'lastAnniversaryDate', 'Calculates', 'On employee select', 'getLastAnniversary(startDate)'],
    ['startDate', 'vacationDaysEntitlement', 'Calculates', 'On employee select', 'calculateVacationEntitlement(startDate)'],
    ['preavisoDays', 'terminationDate', 'Calculates', 'On preavisoDays change', 'today + preavisoDays'],
    ['terminationDate', 'thirteenthMonthStartDate', 'Calculates', 'On terminationDate change', 'getLastJuly1st(terminationDate)'],
    ['terminationDate', 'thirteenthMonthDays', 'Calculates', 'On terminationDate change', 'calculateThirteenthMonthDays()'],
    ['terminationDate', 'fourteenthMonthStartDate', 'Calculates', 'On terminationDate change', 'getJanuary1stOfYear(terminationDate)'],
    ['terminationDate', 'fourteenthMonthDays', 'Calculates', 'On terminationDate change', 'calculateFourteenthMonthDays()'],
    ['vacationDaysRemaining', 'vacationProportionalDays', 'Direct Copy', 'On vacationDaysRemaining change', '= vacationDaysRemaining'],
    ['lastAnniversaryDate', 'vacationProportionalDays', 'Used in calculation', 'Manual (currently uses remaining)', 'Currently uses remaining days'],
  ];
  
  relationships.forEach(rel => {
    relationshipsSheet.addRow({
      source: rel[0],
      target: rel[1],
      type: rel[2],
      trigger: rel[3],
      formula: rel[4],
    });
  });
  
  // ============================================
  // Sheet 5: Salary Calculations
  // ============================================
  const salarySheet = workbook.addWorksheet('Salary Calculations');
  
  salarySheet.columns = [
    { header: 'Calculation Name', key: 'name', width: 30 },
    { header: 'Formula', key: 'formula', width: 60 },
    { header: 'Description', key: 'description', width: 50 },
  ];
  
  salarySheet.getRow(1).font = { bold: true };
  salarySheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  
  const salaryCalcs = [
    ['Sueldo Mensual Ordinario', 'Last salary or average of last 6 months', 'Base monthly salary'],
    ['Sueldo Mensual Promedio', '(sueldo mensual ordinario * 14) / 12', 'Average monthly salary including 13th and 14th month'],
    ['Sueldo Diario Promedio', 'sueldo mensual promedio / 30', 'Average daily salary'],
    ['Sueldo Diario Base', 'sueldo mensual ordinario / 30', 'Base daily salary'],
  ];
  
  salaryCalcs.forEach(calc => {
    salarySheet.addRow({
      name: calc[0],
      formula: calc[1],
      description: calc[2],
    });
  });
  
  // ============================================
  // Save the file
  // ============================================
  const outputPath = path.join(process.cwd(), 'severance', 'severance-config.xlsx');
  
  // Ensure directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  await workbook.xlsx.writeFile(outputPath);
  console.log(`✅ Excel template created at: ${outputPath}`);
  console.log('\n📋 Sheets created:');
  console.log('  1. Field Definitions - All form fields with their properties');
  console.log('  2. Preaviso Rules - Service period to preaviso days mapping');
  console.log('  3. Calculation Formulas - All calculation logic');
  console.log('  4. Field Relationships - How fields are linked');
  console.log('  5. Salary Calculations - Salary formula definitions');
}

createExcelTemplate().catch(console.error);

