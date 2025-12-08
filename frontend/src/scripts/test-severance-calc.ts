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
} from '../lib/severanceFormCalculations';

import { calculateVacationEntitlement } from '../lib/vacationBalance';

// Helper function to calculate salary averages
function calculateSalaryAverages(monthlySalary: number) {
  const baseMonthly = monthlySalary;
  const promAverage = (baseMonthly * 14) / 12; // Sueldo mensual promedio
  const promDaily = promAverage / 30; // Sueldo diario promedio
  const baseDaily = baseMonthly / 30; // Sueldo diario ordinario
  
  return {
    baseMonthly,
    promAverage,
    promDaily,
    baseDaily,
  };
}

// Helper function to format currency
function formatCurrency(amount: number): string {
  return `L. ${amount.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Helper function to format date
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// Helper function to calculate service period display
function calculateServicePeriodDisplay(startDate: string, terminationDate: string): string {
  const start = new Date(startDate);
  const termination = new Date(terminationDate);
  
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
  
  // Calculate vacation entitlement
  const vacationEntitlement = calculateVacationEntitlement(startDate, terminationDate);
  
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
  const thirteenthDaysConverted = (thirteenthMonthDays * 30) / 360;
  
  // Calculate 14th month days
  const lastJuly1st = getLastJuly1st(terminationDate);
  const fourteenthMonthDays = calculateFourteenthMonthDays(lastJuly1st, terminationDate);
  const fourteenthDaysConverted = (fourteenthMonthDays * 30) / 360;
  
  // Calculate payments
  const preavisoPay = preavisoDays * salaryAvgs.promDaily;
  const cesantiaPay = cesantiaDays * salaryAvgs.promDaily;
  const cesantiaProPay = cesantiaProportionalDays * salaryAvgs.promDaily;
  const vacationPay = vacationDaysRemaining * salaryAvgs.promDaily;
  const vacationProPay = vacationProportionalDays * salaryAvgs.promDaily;
  const thirteenthPay = thirteenthDaysConverted * salaryAvgs.baseDaily;
  const fourteenthPay = fourteenthDaysConverted * salaryAvgs.baseDaily;
  
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
    vacationDaysRemaining,
    vacationPay,
    vacationEntitlement,
    vacationProportionalDays,
    vacationProPay,
    thirteenthMonthDays,
    thirteenthDaysConverted,
    thirteenthPay,
    fourteenthMonthDays,
    fourteenthDaysConverted,
    fourteenthPay,
    totalPrestaciones,
    lastJan1st,
    lastJuly1st,
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
  console.log(`  ${results.cesantiaProportionalDays.toFixed(2)} días x ${formatCurrency(results.salaryAvgs.promDaily)} = ${formatCurrency(results.cesantiaProPay)}\n`);
  
  console.log(`Vacaciones:`);
  console.log(`  ${results.vacationDaysRemaining.toFixed(2)} días x ${formatCurrency(results.salaryAvgs.promDaily)} = ${formatCurrency(results.vacationPay)}`);
  console.log(`  (Entitlement: ${results.vacationEntitlement} días)\n`);
  
  console.log(`Vacaciones Proporcionales:`);
  console.log(`  ${results.vacationProportionalDays.toFixed(2)} días x ${formatCurrency(results.salaryAvgs.promDaily)} = ${formatCurrency(results.vacationProPay)}`);
  console.log(`  (Desde: ${formatDate(results.lastJan1st)} Hasta: ${formatDate(terminationDate)})\n`);
  
  console.log(`Décimo Tercer Mes:`);
  console.log(`  ${results.thirteenthDaysConverted.toFixed(2)} días x ${formatCurrency(results.salaryAvgs.baseDaily)} = ${formatCurrency(results.thirteenthPay)}`);
  console.log(`  (Desde: ${formatDate(results.lastJan1st)} Hasta: ${formatDate(terminationDate)})\n`);
  
  console.log(`Décimo Cuarto Mes:`);
  console.log(`  ${results.fourteenthDaysConverted.toFixed(2)} días x ${formatCurrency(results.salaryAvgs.baseDaily)} = ${formatCurrency(results.fourteenthPay)}`);
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
      const startDate = new Date(startDateStr);
      
      if (isNaN(startDate.getTime())) {
        throw new Error('Fecha de ingreso inválida');
      }
      
      const terminationDateStr = await askQuestion('Fecha de Retiro (YYYY-MM-DD): ');
      const terminationDate = new Date(terminationDateStr);
      
      if (isNaN(terminationDate.getTime())) {
        throw new Error('Fecha de retiro inválida');
      }
      
      const vacationDaysRemainingStr = await askQuestion('Días de Vacaciones Restantes (opcional, presione Enter para 0): ');
      const vacationDaysRemaining = vacationDaysRemainingStr.trim() === '' 
        ? 0 
        : parseFloat(vacationDaysRemainingStr);
      
      const results = calculateSeverancePayments(
        monthlySalary,
        startDate.toISOString().split('T')[0],
        terminationDate.toISOString().split('T')[0],
        vacationDaysRemaining || 0
      );
      
      printResults(
        results,
        startDate.toISOString().split('T')[0],
        terminationDate.toISOString().split('T')[0],
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

