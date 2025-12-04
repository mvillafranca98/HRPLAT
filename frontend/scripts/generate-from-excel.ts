/**
 * Script to read Excel configuration and generate TypeScript calculation code
 * Run with: npx tsx scripts/generate-from-excel.ts
 */

import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

interface PreavisoRule {
  description: string;
  minMonths?: number;
  maxMonths?: number;
  minYears?: number;
  maxYears?: number;
  days: number;
  notes?: string;
}

async function generateFromExcel() {
  const excelPath = path.join(process.cwd(), '..', 'severance', 'severance-config.xlsx');
  
  if (!fs.existsSync(excelPath)) {
    console.error(`❌ Excel file not found at: ${excelPath}`);
    console.log('   Please run: npx tsx scripts/create-excel-template.ts first');
    process.exit(1);
  }
  
  console.log('📖 Reading Excel configuration...');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);
  
  // Read Preaviso Rules
  const preavisoSheet = workbook.getWorksheet('Preaviso Rules');
  if (!preavisoSheet) {
    throw new Error('Preaviso Rules sheet not found');
  }
  
  const preavisoRules: PreavisoRule[] = [];
  preavisoSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header
    
    const values = row.values as any[];
    if (!values[1]) return; // Skip empty rows
    
    preavisoRules.push({
      description: values[1] || '',
      minMonths: values[2] ? parseInt(values[2]) : undefined,
      maxMonths: values[3] ? parseInt(values[3]) : undefined,
      minYears: values[4] ? parseInt(values[4]) : undefined,
      maxYears: values[5] ? parseInt(values[5]) : undefined,
      days: parseInt(values[6]) || 0,
      notes: values[7] || '',
    });
  });
  
  console.log(`   ✓ Loaded ${preavisoRules.length} preaviso rules`);
  
  // Read Calculation Formulas
  const formulasSheet = workbook.getWorksheet('Calculation Formulas');
  if (!formulasSheet) {
    throw new Error('Calculation Formulas sheet not found');
  }
  
  const formulas: Array<{
    fieldName: string;
    type: string;
    formula: string;
    dependencies: string;
    notes: string;
  }> = [];
  
  formulasSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header
    
    const values = row.values as any[];
    if (!values[1]) return; // Skip empty rows
    
    formulas.push({
      fieldName: values[1] || '',
      type: values[2] || '',
      formula: values[3] || '',
      dependencies: values[4] || '',
      notes: values[5] || '',
    });
  });
  
  console.log(`   ✓ Loaded ${formulas.length} calculation formulas`);
  
  // Read Field Relationships
  const relationshipsSheet = workbook.getWorksheet('Field Relationships');
  if (!relationshipsSheet) {
    throw new Error('Field Relationships sheet not found');
  }
  
  const relationships: Array<{
    source: string;
    target: string;
    type: string;
    trigger: string;
    formula: string;
  }> = [];
  
  relationshipsSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header
    
    const values = row.values as any[];
    if (!values[1]) return; // Skip empty rows
    
    relationships.push({
      source: values[1] || '',
      target: values[2] || '',
      type: values[3] || '',
      trigger: values[4] || '',
      formula: values[5] || '',
    });
  });
  
  console.log(`   ✓ Loaded ${relationships.length} field relationships`);
  
  // Generate TypeScript code for preaviso calculation
  let preavisoCode = generatePreavisoFunction(preavisoRules);
  
  // Save generated code
  const outputPath = path.join(process.cwd(), 'frontend', 'src', 'lib', 'severanceFormCalculations.generated.ts');
  
  const generatedCode = `/**
 * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 * This file is generated from severance-config.xlsx
 * To modify, edit the Excel file and run: npm run generate:severance
 * Generated on: ${new Date().toISOString()}
 */

${preavisoCode}

// Export configuration data for reference
export const SEVERANCE_CONFIG = {
  preavisoRules: ${JSON.stringify(preavisoRules, null, 2)},
  formulas: ${JSON.stringify(formulas, null, 2)},
  relationships: ${JSON.stringify(relationships, null, 2)},
} as const;
`;
  
  fs.writeFileSync(outputPath, generatedCode, 'utf-8');
  console.log(`\n✅ Generated code saved to: ${outputPath}`);
  console.log('\n📝 Next steps:');
  console.log('  1. Review the generated code');
  console.log('  2. Update severanceFormCalculations.ts to import from generated file');
  console.log('  3. Test the calculations');
}

function generatePreavisoFunction(rules: PreavisoRule[]): string {
  let code = `/**
 * Calculate required preaviso days based on years of service
 * AUTO-GENERATED from Excel configuration
 */
export function calculateRequiredPreavisoDays(startDate: string | Date): number {
  if (!startDate) return 0;
  
  const servicePeriod = calculateServicePeriodToToday(startDate);
  const totalMonths = servicePeriod.totalMonths;
  
`;
  
  // Generate conditions based on rules
  rules.forEach((rule, index) => {
    const isLast = index === rules.length - 1;
    
    if (rule.minMonths !== undefined && rule.maxMonths !== undefined) {
      // Month-based rule
      if (rule.minMonths === 0) {
        code += `  // ${rule.description}\n`;
        code += `  if (totalMonths < ${rule.maxMonths + 1}) {\n`;
        code += `    return ${rule.days};\n`;
        code += `  }\n\n`;
      } else {
        code += `  // ${rule.description}\n`;
        code += `  if (totalMonths >= ${rule.minMonths} && totalMonths <= ${rule.maxMonths}) {\n`;
        code += `    return ${rule.days};\n`;
        code += `  }\n\n`;
      }
    } else if (rule.minYears !== undefined && rule.maxYears !== undefined) {
      // Year-based rule
      if (rule.maxYears === 999) {
        code += `  // ${rule.description}\n`;
        code += `  if (servicePeriod.years >= ${rule.minYears}) {\n`;
        code += `    return ${rule.days};\n`;
        code += `  }\n\n`;
      } else {
        code += `  // ${rule.description}\n`;
        code += `  if (servicePeriod.years >= ${rule.minYears} && servicePeriod.years <= ${rule.maxYears}) {\n`;
        code += `    return ${rule.days};\n`;
        code += `  }\n\n`;
      }
    }
  });
  
  code += `  return 0;\n`;
  code += `}\n`;
  
  // Add helper function if not exists
  code += `
/**
 * Calculate service period (years, months, days) from start date to current date
 */
function calculateServicePeriodToToday(startDate: string | Date): { years: number; months: number; days: number; totalMonths: number } {
  if (!startDate) return { years: 0, months: 0, days: 0, totalMonths: 0 };
  
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const today = new Date();
  
  if (isNaN(start.getTime())) {
    return { years: 0, months: 0, days: 0, totalMonths: 0 };
  }
  
  // Set both dates to midnight for accurate calculation
  const startCopy = new Date(start);
  startCopy.setHours(0, 0, 0, 0);
  const todayCopy = new Date(today);
  todayCopy.setHours(0, 0, 0, 0);
  
  let years = todayCopy.getFullYear() - startCopy.getFullYear();
  let months = todayCopy.getMonth() - startCopy.getMonth();
  let days = todayCopy.getDate() - startCopy.getDate();
  
  if (days < 0) {
    months--;
    const lastMonth = new Date(todayCopy.getFullYear(), todayCopy.getMonth(), 0);
    days += lastMonth.getDate();
  }
  
  if (months < 0) {
    years--;
    months += 12;
  }
  
  const totalMonths = years * 12 + months;
  
  return { years, months, days, totalMonths };
}
`;
  
  return code;
}

generateFromExcel().catch(console.error);

