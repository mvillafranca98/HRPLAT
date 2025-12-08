'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// Import working calculations (do not modify these)
import {
  calculatePreavisoDays,
  calculateRequiredPreavisoDays,
  calculateTerminationDateFromPreaviso,
  calculateCesantiaDays,
  getLastJanuary1st,
  calculateThirteenthMonthDays,
  getJanuary1stOfTerminationYear,
  getLastJuly1st,
  calculateFourteenthMonthDays,
  getJuly1stOfTerminationYear,
  formatDateForInput,
} from '@/lib/severanceFormCalculationsWorking';

// Import problematic calculations (these need to be fixed)
import {
  calculateVacationProportionalDays,
  calculateCesantiaProportionalDays,
} from '@/lib/severanceFormCalculations';

interface SalaryHistory {
  month: string;
  year: number;
  amount: number;
  overtime?: number;
}

interface SeveranceFormData {
  // Employee Info
  employeeName: string;
  dni: string;
  terminationReason: string;
  startDate: string;
  terminationDate: string;
  lastAnniversaryDate: string;
  
  // Vacation Info
  vacationDaysRemaining: number;
  vacationDaysEntitlement: number;
  
  // Salary Info
  salaryHistory: SalaryHistory[];
  
  // Benefits
  preavisoDays: number;
  cesantiaDays: number;
  cesantiaProportionalDays: number;
  vacationBonusDays: number;
  vacationProportionalDays: number;
  thirteenthMonthDays: number;
  thirteenthMonthStartDate: string;
  fourteenthMonthDays: number;
  fourteenthMonthStartDate: string;
  
  // Additional Payments
  salariesDue: number;
  overtimeDue: number;
  otherPayments: number;
  seventhDayPayment: number;
  wageAdjustment: number;
  educationalBonus: number;
  
  // Deductions
  municipalTax: number;
  preavisoPenalty: number;
}

interface Employee {
  id: string;
  name: string | null;
  email: string;
  dni: string | null;
}

export default function SeveranceCalculator() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [error, setError] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [loadingEmployeeData, setLoadingEmployeeData] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [formData, setFormData] = useState<SeveranceFormData>({
    employeeName: '',
    dni: '',
    terminationReason: 'Renuncia',
    startDate: '',
    terminationDate: '',
    lastAnniversaryDate: '',
    vacationDaysRemaining: 0,
    vacationDaysEntitlement: 0,
    salaryHistory: [],
    preavisoDays: 30,
    cesantiaDays: 0,
    cesantiaProportionalDays: 0,
    vacationBonusDays: 0,
    vacationProportionalDays: 0,
    thirteenthMonthDays: 0,
    thirteenthMonthStartDate: '',
    fourteenthMonthDays: 0,
    fourteenthMonthStartDate: '',
    salariesDue: 0,
    overtimeDue: 0,
    otherPayments: 0,
    seventhDayPayment: 0,
    wageAdjustment: 0,
    educationalBonus: 0,
    municipalTax: 0,
    preavisoPenalty: 0,
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('userRole');
      setUserRole(role);
      
      // Only Admin and HR_Staff can access
      if (role !== 'Admin' && role !== 'HR_Staff') {
        router.push('/dashboard');
      } else {
        // Fetch employees list
        fetchEmployees();
      }
    }
  }, [router]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees?limit=1000');
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees || []);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  const handleEmployeeSelect = async (employeeId: string) => {
    if (!employeeId) {
      setSelectedEmployeeId('');
      return;
    }

    setSelectedEmployeeId(employeeId);
    setLoadingEmployeeData(true);
    setError('');

    try {
      const userEmail = localStorage.getItem('userEmail') || '';
      const userRole = localStorage.getItem('userRole') || '';

      const response = await fetch(`/api/severance/employee-data?id=${employeeId}`, {
        headers: {
          'x-user-email': userEmail,
          'x-user-role': userRole,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const selectedEmployee = employees.find(e => e.id === employeeId);
        
        // Calculate required preaviso days based on service period
        const requiredPreavisoDays = data.startDate 
          ? calculateRequiredPreavisoDays(data.startDate)
          : 0;
        
        // Calculate termination date (current date + preaviso days)
        const terminationDate = requiredPreavisoDays > 0
          ? calculateTerminationDateFromPreaviso(requiredPreavisoDays)
          : new Date();
        
        const terminationDateStr = formatDateForInput(terminationDate);
        
        // Calculate cesantia days
        const cesantiaDays = data.startDate && terminationDateStr
          ? calculateCesantiaDays(data.startDate, terminationDateStr)
          : 0;
        
        // Calculate cesantia proportional days
        const cesantiaProportionalDays = data.startDate && terminationDateStr
          ? calculateCesantiaProportionalDays(data.startDate, terminationDateStr)
          : 0;
        
        // Calculate vacation proportional days (new formula)
        const vacationProportionalDays = data.startDate && terminationDateStr && data.vacationDaysEntitlement
          ? calculateVacationProportionalDays(data.startDate, terminationDateStr, data.vacationDaysEntitlement)
          : 0;
        
        // Calculate 13th Month dates (NOW USES JANUARY 1ST)
        // Start date: January 1st of termination year
        const thirteenthMonthStart = getJanuary1stOfTerminationYear(terminationDateStr);
        const thirteenthMonthStartDateStr = formatDateForInput(thirteenthMonthStart);
        // For calculation: use last January 1st (most recent before termination)
        const lastJanuary1st = getLastJanuary1st(terminationDateStr);
        const thirteenthMonthDays = calculateThirteenthMonthDays(
          lastJanuary1st,
          terminationDateStr
        );
        
        // Calculate 14th Month dates (NOW USES JULY 1ST)
        // Start date: July 1st of termination year
        const fourteenthMonthStart = getJuly1stOfTerminationYear(terminationDateStr);
        const fourteenthMonthStartDateStr = formatDateForInput(fourteenthMonthStart);
        // For calculation: use last July 1st (most recent before termination)
        const lastJuly1st = getLastJuly1st(terminationDateStr);
        const fourteenthMonthDays = calculateFourteenthMonthDays(
          lastJuly1st,
          terminationDateStr
        );
        
        // Auto-fill form with employee data
        setFormData(prev => ({
          ...prev,
          employeeName: selectedEmployee?.name || selectedEmployee?.email || '',
          dni: data.dni || '',
          startDate: data.startDate || '',
          lastAnniversaryDate: data.lastAnniversaryDate || '',
          vacationDaysRemaining: data.vacationDaysRemaining || 0,
          vacationDaysEntitlement: data.vacationDaysEntitlement || 0,
          salaryHistory: data.salaryHistory || [],
          preavisoDays: requiredPreavisoDays,
          terminationDate: terminationDateStr,
          cesantiaDays,
          cesantiaProportionalDays,
          vacationProportionalDays,
          // 13th Month calculations (NOW JANUARY 1ST)
          thirteenthMonthStartDate: thirteenthMonthStartDateStr,
          thirteenthMonthDays,
          // 14th Month calculations (NOW JULY 1ST)
          fourteenthMonthStartDate: fourteenthMonthStartDateStr,
          fourteenthMonthDays,
        }));
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error al cargar datos del empleado');
      }
    } catch (err: any) {
      console.error('Error loading employee data:', err);
      setError('Error al cargar datos del empleado');
    } finally {
      setLoadingEmployeeData(false);
    }
  };

  // Filter employees based on search
  const filteredEmployees = employees.filter(emp => {
    if (!employeeSearch.trim()) return true;
    const search = employeeSearch.toLowerCase();
    return (
      (emp.name?.toLowerCase().includes(search)) ||
      (emp.email?.toLowerCase().includes(search)) ||
      (emp.dni?.toLowerCase().includes(search))
    );
  });

  // Auto-calculate preaviso days and termination date when start date changes
  useEffect(() => {
    if (!formData.startDate) {
      return;
    }

    // Calculate required preaviso days based on service period
    const requiredPreavisoDays = calculateRequiredPreavisoDays(formData.startDate);
    
    // Calculate termination date (current date + preaviso days)
    const terminationDate = requiredPreavisoDays > 0
      ? calculateTerminationDateFromPreaviso(requiredPreavisoDays)
      : new Date();
    
    const terminationDateStr = formatDateForInput(terminationDate);
    
    setFormData(prev => ({
      ...prev,
      preavisoDays: requiredPreavisoDays,
      terminationDate: terminationDateStr,
    }));
  }, [formData.startDate]);

  // Auto-calculate fields when start date or termination date changes
  const startDate = formData.startDate || '';
  const terminationDate = formData.terminationDate || '';
  const vacationDaysEntitlement = formData.vacationDaysEntitlement || 0;
  
  useEffect(() => {
    if (!startDate || !terminationDate) {
      return;
    }

    // Calculate Preaviso Days - Always use required preaviso days based on service period
    const requiredPreavisoDays = calculateRequiredPreavisoDays(startDate);
    
    // Calculate cesantia days
    const cesantiaDays = calculateCesantiaDays(startDate, terminationDate);
    
    // Calculate cesantia proportional days
    const cesantiaProportionalDays = calculateCesantiaProportionalDays(startDate, terminationDate);
    
    // Calculate vacation proportional days (new formula: from startDate to terminationDate)
    const vacationProportionalDays = vacationDaysEntitlement
      ? calculateVacationProportionalDays(startDate, terminationDate, vacationDaysEntitlement)
      : 0;
    
    setFormData(prev => ({
      ...prev,
      preavisoDays: requiredPreavisoDays,
      cesantiaDays,
      cesantiaProportionalDays,
      vacationProportionalDays,
    }));
  }, [startDate, terminationDate, vacationDaysEntitlement]);

  // Auto-calculate 13th and 14th month when termination date changes
  const terminationDateForMonths = formData.terminationDate || '';
  
  useEffect(() => {
    if (!terminationDateForMonths) {
      return;
    }

    // Calculate 13th Month (Décimo Tercer Mes) - NOW USES JANUARY 1ST
    // Start date: January 1st of termination year
    const thirteenthMonthStart = getJanuary1stOfTerminationYear(terminationDateForMonths);
    const thirteenthMonthStartDateStr = formatDateForInput(thirteenthMonthStart);
    // For calculation: use last January 1st (most recent before termination)
    const lastJanuary1st = getLastJanuary1st(terminationDateForMonths);
    const thirteenthMonthDays = calculateThirteenthMonthDays(
      lastJanuary1st,
      terminationDateForMonths
    );
    
    // Calculate 14th Month (Décimo Cuarto Mes) - NOW USES JULY 1ST
    // For calculation and display: use last July 1st (most recent before termination)
    const lastJuly1st = getLastJuly1st(terminationDateForMonths);
    const fourteenthMonthStartDateStr = formatDateForInput(lastJuly1st);
    const fourteenthMonthDays = calculateFourteenthMonthDays(
      lastJuly1st,
      terminationDateForMonths
    );
    
    setFormData(prev => ({
      ...prev,
      thirteenthMonthStartDate: thirteenthMonthStartDateStr,
      thirteenthMonthDays,
      fourteenthMonthStartDate: fourteenthMonthStartDateStr,
      fourteenthMonthDays,
    }));
  }, [terminationDateForMonths]);

  const addSalaryMonth = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    
    setFormData(prev => ({
      ...prev,
      salaryHistory: [
        ...prev.salaryHistory,
        {
          month: months[currentMonth],
          year: currentYear,
          amount: 0,
          overtime: 0,
        }
      ]
    }));
  };

  const removeSalaryMonth = (index: number) => {
    setFormData(prev => ({
      ...prev,
      salaryHistory: prev.salaryHistory.filter((_, i) => i !== index)
    }));
  };

  const updateSalaryHistory = (index: number, field: keyof SalaryHistory, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      salaryHistory: prev.salaryHistory.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setGeneratingPDF(true);

    try {
      const userEmail = localStorage.getItem('userEmail') || '';
      const userRole = localStorage.getItem('userRole') || '';

      const response = await fetch('/api/severance/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': userEmail,
          'x-user-role': userRole,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('pdf')) {
          const errorText = await response.text();
          setError(`Error inesperado: ${errorText}`);
          return;
        }

        // Download the PDF file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        const contentDisposition = response.headers.get('content-disposition');
        let fileName = `prestaciones_${formData.dni}_${formData.terminationDate}.pdf`;
        if (contentDisposition) {
          const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
          if (fileNameMatch) {
            fileName = fileNameMatch[1];
          }
        }

        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const responseText = await response.text();
        let errorMessage = 'Error al generar el PDF de prestaciones';
        
        if (responseText && responseText.trim() !== '') {
          try {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.error || errorData.message || errorMessage;
            if (errorData.details) {
              errorMessage += `: ${errorData.details}`;
            }
          } catch (jsonError) {
            errorMessage = responseText.length > 200 
              ? `${errorMessage}: ${responseText.substring(0, 200)}...`
              : `${errorMessage}: ${responseText}`;
          }
        }
        
        setError(errorMessage);
      }
    } catch (err: any) {
      console.error('Error generating PDF:', err);
      setError(err.message || 'Error al generar el PDF de prestaciones.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  if (userRole !== 'Admin' && userRole !== 'HR_Staff') {
    return null; // Will redirect
  }

  const months = [
    { value: 'enero', label: 'Enero' },
    { value: 'febrero', label: 'Febrero' },
    { value: 'marzo', label: 'Marzo' },
    { value: 'abril', label: 'Abril' },
    { value: 'mayo', label: 'Mayo' },
    { value: 'junio', label: 'Junio' },
    { value: 'julio', label: 'Julio' },
    { value: 'agosto', label: 'Agosto' },
    { value: 'septiembre', label: 'Septiembre' },
    { value: 'octubre', label: 'Octubre' },
    { value: 'noviembre', label: 'Noviembre' },
    { value: 'diciembre', label: 'Diciembre' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Calculadora de Prestaciones Laborales</h1>
            <p className="mt-2 text-gray-600">Complete la información para generar el cálculo de prestaciones</p>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Employee Search/Selection */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Buscar Empleado</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="employeeSearch" className="block text-sm font-medium text-gray-700 mb-2">
                    Buscar por nombre, email o DNI
                  </label>
                  <input
                    type="text"
                    id="employeeSearch"
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    placeholder="Escriba para buscar..."
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white text-gray-900"
                  />
                </div>
                {employeeSearch && (
                  <div className="relative">
                    <select
                      id="employeeSelect"
                      value={selectedEmployeeId}
                      onChange={(e) => handleEmployeeSelect(e.target.value)}
                      disabled={loadingEmployeeData}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white text-gray-900"
                    >
                      <option value="">Seleccione un empleado...</option>
                      {filteredEmployees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name || emp.email} {emp.dni ? `(${emp.dni})` : ''}
                        </option>
                      ))}
                    </select>
                    {loadingEmployeeData && (
                      <div className="absolute right-3 top-2.5">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                      </div>
                    )}
                  </div>
                )}
                {filteredEmployees.length === 0 && employeeSearch && (
                  <p className="text-sm text-gray-500">No se encontraron empleados</p>
                )}
              </div>
            </div>

            {/* Employee Information */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Información del Empleado</h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="employeeName" className="block text-sm font-medium text-gray-700">
                    Nombre del Empleado <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="employeeName"
                    value={formData.employeeName}
                    onChange={(e) => setFormData(prev => ({ ...prev, employeeName: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="dni" className="block text-sm font-medium text-gray-700">
                    No. Identidad (DNI) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="dni"
                    value={formData.dni}
                    onChange={(e) => setFormData(prev => ({ ...prev, dni: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="terminationReason" className="block text-sm font-medium text-gray-700">
                    Motivo <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="terminationReason"
                    value={formData.terminationReason}
                    onChange={(e) => setFormData(prev => ({ ...prev, terminationReason: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white text-gray-900"
                    required
                  >
                    <option value="Renuncia">Renuncia</option>
                    <option value="Despido">Despido</option>
                    <option value="Término de contrato">Término de contrato</option>
                    <option value="Despido justificado">Despido justificado</option>
                    <option value="Renuncia inmediata">Renuncia inmediata</option>
                    <option value="Por Muerte Natural">Por Muerte Natural</option>
                    <option value="Por Muerte en Horas No Laborales">Por Muerte en Horas No Laborales</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                    Fecha de Ingreso <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    value={formData.startDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="terminationDate" className="block text-sm font-medium text-gray-700">
                    Fecha de Retiro <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="terminationDate"
                    value={formData.terminationDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, terminationDate: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="lastAnniversaryDate" className="block text-sm font-medium text-gray-700">
                    Último Aniversario
                  </label>
                  <input
                    type="date"
                    id="lastAnniversaryDate"
                    value={formData.lastAnniversaryDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastAnniversaryDate: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white text-gray-900"
                  />
                </div>
              </div>
            </div>

            {/* Vacation Information */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Información de Vacaciones</h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="vacationDaysRemaining" className="block text-sm font-medium text-gray-700">
                    Días de Vacaciones Restantes
                  </label>
                  <input
                    type="number"
                    id="vacationDaysRemaining"
                    value={formData.vacationDaysRemaining}
                    onChange={(e) => setFormData(prev => ({ ...prev, vacationDaysRemaining: parseFloat(e.target.value) || 0 }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white text-gray-900"
                    min="0"
                  />
                </div>
                <div>
                  <label htmlFor="vacationDaysEntitlement" className="block text-sm font-medium text-gray-700">
                    Días Totales de Vacaciones (según antigüedad)
                  </label>
                  <input
                    type="number"
                    id="vacationDaysEntitlement"
                    value={formData.vacationDaysEntitlement}
                    onChange={(e) => setFormData(prev => ({ ...prev, vacationDaysEntitlement: parseFloat(e.target.value) || 0 }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white text-gray-900"
                    min="0"
                  />
                </div>
              </div>
            </div>

            {/* Salary History */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">Historial de Salarios (Últimos 6 meses)</h2>
                <button
                  type="button"
                  onClick={addSalaryMonth}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
                >
                  Agregar Mes
                </button>
              </div>
              <div className="space-y-4">
                {formData.salaryHistory.map((salary, index) => (
                  <div key={index} className="grid grid-cols-1 gap-4 sm:grid-cols-5 border-b pb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Mes</label>
                      <select
                        value={salary.month}
                        onChange={(e) => updateSalaryHistory(index, 'month', e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white text-gray-900"
                      >
                        {months.map(m => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Año</label>
                      <input
                        type="number"
                        value={salary.year}
                        onChange={(e) => updateSalaryHistory(index, 'year', parseInt(e.target.value) || 0)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white text-gray-900"
                        min="2000"
                        max="2100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Salario (L.)</label>
                      <input
                        type="number"
                        value={salary.amount}
                        onChange={(e) => updateSalaryHistory(index, 'amount', parseFloat(e.target.value) || 0)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white text-gray-900"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Horas Extras (L.)</label>
                      <input
                        type="number"
                        value={salary.overtime || 0}
                        onChange={(e) => updateSalaryHistory(index, 'overtime', parseFloat(e.target.value) || 0)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white text-gray-900"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => removeSalaryMonth(index)}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
                {formData.salaryHistory.length === 0 && (
                  <p className="text-sm text-gray-500">No hay meses agregados. Haga clic en "Agregar Mes" para comenzar.</p>
                )}
              </div>
            </div>

            {/* Benefits Calculation */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Cálculo de Prestaciones</h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="preavisoDays" className="block text-sm font-medium text-gray-700">
                    Días de Preaviso <span className="text-xs text-gray-500">(Auto-calculado)</span>
                  </label>
                  <input
                    type="number"
                    id="preavisoDays"
                    value={formData.preavisoDays}
                    onChange={(e) => setFormData(prev => ({ ...prev, preavisoDays: parseFloat(e.target.value) || 0 }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white text-gray-900"
                    min="0"
                  />
                  <p className="mt-1 text-xs text-gray-500">Días desde hoy hasta la fecha de retiro</p>
                </div>
                <div>
                  <label htmlFor="cesantiaDays" className="block text-sm font-medium text-gray-700">
                    Días de Auxilio de Cesantía
                  </label>
                  <input
                    type="number"
                    id="cesantiaDays"
                    value={formData.cesantiaDays}
                    onChange={(e) => setFormData(prev => ({ ...prev, cesantiaDays: parseFloat(e.target.value) || 0 }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white text-gray-900"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label htmlFor="cesantiaProportionalDays" className="block text-sm font-medium text-gray-700">
                    Días de Auxilio de Cesantía Proporcional
                  </label>
                  <input
                    type="number"
                    id="cesantiaProportionalDays"
                    value={formData.cesantiaProportionalDays}
                    onChange={(e) => setFormData(prev => ({ ...prev, cesantiaProportionalDays: parseFloat(e.target.value) || 0 }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white text-gray-900"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label htmlFor="vacationBonusDays" className="block text-sm font-medium text-gray-700">
                    Días de Bono por Vacaciones
                  </label>
                  <input
                    type="number"
                    id="vacationBonusDays"
                    value={formData.vacationBonusDays}
                    onChange={(e) => setFormData(prev => ({ ...prev, vacationBonusDays: parseFloat(e.target.value) || 0 }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white text-gray-900"
                    min="0"
                  />
                </div>
                <div>
                  <label htmlFor="vacationProportionalDays" className="block text-sm font-medium text-gray-700">
                    Días de Vacaciones Proporcionales <span className="text-xs text-gray-500">(Auto-calculado)</span>
                  </label>
                  <input
                    type="number"
                    id="vacationProportionalDays"
                    value={formData.vacationProportionalDays}
                    onChange={(e) => setFormData(prev => ({ ...prev, vacationProportionalDays: parseFloat(e.target.value) || 0 }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white text-gray-900"
                    min="0"
                    step="0.01"
                  />
                  <p className="mt-1 text-xs text-gray-500">Días de vacaciones restantes / 12</p>
                </div>
                <div>
                  <label htmlFor="thirteenthMonthDays" className="block text-sm font-medium text-gray-700">
                    Días de Décimo Tercer Mes <span className="text-xs text-gray-500">(Auto-calculado)</span>
                  </label>
                  <input
                    type="number"
                    id="thirteenthMonthDays"
                    value={formData.thirteenthMonthDays}
                    onChange={(e) => setFormData(prev => ({ ...prev, thirteenthMonthDays: parseFloat(e.target.value) || 0 }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white text-gray-900"
                    min="0"
                    step="0.01"
                  />
                  <p className="mt-1 text-xs text-gray-500">Días desde fecha inicio hasta retiro (30 días por mes)</p>
                </div>
                <div>
                  <label htmlFor="thirteenthMonthStartDate" className="block text-sm font-medium text-gray-700">
                    Fecha Inicio Décimo Tercer Mes <span className="text-xs text-gray-500">(Auto-calculado)</span>
                  </label>
                  <input
                    type="date"
                    id="thirteenthMonthStartDate"
                    value={formData.thirteenthMonthStartDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, thirteenthMonthStartDate: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white text-gray-900"
                  />
                  <p className="mt-1 text-xs text-gray-500">Último 1 de julio antes de la fecha de retiro</p>
                </div>
                <div>
                  <label htmlFor="fourteenthMonthDays" className="block text-sm font-medium text-gray-700">
                    Días de Décimo Cuarto Mes <span className="text-xs text-gray-500">(Auto-calculado)</span>
                  </label>
                  <input
                    type="number"
                    id="fourteenthMonthDays"
                    value={formData.fourteenthMonthDays}
                    onChange={(e) => setFormData(prev => ({ ...prev, fourteenthMonthDays: parseFloat(e.target.value) || 0 }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white text-gray-900"
                    min="0"
                    step="0.01"
                  />
                  <p className="mt-1 text-xs text-gray-500">Días desde fecha inicio hasta retiro (30 días por mes)</p>
                </div>
                <div>
                  <label htmlFor="fourteenthMonthStartDate" className="block text-sm font-medium text-gray-700">
                    Fecha Inicio Décimo Cuarto Mes <span className="text-xs text-gray-500">(Auto-calculado)</span>
                  </label>
                  <input
                    type="date"
                    id="fourteenthMonthStartDate"
                    value={formData.fourteenthMonthStartDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, fourteenthMonthStartDate: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white text-gray-900"
                  />
                  <p className="mt-1 text-xs text-gray-500">1 de enero del año de la fecha de retiro</p>
                </div>
              </div>
            </div>

            {/* Additional Payments */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Pagos Adicionales</h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="salariesDue" className="block text-sm font-medium text-gray-700">
                    Salarios Adeudados (L.)
                  </label>
                  <input
                    type="number"
                    id="salariesDue"
                    value={formData.salariesDue}
                    onChange={(e) => setFormData(prev => ({ ...prev, salariesDue: parseFloat(e.target.value) || 0 }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white text-gray-900"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label htmlFor="overtimeDue" className="block text-sm font-medium text-gray-700">
                    Pago HE Pendiente (L.)
                  </label>
                  <input
                    type="number"
                    id="overtimeDue"
                    value={formData.overtimeDue}
                    onChange={(e) => setFormData(prev => ({ ...prev, overtimeDue: parseFloat(e.target.value) || 0 }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white text-gray-900"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label htmlFor="otherPayments" className="block text-sm font-medium text-gray-700">
                    Otros Pagos (L.)
                  </label>
                  <input
                    type="number"
                    id="otherPayments"
                    value={formData.otherPayments}
                    onChange={(e) => setFormData(prev => ({ ...prev, otherPayments: parseFloat(e.target.value) || 0 }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white text-gray-900"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label htmlFor="seventhDayPayment" className="block text-sm font-medium text-gray-700">
                    Pago Séptimo Día (L.)
                  </label>
                  <input
                    type="number"
                    id="seventhDayPayment"
                    value={formData.seventhDayPayment}
                    onChange={(e) => setFormData(prev => ({ ...prev, seventhDayPayment: parseFloat(e.target.value) || 0 }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white text-gray-900"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label htmlFor="wageAdjustment" className="block text-sm font-medium text-gray-700">
                    Reajuste Salarial (L.)
                  </label>
                  <input
                    type="number"
                    id="wageAdjustment"
                    value={formData.wageAdjustment}
                    onChange={(e) => setFormData(prev => ({ ...prev, wageAdjustment: parseFloat(e.target.value) || 0 }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white text-gray-900"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label htmlFor="educationalBonus" className="block text-sm font-medium text-gray-700">
                    Bono Educativo (L.)
                  </label>
                  <input
                    type="number"
                    id="educationalBonus"
                    value={formData.educationalBonus}
                    onChange={(e) => setFormData(prev => ({ ...prev, educationalBonus: parseFloat(e.target.value) || 0 }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white text-gray-900"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Deducciones</h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="municipalTax" className="block text-sm font-medium text-gray-700">
                    Impuesto Vecinal (L.)
                  </label>
                  <input
                    type="number"
                    id="municipalTax"
                    value={formData.municipalTax}
                    onChange={(e) => setFormData(prev => ({ ...prev, municipalTax: parseFloat(e.target.value) || 0 }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white text-gray-900"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label htmlFor="preavisoPenalty" className="block text-sm font-medium text-gray-700">
                    Penalización por Preaviso (L.)
                  </label>
                  <input
                    type="number"
                    id="preavisoPenalty"
                    value={formData.preavisoPenalty}
                    onChange={(e) => setFormData(prev => ({ ...prev, preavisoPenalty: parseFloat(e.target.value) || 0 }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white text-gray-900"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={generatingPDF}
                className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generatingPDF ? 'Generando PDF...' : 'Generar PDF'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

