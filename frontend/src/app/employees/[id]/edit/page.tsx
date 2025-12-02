'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Role, getAssignableRoles, getRoleDisplayName, canEditUser } from '@/lib/roles';
import { canAccessContracts } from '@/lib/contractAccess';
import { parsePhoneWithAreaCode, maskPhoneNumber, combinePhoneWithAreaCode, unmask, maskDNI, maskRTN } from '@/lib/inputMasks';
import DocumentManagement from '@/components/DocumentManagement';

interface Employee {
  id: string;
  name: string | null;
  email: string;
  dni: string | null;
  rtn: string | null;
  phoneNumber: string | null;
  address: string | null;
  startDate: Date | null;
  position: string | null;
  role: string;
  reportsToId: string | null;
  reportsTo: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

export default function EditEmployeePage() {
  const router = useRouter();
  const params = useParams();
  const employeeId = params?.id as string;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    dni: '',
    rtn: '',
    phoneAreaCode: '+504',
    phoneNumber: '',
    address: '',
    startDate: '',
    position: '',
    role: Role.employee,
    reportsToId: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [assignableRoles, setAssignableRoles] = useState<Role[]>([]);
  const [currentEmployeeRole, setCurrentEmployeeRole] = useState<Role | null>(null);
  const [hasEditPermission, setHasEditPermission] = useState(false);
  const [availableManagers, setAvailableManagers] = useState<Employee[]>([]);
  const [showSeveranceModal, setShowSeveranceModal] = useState(false);
  const [generatingSeverance, setGeneratingSeverance] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [severanceError, setSeveranceError] = useState('');
  const [terminationDate, setTerminationDate] = useState('');
  const [terminationReason, setTerminationReason] = useState('Renuncia');

  const fetchAvailableManagers = async () => {
    try {
      const response = await fetch('/api/employees?limit=1000');
      if (response.ok) {
        const data = await response.json();
        // API returns { employees: [...], pagination: {...} }
        const allEmployees = data.employees || [];
        // Filter out the current employee (can't report to themselves)
        const managers = allEmployees.filter((e: Employee) => e.id !== employeeId);
        setAvailableManagers(managers);
      }
    } catch (err) {
      console.error('Error fetching managers:', err);
    }
  };

  useEffect(() => {
    // Get current user's role and email from localStorage
    if (typeof window !== 'undefined') {
      const currentUserRole = localStorage.getItem('userRole');
      const currentUserEmail = localStorage.getItem('userEmail');
      setUserRole(currentUserRole);
      setUserEmail(currentUserEmail);
    }
    
    if (employeeId) {
      fetchEmployee();
    }
  }, [employeeId]);

  const fetchEmployee = async () => {
    try {
      if (!employeeId) {
        setError('ID de empleado no válido');
        setLoading(false);
        return;
      }

      // Get current user info for permission check
      const currentUserEmail = typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null;
      const currentUserRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;

      // Fetch employee with headers for permission check
      const headers: HeadersInit = {};
      if (currentUserEmail) headers['x-user-email'] = currentUserEmail;
      if (currentUserRole) headers['x-user-role'] = currentUserRole;

      const response = await fetch(`/api/employees/${employeeId}`, { headers });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Error al cargar la información del empleado';
        setError(errorMessage);
        
        // If permission denied, redirect after a moment
        if (response.status === 403) {
          setTimeout(() => {
            router.push('/employees');
          }, 2000);
        }
        
        setLoading(false);
        return;
      }

      const employee: Employee = await response.json();
      const employeeRole = (employee.role as Role) || Role.employee;
      setCurrentEmployeeRole(employeeRole);
      
      // Get current user's ID by fetching all employees and finding by email
      if (currentUserEmail) {
        try {
          const userResponse = await fetch('/api/employees?limit=1000');
          if (userResponse.ok) {
            const userData = await userResponse.json();
            // API returns { employees: [...], pagination: {...} }
            const allUsers = userData.employees || [];
            const currentUser = allUsers.find((u: Employee) => u.email === currentUserEmail);
            if (currentUser) {
              setUserId(currentUser.id);
              // Check if current user can edit this employee
              if (currentUserRole) {
                const canEdit = canEditUser(currentUserRole, currentUser.id, employeeRole, employeeId);
                setHasEditPermission(canEdit);
                
                if (!canEdit) {
                  setError('No tienes permiso para editar este empleado');
                  setTimeout(() => {
                    router.push('/employees');
                  }, 2000);
                  setLoading(false);
                  return;
                }
              }
            }
          }
        } catch (err) {
          console.error('Error fetching current user:', err);
        }
      }
      
      // Parse phone number to extract area code and phone number
      const parsedPhone = parsePhoneWithAreaCode(employee.phoneNumber);
      
      setFormData({
        name: employee.name || '',
        email: employee.email || '',
        dni: maskDNI(employee.dni || ''),  // Apply mask when loading
        rtn: maskRTN(employee.rtn || ''),  // Apply mask when loading
        phoneAreaCode: parsedPhone.areaCode || '+504',
        phoneNumber: maskPhoneNumber(parsedPhone.phoneNumber || ''),  // Apply mask when loading
        address: employee.address || '',
        startDate: employee.startDate 
          ? new Date(employee.startDate).toISOString().split('T')[0]
          : '',
        position: employee.position || '',
        role: employeeRole,
        reportsToId: employee.reportsToId || '',
      });
      
      // Fetch available managers (only if Admin or HR_Staff)
      if (currentUserRole === 'Admin' || currentUserRole === 'HR_Staff') {
        fetchAvailableManagers();
      }
      
      // Update assignable roles to include current employee role if not already included
      if (currentUserRole) {
        const assignable = getAssignableRoles(currentUserRole);
        // Include current employee role in the list so it can be displayed
        const rolesToShow = [...new Set([...assignable, employeeRole])];
        setAssignableRoles(rolesToShow);
      }
    } catch (err) {
      console.error('Error fetching employee:', err);
      setError('Error al cargar la información del empleado. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      if (!employeeId) {
        setError('ID de empleado no válido');
        setSaving(false);
        return;
      }

      const creatorEmail = typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null;
      const creatorRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (creatorEmail) {
        headers['x-user-email'] = creatorEmail;
      }
      if (creatorRole) {
        headers['x-user-role'] = creatorRole;
      }
      
      // Combine area code and phone number for storage
      const fullPhoneNumber = combinePhoneWithAreaCode(
        formData.phoneAreaCode || '+504',
        formData.phoneNumber
      );
      
      // Prepare form data, excluding phoneAreaCode (it's combined into phoneNumber)
      const { phoneAreaCode, ...formDataToSend } = formData;
      
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          ...formDataToSend,
          phoneNumber: fullPhoneNumber,
          dni: unmask(formData.dni),  // Remove mask before saving (store raw digits)
          rtn: unmask(formData.rtn),  // Remove mask before saving (store raw digits)
          startDate: formData.startDate || null,
          reportsToId: formData.reportsToId || null,
          creatorEmail: creatorEmail,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Success - redirect to employees list
        router.push('/employees');
        router.refresh(); // Refresh to show updated data
      } else {
        setError(data.error || 'Error al actualizar el empleado');
      }
    } catch (err) {
      console.error('Error updating employee:', err);
      setError('Ocurrió un error al actualizar. Por favor intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Apply masks when typing
    if (name === 'phoneNumber') {
      const masked = maskPhoneNumber(value);
      setFormData({
        ...formData,
        [name]: masked,
      });
    } else if (name === 'dni') {
      const masked = maskDNI(value);
      setFormData({
        ...formData,
        [name]: masked,
      });
    } else if (name === 'rtn') {
      const masked = maskRTN(value);
      setFormData({
        ...formData,
        [name]: masked,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando información del empleado...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Editar Empleado</h1>
              <p className="mt-1 text-sm text-gray-600">
                Modifica la información del empleado
              </p>
            </div>
            {canAccessContracts(userRole) && employeeId && (
              <Link
                href={`/contracts/new?userId=${employeeId}`}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                + Crear Contrato
              </Link>
            )}
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nombre completo *
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Juan Pérez"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Correo electrónico *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="ejemplo@gmail.com"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="dni" className="block text-sm font-medium text-gray-700">
                    DNI (Documento Nacional de Identidad) *
                  </label>
                  <input
                    id="dni"
                    name="dni"
                    type="text"
                    required
                    value={formData.dni}
                    onChange={handleChange}
                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="0801-1990-12345"
                  />
                </div>

                <div>
                  <label htmlFor="rtn" className="block text-sm font-medium text-gray-700">
                    RTN (Registro Tributario Nacional) *
                  </label>
                  <input
                    id="rtn"
                    name="rtn"
                    type="text"
                    required
                    value={formData.rtn}
                    onChange={handleChange}
                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="08011990123456"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                  Número de teléfono *
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <select
                    id="phoneAreaCode"
                    name="phoneAreaCode"
                    value={formData.phoneAreaCode}
                    onChange={handleChange}
                    className="inline-flex items-center px-3 py-2 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-700 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="+504">+504 (Honduras)</option>
                    <option value="+1">+1 (USA/Canada)</option>
                    <option value="+52">+52 (México)</option>
                    <option value="+506">+506 (Costa Rica)</option>
                    <option value="+507">+507 (Panamá)</option>
                    <option value="+502">+502 (Guatemala)</option>
                    <option value="+503">+503 (El Salvador)</option>
                    <option value="+505">+505 (Nicaragua)</option>
                  </select>
                  <input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    required
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    maxLength={9} // XXXX-XXXX = 9 characters
                    className="flex-1 appearance-none relative block w-full px-3 py-2 rounded-r-md border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="9876-5432"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Formato: {formData.phoneAreaCode || '+504'} 9876-5432
                </p>
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                  Dirección de domicilio *
                </label>
                <textarea
                  id="address"
                  name="address"
                  required
                  value={formData.address}
                  onChange={handleChange}
                  rows={3}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Colonia, Calle, Número de casa, Ciudad"
                />
              </div>

              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                  Fecha de inicio en la empresa *
                </label>
                <input
                  id="startDate"
                  name="startDate"
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={handleChange}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="position" className="block text-sm font-medium text-gray-700">
                  Cargo/Puesto *
                </label>
                <input
                  id="position"
                  name="position"
                  type="text"
                  required
                  value={formData.position}
                  onChange={handleChange}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Ej: Gerente de Recursos Humanos, Desarrollador, Contador"
                />
              </div>

              {assignableRoles.length > 0 && (
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                    Rol/Cargo *
                  </label>
                  <select
                    id="role"
                    name="role"
                    required
                    value={formData.role}
                    onChange={handleChange}
                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm bg-white"
                  >
                    {assignableRoles.map((r) => (
                      <option key={r} value={r}>
                        {getRoleDisplayName(r)}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    
                  </p>
                </div>
              )}

              {/* Manager/Reports To field - only visible to Admin and HR_Staff */}
              {(userRole === 'Admin' || userRole === 'HR_Staff') && (
                <div>
                  <label htmlFor="reportsToId" className="block text-sm font-medium text-gray-700">
                    Reporta a (Manager)
                  </label>
                  <select
                    id="reportsToId"
                    name="reportsToId"
                    value={formData.reportsToId}
                    onChange={handleChange}
                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm bg-white"
                  >
                    <option value="">Ninguno (Sin manager)</option>
                    {availableManagers.map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {manager.name || manager.email} ({getRoleDisplayName(manager.role)})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Selecciona el usuario al que reporta este empleado
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Link
                href="/employees"
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>

          {/* Severance Generation Section - Only for Admin and HR_Staff */}
          {(userRole === 'Admin' || userRole === 'HR_Staff') && (
            <div className="mt-8 bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">Prestaciones Laborales</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Genera el documento de cálculo de prestaciones al terminar la relación laboral
                  </p>
                </div>
                <button
                  onClick={() => setShowSeveranceModal(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={generatingSeverance}
                >
                  {generatingSeverance ? 'Generando...' : 'Generar Prestaciones'}
                </button>
              </div>
            </div>
          )}

          {/* Severance Modal */}
          {showSeveranceModal && (
            <div
              className="fixed inset-0 z-50 overflow-y-auto"
              aria-labelledby="modal-title"
              role="dialog"
              aria-modal="true"
            >
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-40"
                onClick={() => {
                  if (!generatingSeverance) {
                    setShowSeveranceModal(false);
                  }
                }}
              ></div>

              {/* Modal Content */}
              <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0 relative z-50 pointer-events-none">
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                  &#8203;
                </span>

                <div
                  className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative pointer-events-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="sm:flex sm:items-start">
                      <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                        <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                          Generar Cálculo de Prestaciones
                        </h3>
                        <div className="mt-4 space-y-4">
                          <div>
                            <label htmlFor="terminationDate" className="block text-sm font-medium text-gray-700">
                              Fecha de Terminación <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="date"
                              id="terminationDate"
                              value={terminationDate}
                              onChange={(e) => setTerminationDate(e.target.value)}
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white text-gray-900"
                              disabled={generatingSeverance}
                            />
                          </div>
                          <div>
                            <label htmlFor="terminationReason" className="block text-sm font-medium text-gray-700">
                              Motivo de Terminación <span className="text-red-500">*</span>
                            </label>
                            <select
                              id="terminationReason"
                              value={terminationReason}
                              onChange={(e) => setTerminationReason(e.target.value)}
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white text-gray-900"
                              disabled={generatingSeverance}
                            >
                              <option value="Renuncia">Renuncia</option>
                              <option value="Despido">Despido</option>
                              <option value="Término de contrato">Término de contrato</option>
                              <option value="Despido justificado">Despido justificado</option>
                              <option value="Otro">Otro</option>
                            </select>
                          </div>
                          {severanceError && (
                            <div className="rounded-md bg-red-50 p-4">
                              <div className="text-sm text-red-800">{severanceError}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!terminationDate) {
                          setSeveranceError('La fecha de terminación es requerida');
                          return;
                        }

                        setGeneratingSeverance(true);
                        setSeveranceError('');

                        try {
                          const userEmail = localStorage.getItem('userEmail') || '';
                          const userRole = localStorage.getItem('userRole') || '';

                          const response = await fetch(`/api/employees/${employeeId}/severance`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'x-user-email': userEmail,
                              'x-user-role': userRole,
                            },
                            body: JSON.stringify({
                              terminationDate,
                              terminationReason,
                            }),
                          });

                          if (response.ok) {
                            // Check if response is actually an Excel file
                            const contentType = response.headers.get('content-type');
                            if (!contentType || !contentType.includes('spreadsheet')) {
                              // Not an Excel file - might be an error JSON
                              const errorText = await response.text();
                              let errorData;
                              try {
                                errorData = JSON.parse(errorText);
                              } catch (e) {
                                setSeveranceError(`Error inesperado: ${errorText}`);
                                return;
                              }
                              setSeveranceError(errorData.error || errorData.message || 'Error al generar el documento');
                              return;
                            }
                            
                            // Download the Excel file
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            
                            // Get filename from Content-Disposition header or use default
                            const contentDisposition = response.headers.get('content-disposition');
                            let fileName = `prestaciones_${employeeId}_${terminationDate}.xlsx`;
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

                            // Close modal
                            setShowSeveranceModal(false);
                            setTerminationDate('');
                            setTerminationReason('Renuncia');
                          } else {
                            // Handle error response - read as text first
                            const responseText = await response.text();
                            console.error('Error response status:', response.status);
                            console.error('Error response text:', responseText);
                            
                            let errorMessage = 'Error al generar el documento de prestaciones';
                            
                            if (responseText && responseText.trim() !== '') {
                              try {
                                const errorData = JSON.parse(responseText);
                                errorMessage = errorData.error || errorData.message || errorMessage;
                                if (errorData.details) {
                                  errorMessage += `: ${errorData.details}`;
                                }
                                console.error('Parsed error data:', errorData);
                              } catch (jsonError) {
                                // If it's not JSON, use the text as error message
                                console.error('Failed to parse JSON error:', jsonError);
                                errorMessage = responseText.length > 200 
                                  ? `${errorMessage}: ${responseText.substring(0, 200)}...`
                                  : `${errorMessage}: ${responseText}`;
                              }
                            } else {
                              errorMessage = `${errorMessage} (Status: ${response.status})`;
                            }
                            
                            setSeveranceError(errorMessage);
                          }
                        } catch (err: any) {
                          console.error('Error generating severance:', err);
                          setSeveranceError(err.message || 'Error al generar el documento de prestaciones. Por favor revisa la consola para más detalles.');
                        } finally {
                          setGeneratingSeverance(false);
                        }
                      }}
                      disabled={generatingSeverance || !terminationDate}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generatingSeverance ? 'Generando...' : 'Generar Excel'}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!terminationDate) {
                          setSeveranceError('La fecha de terminación es requerida');
                          return;
                        }
                        
                        setGeneratingPDF(true);
                        setSeveranceError('');
                        
                        try {
                          const response = await fetch(`/api/employees/${employeeId}/severance-pdf`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'x-user-email': userEmail || '',
                              'x-user-role': userRole || '',
                            },
                            body: JSON.stringify({
                              terminationDate,
                              terminationReason,
                            }),
                          });
                          
                          if (response.ok) {
                            const contentType = response.headers.get('content-type');
                            if (!contentType || !contentType.includes('pdf')) {
                              const errorText = await response.text();
                              let errorData;
                              try {
                                errorData = JSON.parse(errorText);
                              } catch (e) {
                                setSeveranceError(`Error inesperado: ${errorText}`);
                                return;
                              }
                              setSeveranceError(errorData.error || errorData.message || 'Error al generar el PDF');
                              return;
                            }
                            
                            // Download the PDF file
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            
                            // Get filename from Content-Disposition header or use default
                            const contentDisposition = response.headers.get('content-disposition');
                            let fileName = `prestaciones_${employeeId}_${terminationDate}.pdf`;
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
                            } else {
                              errorMessage = `${errorMessage} (Status: ${response.status})`;
                            }
                            
                            setSeveranceError(errorMessage);
                          }
                        } catch (err: any) {
                          console.error('Error generating PDF:', err);
                          setSeveranceError(err.message || 'Error al generar el PDF de prestaciones.');
                        } finally {
                          setGeneratingPDF(false);
                        }
                      }}
                      disabled={generatingPDF || generatingSeverance || !terminationDate}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generatingPDF ? 'Generando PDF...' : 'Descargar PDF'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSeveranceModal(false);
                        setTerminationDate('');
                        setTerminationReason('Renuncia');
                        setSeveranceError('');
                      }}
                      disabled={generatingSeverance || generatingPDF}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Document Management Section */}
          <div className="mt-8 bg-white shadow rounded-lg p-6">
            <DocumentManagement
              userId={employeeId}
              userRole={userRole}
              isEditable={hasEditPermission}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

