/**
 * CLI Tool for Testing Severance Calculations
 * 
 * Usage:
 *   npm run test:severance
 *   or
 *   tsx src/scripts/test-severance-calc.ts
 * 
 * Or with arguments:
 *   tsx src/scripts/test-severance-calc.ts --salary 30000 --start 2024-02-10 --end 2026-01-06
 */

// Import working functions (do not modify these)
import {
  calculateRequiredPreavisoDays,
  calculateCesantiaDays,
  calculateThirteenthMonthDays,
  calculateFourteenthMonthDays,
  getLastJanuary1st,
  getLastJuly1st,
} from '../lib/severanceFormCalculationsWorking';

// Import problematic functions (these need to be tested and fixed)
import {
  calculateCesantiaProportionalDays,
  calculateVacationProportionalDays,
  getLastAnniversaryDate,
} from '../lib/severanceFormCalculations';

import { calculateVacationEntitlement, calculateCumulativeVacationEntitlement } from '../lib/vacationBalance';

// Helper function to round to 2 decimals
function roundTo2Decimals(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

// Helper function to round currency
function roundCurrency(num: number): number {
  return parseFloat(num.toFixed(2));
}

// Helper function to calculate salary averages
// Note: In the PDF generator, this uses 6-month average, but for testing we use single salary
function calculateSalaryAverages(monthlySalary: number) {
  const baseMonthly = monthlySalary;
  // Usar los ultimos 6 meses para el promedio mensual (en el PDF usa baseAverage de 6 meses)
  // Para el test, usamos el salario mensual como promedio
  const monthlyAverage = monthlySalary; // En producción sería el promedio de 6 meses
  const promAverage = (monthlyAverage * 14) / 12; // Sueldo mensual promedio
  const promDaily = promAverage / 30; // Sueldo diario promedio
  const baseDaily = monthlyAverage / 30; // salario diario promedio basado en los ultimos 6 meses
  
  return {
    baseMonthly,
    promAverage,
    promDaily,
    baseDaily,
  };
}

// Helper function to parse local date string (YYYY-MM-DD) without timezone issues
function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed
}

// Helper function to format currency
function formatCurrency(amount: number): string {
  return `L. ${amount.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Helper function to format date
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseLocalDate(date) : date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Normalize start date: if it's Feb 29, convert to Feb 28 for calculations
 * This ensures calculations work correctly while preserving the original date for display
 */
function normalizeStartDateForCalculations(date: Date | string): Date {
  let d: Date;
  let originalYear: number;
  let originalMonth: number;
  let originalDay: number;
  
  if (typeof date === 'string') {
    // Parse string date (YYYY-MM-DD format)
    const parts = date.split('-').map(Number);
    originalYear = parts[0];
    originalMonth = parts[1]; // 1-12 format
    originalDay = parts[2];
    
    // Check the original string first - if it was Feb 29, normalize to Feb 28
    if (originalMonth === 2 && originalDay === 29) {
      return new Date(originalYear, 1, 28); // month is 0-indexed, so 1 = February
    }
    
    d = new Date(originalYear, originalMonth - 1, originalDay);
  } else {
    d = date;
    originalYear = d.getFullYear();
    originalMonth = d.getMonth() + 1; // Convert to 1-12 format
    originalDay = d.getDate();
  }
  
  // Double-check: if it's February 29th, normalize to February 28th
  if (originalMonth === 2 && originalDay === 29) {
    return new Date(originalYear, 1, 28);
  }
  
  // Also check the Date object's actual values (handles timezone issues)
  const month = d.getMonth();
  const day = d.getDate();
  if (month === 1 && day === 29) {
    const year = d.getFullYear();
    return new Date(year, 1, 28);
  }
  
  return d;
}

// Helper function to calculate service period display
function calculateServicePeriodDisplay(startDate: string, terminationDate: string): string {
  // Normalize Feb 29 to Feb 28 for accurate calculations (matching PDF generator)
  const normalizedStart = normalizeStartDateForCalculations(startDate);
  const start = typeof normalizedStart === 'string' ? parseLocalDate(normalizedStart) : normalizedStart;
  const termination = parseLocalDate(terminationDate);
  
  let years = termination.getFullYear() - start.getFullYear();
  let months = termination.getMonth() - start.getMonth();
  let days = termination.getDate() - start.getDate();
  
  if (days < 0) {
    months--;
    const lastMonth = new Date(termination.getFullYear(), termination.getMonth(), 0);
    days += lastMonth.getDate();
  }
  
  if (months < 0) {
    years--;
    months += 12;
  }
  
  return `${years} año${years !== 1 ? 's' : ''} ${months} mes${months !== 1 ? 'es' : ''} ${days} día${days !== 1 ? 's' : ''}`;
}

function calculateSeverancePayments(
  monthlySalary: number,
  startDate: string,
  terminationDate: string,
  vacationDaysRemaining: number = 0
) {
  // Calculate salary averages
  const salaryAvgs = calculateSalaryAverages(monthlySalary);
  
  // Calculate vacation entitlement (current cycle - for proportional calculation)
  const vacationEntitlement = calculateVacationEntitlement(startDate, terminationDate);
  
  // Calculate cumulative vacation entitlement (stacked across all years - for Vacaciones section)
  const cumulativeVacationEntitlement = calculateCumulativeVacationEntitlement(startDate, terminationDate);
  
  // Calculate preaviso days
  const preavisoDays = calculateRequiredPreavisoDays(startDate);
  
  // Calculate cesantia days
  const cesantiaDays = calculateCesantiaDays(startDate, terminationDate);
  
  // Calculate cesantia proportional days
  const cesantiaProportionalDays = calculateCesantiaProportionalDays(startDate, terminationDate);
  
  // Calculate vacation proportional days
  const vacationProportionalDays = calculateVacationProportionalDays(
    startDate,
    terminationDate,
    vacationEntitlement
  );
  
  // Calculate 13th month days
  const lastJan1st = getLastJanuary1st(terminationDate);
  const thirteenthMonthDays = calculateThirteenthMonthDays(lastJan1st, terminationDate);
  
  // Calculate 14th month days
  const lastJuly1st = getLastJuly1st(terminationDate);
  const fourteenthMonthDays = calculateFourteenthMonthDays(lastJuly1st, terminationDate);

  // Get last anniversary for vacation proportional display
  const lastAnniversary = getLastAnniversaryDate(startDate, terminationDate);
  
  // Calculate payments (matching PDF generator rounding logic)
  const preavisoPay = roundCurrency(preavisoDays * salaryAvgs.promDaily);
  const cesantiaPay = roundCurrency(cesantiaDays * salaryAvgs.promDaily);
  
  // AUXILIO DE CESANTIA PROPORCIONAL: Use full precision for calculation, round only for display
  const cesantiaProDaysFullPrecision = cesantiaProportionalDays; // Already full precision from calculation
  const cesantiaProPay = roundCurrency(cesantiaProDaysFullPrecision * salaryAvgs.promDaily);
  
  // VACACIONES: Use cumulative total (stacked across all years) - matching PDF generation
  const vacationPay = roundCurrency(cumulativeVacationEntitlement * salaryAvgs.promDaily);
  
  // VACACIONES PROPORCIONALES: Use full precision for calculation, round only for display
  const vacationProDaysFullPrecision = vacationProportionalDays; // Already full precision from calculation
  const vacationProPay = roundCurrency(vacationProDaysFullPrecision * salaryAvgs.promDaily);
  
  // DECIMO TERCER MES: Round days first, then multiply, then round currency
  const thirteenthDaysFullPrecision = (thirteenthMonthDays * 30) / 360;
  const thirteenthDaysDisplay = roundTo2Decimals(thirteenthDaysFullPrecision); // Round days first
  const thirteenthPay = roundCurrency(thirteenthDaysDisplay * salaryAvgs.baseDaily); // Multiply rounded days, then round currency
  
  // DECIMO CUARTO MES: Round days first, then multiply, then round currency
  const fourteenthDaysFullPrecision = (fourteenthMonthDays * 30) / 360;
  const fourteenthDaysDisplay = roundTo2Decimals(fourteenthDaysFullPrecision); // Round days first
  const fourteenthPay = roundCurrency(fourteenthDaysDisplay * salaryAvgs.baseDaily); // Multiply rounded days, then round currency
  
  // Total prestaciones
  const totalPrestaciones = preavisoPay + cesantiaPay + cesantiaProPay + 
                            vacationPay + vacationProPay + thirteenthPay + fourteenthPay;
  
  return {
    salaryAvgs,
    preavisoDays,
    preavisoPay,
    cesantiaDays,
    cesantiaPay,
    cesantiaProportionalDays,
    cesantiaProPay,
    vacationDaysRemaining, // Keep for reference
    vacationPay,
    vacationEntitlement, // Current cycle entitlement (for proportional)
    cumulativeVacationEntitlement, // Cumulative total (for Vacaciones section)
    vacationProportionalDays,
    vacationProPay,
    thirteenthMonthDays,
    thirteenthDaysConverted: thirteenthDaysDisplay, // Use rounded display value (matching PDF)
    thirteenthPay,
    fourteenthMonthDays,
    fourteenthDaysConverted: fourteenthDaysDisplay, // Use rounded display value (matching PDF)
    fourteenthPay,
    totalPrestaciones,
    lastJan1st,
    lastJuly1st,
    lastAnniversary,
  };
}

function printResults(results: ReturnType<typeof calculateSeverancePayments>, startDate: string, terminationDate: string, monthlySalary: number) {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('           CÁLCULO DE PRESTACIONES LABORALES');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log(`Fecha de Ingreso:     ${formatDate(startDate)}`);
  console.log(`Fecha de Retiro:      ${formatDate(terminationDate)}`);
  console.log(`Antigüedad:           ${calculateServicePeriodDisplay(startDate, terminationDate)}`);
  console.log(`\nSueldo Mensual Ordinario: ${formatCurrency(monthlySalary)} (${formatCurrency(results.salaryAvgs.baseDaily)} diario)`);
  console.log(`Sueldo Mensual Promedio:  ${formatCurrency(results.salaryAvgs.promAverage)} (${formatCurrency(results.salaryAvgs.promDaily)} diario)\n`);
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                    BENEFICIOS CALCULADOS');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log(`Preaviso:`);
  console.log(`  ${results.preavisoDays.toFixed(2)} días x ${formatCurrency(results.salaryAvgs.promDaily)} = ${formatCurrency(results.preavisoPay)}\n`);
  
  console.log(`Auxilio de Cesantía:`);
  console.log(`  ${results.cesantiaDays.toFixed(2)} días x ${formatCurrency(results.salaryAvgs.promDaily)} = ${formatCurrency(results.cesantiaPay)}\n`);
  
  console.log(`Auxilio de Cesantía Proporcional:`);
  const cesantiaProDaysDisplay = roundTo2Decimals(results.cesantiaProportionalDays);
  console.log(`  ${cesantiaProDaysDisplay.toFixed(2)} días x ${formatCurrency(results.salaryAvgs.promDaily)} = ${formatCurrency(results.cesantiaProPay)}\n`);
  
  console.log(`Vacaciones:`);
  // Display cumulative entitlement instead of remaining days - matching PDF generation
  console.log(`  ${results.cumulativeVacationEntitlement.toFixed(2)} días x ${formatCurrency(results.salaryAvgs.promDaily)} = ${formatCurrency(results.vacationPay)}`);
  console.log(`  (Entitlement acumulado: ${results.cumulativeVacationEntitlement} días, Entitlement ciclo actual: ${results.vacationEntitlement} días)\n`);
  
  console.log(`Vacaciones Proporcionales:`);
  const vacationProDaysDisplay = roundTo2Decimals(results.vacationProportionalDays);
  console.log(`  ${vacationProDaysDisplay.toFixed(2)} días x ${formatCurrency(results.salaryAvgs.promDaily)} = ${formatCurrency(results.vacationProPay)}`);
  console.log(`  (Desde: ${formatDate(results.lastAnniversary)} Hasta: ${formatDate(terminationDate)})\n`);
  
  console.log(`Décimo Tercer Mes:`);
  const thirteenthDaysDisplay = roundTo2Decimals((results.thirteenthMonthDays * 30) / 360);
  console.log(`  ${thirteenthDaysDisplay.toFixed(2)} días x ${formatCurrency(results.salaryAvgs.baseDaily)} = ${formatCurrency(results.thirteenthPay)}`);
  console.log(`  (Desde: ${formatDate(results.lastJan1st)} Hasta: ${formatDate(terminationDate)})\n`);
  
  console.log(`Décimo Cuarto Mes:`);
  const fourteenthDaysDisplay = roundTo2Decimals((results.fourteenthMonthDays * 30) / 360);
  console.log(`  ${fourteenthDaysDisplay.toFixed(2)} días x ${formatCurrency(results.salaryAvgs.baseDaily)} = ${formatCurrency(results.fourteenthPay)}`);
  console.log(`  (Desde: ${formatDate(results.lastJuly1st)} Hasta: ${formatDate(terminationDate)})\n`);
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`TOTAL PRESTACIONES:   ${formatCurrency(results.totalPrestaciones)}`);
  console.log('═══════════════════════════════════════════════════════════════\n');
}

// Interactive CLI
async function runInteractive() {
  const readline = require('readline');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  function askQuestion(query: string): Promise<string> {
    return new Promise(resolve => rl.question(query, resolve));
  }
  
  async function main() {
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║      CALCULADORA DE PRESTACIONES LABORALES - CLI TOOL      ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    
    try {
      const monthlySalaryStr = await askQuestion('Sueldo Mensual (L.): ');
      const monthlySalary = parseFloat(monthlySalaryStr.replace(/[^\d.]/g, ''));
      
      if (isNaN(monthlySalary) || monthlySalary <= 0) {
        throw new Error('Sueldo mensual inválido');
      }
      
      const startDateStr = await askQuestion('Fecha de Ingreso (YYYY-MM-DD): ');
      const startDate = parseLocalDate(startDateStr);
      
      if (isNaN(startDate.getTime())) {
        throw new Error('Fecha de ingreso inválida');
      }
      
      const terminationDateStr = await askQuestion('Fecha de Retiro (YYYY-MM-DD): ');
      const terminationDate = parseLocalDate(terminationDateStr);
      
      if (isNaN(terminationDate.getTime())) {
        throw new Error('Fecha de retiro inválida');
      }
      
      const vacationDaysRemainingStr = await askQuestion('Días de Vacaciones Restantes (opcional, presione Enter para 0): ');
      const vacationDaysRemaining = vacationDaysRemainingStr.trim() === '' 
        ? 0 
        : parseFloat(vacationDaysRemainingStr);
      
      const results = calculateSeverancePayments(
        monthlySalary,
        startDateStr,
        terminationDateStr,
        vacationDaysRemaining || 0
      );
      
      printResults(
        results,
        startDateStr,
        terminationDateStr,
        monthlySalary
      );
      
      const again = await askQuestion('\n¿Calcular otro empleado? (s/n): ');
      if (again.toLowerCase() === 's' || again.toLowerCase() === 'y') {
        console.log('\n');
        main();
      } else {
        rl.close();
        process.exit(0);
      }
    } catch (error: any) {
      console.error(`\n❌ Error: ${error.message}\n`);
      rl.close();
      process.exit(1);
    }
  }
  
  main();
}

// Command line arguments
const args = process.argv.slice(2);

if (args.length > 0) {
  // Parse command line arguments
  let monthlySalary = 0;
  let startDate = '';
  let terminationDate = '';
  let vacationDaysRemaining = 0;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--salary' || args[i] === '-s') {
      monthlySalary = parseFloat(args[++i]);
    } else if (args[i] === '--start' || args[i] === '--start-date') {
      startDate = args[++i];
    } else if (args[i] === '--end' || args[i] === '--end-date' || args[i] === '--termination') {
      terminationDate = args[++i];
    } else if (args[i] === '--vacation' || args[i] === '-v') {
      vacationDaysRemaining = parseFloat(args[++i]);
    }
  }
  
  if (monthlySalary && startDate && terminationDate) {
    const results = calculateSeverancePayments(
      monthlySalary,
      startDate,
      terminationDate,
      vacationDaysRemaining
    );
    
    printResults(results, startDate, terminationDate, monthlySalary);
  } else {
    console.log('Usage:');
    console.log('  Interactive mode: npm run test:severance');
    console.log('  With arguments: npm run test:severance -- --salary 30000 --start 2024-02-10 --end 2026-01-06');
    console.log('\nArguments:');
    console.log('  --salary, -s        Monthly salary (L.)');
    console.log('  --start             Start date (YYYY-MM-DD)');
    console.log('  --end, --termination Termination date (YYYY-MM-DD)');
    console.log('  --vacation, -v      Remaining vacation days (optional)');
  }
} else {
  // Interactive mode
  runInteractive().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

