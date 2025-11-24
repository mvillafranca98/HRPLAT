'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Role, getAssignableRoles, getRoleDisplayName } from '@/lib/roles';

interface EmployeeFormData {
  email: string;
  password: string;
  name: string;
  dni: string;
  rtn: string;
  phoneNumber: string;
  address: string;
  startDate: string;
  position: string;
  role: Role;
}

export default function BulkAddEmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<EmployeeFormData[]>([
    {
      email: '',
      password: '',
      name: '',
      dni: '',
      rtn: '',
      phoneNumber: '',
      address: '',
      startDate: '',
      position: '',
      role: Role.employee,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [uploadMode, setUploadMode] = useState<'manual' | 'csv'>('manual');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [result, setResult] = useState<{
    successful: number;
    failed: number;
    errors?: Array<{ index: number; error: string }>;
  } | null>(null);
  const [assignableRoles, setAssignableRoles] = useState<Role[]>([Role.employee]);

  useEffect(() => {
    // Get current user's role and determine assignable roles
    const currentUserRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;
    const assignable = getAssignableRoles(currentUserRole);
    setAssignableRoles(assignable);
  }, []);

  const addEmployeeRow = () => {
    setEmployees([
      ...employees,
      {
        email: '',
        password: '',
        name: '',
        dni: '',
        rtn: '',
        phoneNumber: '',
        address: '',
        startDate: '',
        position: '',
        role: Role.employee,
      },
    ]);
  };

  const removeEmployeeRow = (index: number) => {
    if (employees.length > 1) {
      setEmployees(employees.filter((_, i) => i !== index));
    }
  };

  const updateEmployee = (index: number, field: keyof EmployeeFormData, value: string | Role) => {
    const updated = [...employees];
    updated[index] = { ...updated[index], [field]: value };
    setEmployees(updated);
  };

  const parseCSV = (text: string): EmployeeFormData[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const requiredHeaders = ['email', 'name', 'dni', 'rtn', 'phonenumber', 'address', 'startdate', 'position'];
    
    // Check if all required headers are present
    const missingHeaders = requiredHeaders.filter(h => 
      !headers.some(header => header.includes(h) || h.includes(header))
    );

    if (missingHeaders.length > 0) {
      throw new Error(`Missing required columns: ${missingHeaders.join(', ')}. Required columns: ${requiredHeaders.join(', ')}, role (optional), password (optional)`);
    }

    const parsed: EmployeeFormData[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const employee: Partial<EmployeeFormData> = {};

      headers.forEach((header, idx) => {
        const value = values[idx] || '';
        if (header.includes('email')) employee.email = value;
        else if (header.includes('name')) employee.name = value;
        else if (header.includes('dni')) employee.dni = value;
        else if (header.includes('rtn')) employee.rtn = value;
        else if (header.includes('phone') || header.includes('telefono')) employee.phoneNumber = value;
        else if (header.includes('address') || header.includes('direccion')) employee.address = value;
        else if (header.includes('start') || header.includes('fecha')) employee.startDate = value;
        else if (header.includes('position') || header.includes('cargo') || header.includes('puesto')) {
          // Skip if it's role, handle separately
          if (!header.includes('rol')) employee.position = value;
        }
        else if (header.includes('role') || header.includes('rol')) {
          // Validate role
          const validRoles = Object.values(Role);
          if (validRoles.includes(value as Role)) {
            employee.role = value as Role;
          } else {
            employee.role = Role.employee; // Default to employee if invalid
          }
        }
        else if (header.includes('password') || header.includes('contraseña')) employee.password = value;
      });

      // Validate required fields
      if (!employee.email) {
        throw new Error(`Row ${i + 1}: Email is required`);
      }

      parsed.push({
        email: employee.email || '',
        password: employee.password || '',
        name: employee.name || '',
        dni: employee.dni || '',
        rtn: employee.rtn || '',
        phoneNumber: employee.phoneNumber || '',
        address: employee.address || '',
        startDate: employee.startDate || '',
        position: employee.position || '',
        role: (employee.role as Role) || Role.employee,
      });
    }

    return parsed;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    setCsvFile(file);
    setError('');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = parseCSV(text);
        setEmployees(parsed);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (err: any) {
        setError(err.message || 'Error parsing CSV file');
        setCsvFile(null);
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setResult(null);
    setLoading(true);

    // Filter out empty rows
    const validEmployees = employees.filter(
      emp => emp.email.trim() !== ''
    );

    if (validEmployees.length === 0) {
      setError('Please add at least one employee');
      setLoading(false);
      return;
    }

    try {
      const creatorEmail = typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null;
      
      const response = await fetch('/api/employees/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          employees: validEmployees,
          creatorEmail: creatorEmail,
        }),
      });

      const data = await response.json();

      if (response.ok || response.status === 201) {
        setResult({
          successful: data.summary?.successful || 0,
          failed: data.summary?.failed || 0,
          errors: data.errors || [],
        });
        setSuccess(true);
        
        // Redirect after 3 seconds if all successful
        if (data.summary?.failed === 0) {
          setTimeout(() => {
            router.push('/employees?bulkSuccess=true');
          }, 3000);
        }
      } else {
        setError(data.message || data.error || 'Error al crear empleados');
        if (data.errors) {
          setResult({
            successful: data.summary?.successful || 0,
            failed: data.summary?.failed || 0,
            errors: data.errors,
          });
        }
      }
    } catch (err) {
      setError('Ocurrió un error. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const template = `email,name,dni,rtn,phonenumber,address,startdate,position,role,password
juan.perez@example.com,Juan Pérez,0801-1990-12345,08011990123456,504 9999-9999,Colonia Las Flores,2024-01-15,Gerente de Recursos Humanos,employee, *******
maria.garcia@example.com,Maria García,0801-1992-54321,08011992543210,504 8888-8888,Barrio El Centro,2024-02-01,Desarrollador,employee, *******`; // la contraseña se auto-genera si no se proporciona. Roles: Admin, HR_Staff, Management, employee

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk_employees_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Agregar Empleados en Masa</h1>
              <p className="mt-1 text-sm text-gray-600">
                Agrega múltiples empleados a la vez mediante CSV o formulario manual
              </p>
            </div>
            <Link
              href="/employees"
              className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
            >
              ← Volver a Empleados
            </Link>
          </div>

          {/* Mode Toggle */}
          <div className="mb-6 bg-white shadow rounded-lg p-4">
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => {
                  setUploadMode('manual');
                  setCsvFile(null);
                  setError('');
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  uploadMode === 'manual'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Entrada Manual
              </button>
              <button
                type="button"
                onClick={() => {
                  setUploadMode('csv');
                  setError('');
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  uploadMode === 'csv'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Cargar CSV
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {success && result && (
            <div className={`mb-4 px-4 py-3 rounded ${
              result.failed === 0
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-yellow-50 border border-yellow-200 text-yellow-700'
            }`}>
              <p className="font-medium">
                {result.successful} empleado(s) creado(s) exitosamente
                {result.failed > 0 && `, ${result.failed} fallido(s)`}
              </p>
              {result.errors && result.errors.length > 0 && (
                <ul className="mt-2 list-disc list-inside text-sm">
                  {result.errors.slice(0, 5).map((err, idx) => (
                    <li key={idx}>
                      Fila {err.index + 1}: {err.error}
                    </li>
                  ))}
                  {result.errors.length > 5 && (
                    <li>... y {result.errors.length - 5} error(es) más</li>
                  )}
                </ul>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
            {uploadMode === 'csv' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cargar archivo CSV
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                    <button
                      type="button"
                      onClick={downloadTemplate}
                      className="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-500"
                    >
                      Descargar Plantilla
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    El CSV debe incluir las columnas: email, name, dni, rtn, phonenumber, address, startdate, position, password (opcional)
                  </p>
                </div>

                {csvFile && employees.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 mb-2">
                      {employees.length} empleado(s) cargado(s) desde CSV
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-medium text-gray-900">
                    Agregar Empleados Manualmente
                  </h2>
                  <button
                    type="button"
                    onClick={addEmployeeRow}
                    className="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    + Agregar Fila
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email *
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nombre
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          DNI
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          RTN
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Teléfono
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Dirección
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha Inicio
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cargo/Puesto
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rol
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contraseña
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acción
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {employees.map((employee, index) => (
                        <tr key={index}>
                          <td className="px-2 py-2">
                            <input
                              type="email"
                              required
                              value={employee.email}
                              onChange={(e) => updateEmployee(index, 'email', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="email@example.com"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={employee.name}
                              onChange={(e) => updateEmployee(index, 'name', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="Nombre completo"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={employee.dni}
                              onChange={(e) => updateEmployee(index, 'dni', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="0801-1990-12345"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={employee.rtn}
                              onChange={(e) => updateEmployee(index, 'rtn', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="08011990123456"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="tel"
                              value={employee.phoneNumber}
                              onChange={(e) => updateEmployee(index, 'phoneNumber', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="+504 9999-9999"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={employee.address}
                              onChange={(e) => updateEmployee(index, 'address', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="Dirección"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="date"
                              value={employee.startDate}
                              onChange={(e) => updateEmployee(index, 'startDate', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={employee.position}
                              onChange={(e) => updateEmployee(index, 'position', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="Cargo/Puesto"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <select
                              value={employee.role}
                              onChange={(e) => updateEmployee(index, 'role', e.target.value as Role)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                            >
                              {assignableRoles.map((r) => (
                                <option key={r} value={r}>
                                  {getRoleDisplayName(r)}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="password"
                              value={employee.password}
                              onChange={(e) => updateEmployee(index, 'password', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="Opcional"
                            />
                            <p className="text-xs text-gray-400 mt-1">Auto-generado si vacío</p>
                          </td>
                          <td className="px-2 py-2">
                            {employees.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeEmployeeRow(index)}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                Eliminar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end space-x-4">
              <Link
                href="/employees"
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={loading || employees.length === 0}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creando empleados...' : `Crear ${employees.filter(e => e.email).length} Empleado(s)`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

