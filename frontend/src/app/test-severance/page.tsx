'use client';

import { useState } from 'react';
// Import working functions (do not modify these)
import {
  calculateRequiredPreavisoDays,
  calculateCesantiaDays,
  calculateThirteenthMonthDays,
  calculateFourteenthMonthDays,
  getLastJanuary1st,
  getLastJuly1st,
} from '@/lib/severanceFormCalculationsWorking';

// Import problematic functions (these need to be tested and fixed)
import {
  calculateCesantiaProportionalDays,
  calculateVacationProportionalDays,
} from '@/lib/severanceFormCalculations';

import { calculateVacationEntitlement } from '@/lib/vacationBalance';

// Helper function to calculate salary averages
function calculateSalaryAverages(monthlySalary: number) {
  const baseMonthly = monthlySalary;
  const promAverage = (baseMonthly * 14) / 12;
  const promDaily = promAverage / 30;
  const baseDaily = baseMonthly / 30;
  
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

interface CalculationResults {
  salaryAvgs: ReturnType<typeof calculateSalaryAverages>;
  preavisoDays: number;
  preavisoPay: number;
  cesantiaDays: number;
  cesantiaPay: number;
  cesantiaProportionalDays: number;
  cesantiaProPay: number;
  vacationDaysRemaining: number;
  vacationPay: number;
  vacationEntitlement: number;
  vacationProportionalDays: number;
  vacationProPay: number;
  thirteenthMonthDays: number;
  thirteenthDaysConverted: number;
  thirteenthPay: number;
  fourteenthMonthDays: number;
  fourteenthDaysConverted: number;
  fourteenthPay: number;
  totalPrestaciones: number;
  lastJan1st: Date;
  lastJuly1st: Date;
}

export default function TestSeverancePage() {
  const [monthlySalary, setMonthlySalary] = useState<string>('30000');
  const [startDate, setStartDate] = useState<string>('2024-02-10');
  const [terminationDate, setTerminationDate] = useState<string>('2026-01-06');
  const [vacationDaysRemaining, setVacationDaysRemaining] = useState<string>('10');
  const [results, setResults] = useState<CalculationResults | null>(null);
  const [error, setError] = useState<string>('');

  const calculate = () => {
    try {
      setError('');
      
      const salary = parseFloat(monthlySalary.replace(/[^\d.]/g, ''));
      if (isNaN(salary) || salary <= 0) {
        throw new Error('Sueldo mensual inválido');
      }

      if (!startDate || !terminationDate) {
        throw new Error('Fechas requeridas');
      }

      const start = new Date(startDate);
      const termination = new Date(terminationDate);

      if (isNaN(start.getTime()) || isNaN(termination.getTime())) {
        throw new Error('Fechas inválidas');
      }

      if (termination < start) {
        throw new Error('La fecha de retiro debe ser posterior a la fecha de ingreso');
      }

      const vacationDays = parseFloat(vacationDaysRemaining) || 0;

      // Calculate salary averages
      const salaryAvgs = calculateSalaryAverages(salary);

      // Calculate vacation entitlement
      const vacationEntitlement = calculateVacationEntitlement(startDate, termination);

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
      const vacationPay = vacationDays * salaryAvgs.promDaily;
      const vacationProPay = vacationProportionalDays * salaryAvgs.promDaily;
      const thirteenthPay = thirteenthDaysConverted * salaryAvgs.baseDaily;
      const fourteenthPay = fourteenthDaysConverted * salaryAvgs.baseDaily;

      // Total prestaciones
      const totalPrestaciones = preavisoPay + cesantiaPay + cesantiaProPay +
        vacationPay + vacationProPay + thirteenthPay + fourteenthPay;

      setResults({
        salaryAvgs,
        preavisoDays,
        preavisoPay,
        cesantiaDays,
        cesantiaPay,
        cesantiaProportionalDays,
        cesantiaProPay,
        vacationDaysRemaining: vacationDays,
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
      });
    } catch (err: any) {
      setError(err.message || 'Error al calcular');
      setResults(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            Calculadora de Prestaciones Laborales - Pruebas
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sueldo Mensual (L.)
              </label>
              <input
                type="text"
                value={monthlySalary}
                onChange={(e) => setMonthlySalary(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="30000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Días de Vacaciones Restantes
              </label>
              <input
                type="number"
                value={vacationDaysRemaining}
                onChange={(e) => setVacationDaysRemaining(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Ingreso
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Retiro
              </label>
              <input
                type="date"
                value={terminationDate}
                onChange={(e) => setTerminationDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
              {error}
            </div>
          )}

          <button
            onClick={calculate}
            className="w-full md:w-auto px-8 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium"
          >
            Calcular Prestaciones
          </button>
        </div>

        {results && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center border-b pb-4">
              Resultados del Cálculo
            </h2>

            {/* Employee Info */}
            <div className="mb-6 pb-6 border-b">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Fecha de Ingreso:</span>{' '}
                  <span className="text-gray-900">{formatDate(startDate)}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Fecha de Retiro:</span>{' '}
                  <span className="text-gray-900">{formatDate(terminationDate)}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Antigüedad:</span>{' '}
                  <span className="text-gray-900">{calculateServicePeriodDisplay(startDate, terminationDate)}</span>
                </div>
              </div>
            </div>

            {/* Salary Info */}
            <div className="mb-6 pb-6 border-b">
              <h3 className="font-semibold text-gray-800 mb-3">Información de Salario</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Sueldo Mensual Ordinario:</span>{' '}
                  <span className="text-gray-900">{formatCurrency(results.salaryAvgs.baseMonthly)}</span>
                  <span className="text-gray-600 ml-2">({formatCurrency(results.salaryAvgs.baseDaily)} diario)</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Sueldo Mensual Promedio:</span>{' '}
                  <span className="text-gray-900">{formatCurrency(results.salaryAvgs.promAverage)}</span>
                  <span className="text-gray-600 ml-2">({formatCurrency(results.salaryAvgs.promDaily)} diario)</span>
                </div>
              </div>
            </div>

            {/* Calculations Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Beneficio</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Días</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Tasa Diaria</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3 font-medium text-gray-900">Preaviso</td>
                    <td className="px-4 py-3 text-right text-gray-700">{results.preavisoDays.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(results.salaryAvgs.promDaily)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(results.preavisoPay)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-gray-900">Auxilio de Cesantía</td>
                    <td className="px-4 py-3 text-right text-gray-700">{results.cesantiaDays.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(results.salaryAvgs.promDaily)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(results.cesantiaPay)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-gray-900">Auxilio de Cesantía Proporcional</td>
                    <td className="px-4 py-3 text-right text-gray-700">{results.cesantiaProportionalDays.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(results.salaryAvgs.promDaily)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(results.cesantiaProPay)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-gray-900">Vacaciones</td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {results.vacationDaysRemaining.toFixed(2)}
                      <span className="text-gray-500 text-xs ml-1">(Entitlement: {results.vacationEntitlement})</span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(results.salaryAvgs.promDaily)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(results.vacationPay)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      Vacaciones Proporcionales
                      <div className="text-xs font-normal text-gray-500 mt-1">
                        Desde: {formatDate(results.lastJan1st)} Hasta: {formatDate(terminationDate)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{results.vacationProportionalDays.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(results.salaryAvgs.promDaily)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(results.vacationProPay)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      Décimo Tercer Mes
                      <div className="text-xs font-normal text-gray-500 mt-1">
                        Desde: {formatDate(results.lastJan1st)} Hasta: {formatDate(terminationDate)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{results.thirteenthDaysConverted.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(results.salaryAvgs.baseDaily)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(results.thirteenthPay)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      Décimo Cuarto Mes
                      <div className="text-xs font-normal text-gray-500 mt-1">
                        Desde: {formatDate(results.lastJuly1st)} Hasta: {formatDate(terminationDate)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{results.fourteenthDaysConverted.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(results.salaryAvgs.baseDaily)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(results.fourteenthPay)}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="bg-blue-50 border-t-2 border-blue-200">
                    <td colSpan={3} className="px-4 py-4 text-right font-bold text-lg text-gray-900">
                      TOTAL PRESTACIONES:
                    </td>
                    <td className="px-4 py-4 text-right font-bold text-lg text-blue-600">
                      {formatCurrency(results.totalPrestaciones)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Raw Values for Debugging */}
            <details className="mt-6 pt-6 border-t">
              <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800">
                Ver valores detallados (para depuración)
              </summary>
              <div className="mt-4 p-4 bg-gray-50 rounded-md text-xs font-mono space-y-1">
                <div><strong>Preaviso Days:</strong> {results.preavisoDays}</div>
                <div><strong>Cesantia Days:</strong> {results.cesantiaDays}</div>
                <div><strong>Cesantia Proportional Days:</strong> {results.cesantiaProportionalDays}</div>
                <div><strong>Vacation Entitlement:</strong> {results.vacationEntitlement}</div>
                <div><strong>Vacation Proportional Days:</strong> {results.vacationProportionalDays}</div>
                <div><strong>13th Month Raw Days:</strong> {results.thirteenthMonthDays}</div>
                <div><strong>13th Month Converted:</strong> {results.thirteenthDaysConverted}</div>
                <div><strong>14th Month Raw Days:</strong> {results.fourteenthMonthDays}</div>
                <div><strong>14th Month Converted:</strong> {results.fourteenthDaysConverted}</div>
                <div><strong>Last Jan 1st:</strong> {formatDate(results.lastJan1st)}</div>
                <div><strong>Last July 1st:</strong> {formatDate(results.lastJuly1st)}</div>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}

